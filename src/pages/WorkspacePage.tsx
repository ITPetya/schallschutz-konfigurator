import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Scene } from "../components/Scene";
import { ProjectScene3D } from "../components/ProjectScene3D";
import { OpeningsPanel } from "../components/OpeningsPanel";
import { AddOpeningPopup } from "../components/AddOpeningPopup";
import { ContainerSizeControls } from "../components/ContainerSizeControls";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { SoundClassControls } from "../components/SoundClassControls";
import { ContainerWarningBadge } from "../components/ContainerWarningBadge";
import {
  DEFAULT_FLOOR_THICKNESS,
  DEFAULT_SOUND_CLASS,
  bumpedFloorThickness,
  bumpedWallThickness,
  defaultFloorInsulated,
} from "../constants/lcStandard";
import { getContainerWarnings, type WarningCategory } from "../utils/containerWarnings";
import { RequestPreviewModal } from "../components/RequestPreviewModal";
import { AccordionSection } from "../components/AccordionSection";
import { AnimatedButton } from "../components/AnimatedButton";
import { LoadingIcon } from "../components/LoadingIcon";
import { ThreeOptionConfirmDialog } from "../components/ThreeOptionConfirmDialog";
import { GrundeinstellungenOverlay, type GrundeinstellungenResult } from "../components/GrundeinstellungenOverlay";
import type { Opening } from "../types/openings";
import type { ContainerConfig } from "../config/types";
import { CONFIG_FILE_EXTENSION, decodeConfig, downloadBlob, encodeConfig, sanitizeFileName } from "../config/configFileCodec";
import { REQUEST_EMAIL } from "../config/requestEmail";
import { defaultConfig } from "../config/defaultContainerConfig";
import type { ContainerInstance, ProjectConfig } from "../config/projectTypes";
import {
  hasMeaningfulProjectDraft,
  loadProjectDraft,
  saveProjectDraft,
  startNewProjectDraft,
  getActiveHistoryId,
  setActiveHistoryId,
} from "../config/projectHistoryStore";
import { PROJECT_FILE_EXTENSION, decodeProject, encodeProject } from "../config/projectFileCodec";
import { rectsOverlap, type OrientedRect } from "../utils/collision";
import { useTour } from "../tour/TourContext";
import { PlusIcon } from "../components/icons/PlusIcon";
import { TrashIcon } from "../components/icons/TrashIcon";
import { RotateCcwIcon } from "../components/icons/RotateCcwIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { SendIcon } from "../components/icons/SendIcon";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
} from "../components/primitives/Sidebar";

// Mindestabstand zwischen zwei Container-Grundrissen (siehe docs/baugruppen-
// architektur.md - "reale Container brauchen Zugangsraum, nicht nur
// Kante-an-Kante"). Millimeter, wie ueberall im Datenmodell.
const CLEARANCE_MM = 500;
const M_TO_MM = 1000;

function emptyProject(): ProjectConfig {
  return { formatVersion: 1, name: "Neues Projekt", instances: [] };
}

function footprintOf(inst: ContainerInstance): OrientedRect {
  return {
    x: inst.position.x,
    z: inst.position.z,
    halfWidth: inst.config.size.length / 2,
    halfDepth: inst.config.size.width / 2,
    rotationDeg: inst.rotationY,
  };
}

function collidesWithAny(candidate: OrientedRect, others: ContainerInstance[]): boolean {
  return others.some((other) => rectsOverlap(candidate, footprintOf(other), CLEARANCE_MM));
}

// Reihum-Platzierung fuer neu hinzugefuegte Container (siehe Architektur-
// Doku: einfache, deterministische Heuristik reicht fuer eine erste Version).
function findFreePosition(instances: ContainerInstance[], length: number): { x: number; z: number } {
  if (instances.length === 0) return { x: 0, z: 0 };
  let rightmostEdge = 0;
  for (const inst of instances) {
    rightmostEdge = Math.max(rightmostEdge, inst.position.x + inst.config.size.length / 2);
  }
  return { x: rightmostEdge + CLEARANCE_MM + length / 2, z: 0 };
}

// Fuer "Passend"/"Fluchtend": weil rotationY immer ein Vielfaches von 90 Grad
// ist (siehe handleRotate), bleibt der Grundriss nach der Rotation IMMER
// achsparallel zur Welt - bei 90/270 Grad tauschen Laenge und Breite nur ihre
// Rolle bezueglich der Welt-Achsen.
function worldHalfExtents(inst: ContainerInstance): { hw: number; hd: number } {
  const swapped = Math.abs(inst.rotationY % 180) === 90;
  return swapped
    ? { hw: inst.config.size.width / 2, hd: inst.config.size.length / 2 }
    : { hw: inst.config.size.length / 2, hd: inst.config.size.width / 2 };
}

type MateSide = "left" | "right" | "top" | "bottom";

function computeMatePosition(
  ref: ContainerInstance,
  target: ContainerInstance,
  sideOfTarget: MateSide,
  gap: number,
): { x: number; z: number } {
  const extRef = worldHalfExtents(ref);
  const extTarget = worldHalfExtents(target);
  switch (sideOfTarget) {
    case "left":
      return { x: ref.position.x + extRef.hw + gap + extTarget.hw, z: target.position.z };
    case "right":
      return { x: ref.position.x - extRef.hw - gap - extTarget.hw, z: target.position.z };
    case "top":
      return { x: target.position.x, z: ref.position.z + extRef.hd + gap + extTarget.hd };
    case "bottom":
      return { x: target.position.x, z: ref.position.z - extRef.hd - gap - extTarget.hd };
  }
}

function computeFlushPosition(
  ref: ContainerInstance,
  target: ContainerInstance,
  axis: "x" | "z",
  offset: number,
): { x: number; z: number } {
  if (axis === "x") return { x: ref.position.x + offset, z: target.position.z };
  return { x: target.position.x, z: ref.position.z + offset };
}

interface DragState {
  id: string;
  offsetXMm: number;
  offsetZMm: number;
  lastValidMm: { x: number; z: number };
}

// Ein Projekt (Baugruppe) mit einem gemeinsamen 3D-Viewer - man legt ein
// Projekt an und darin einen oder mehrere Container. "Detail bearbeiten"
// oeffnet einen Container zur Bearbeitung auf DERSELBEN Seite (kein
// separater Modus/keine Route mehr) und schreibt jede Aenderung sofort
// zurueck in die jeweilige ContainerInstance des Projekts.
export function WorkspacePage() {
  const location = useLocation();
  // historyId: gesetzt, wenn ein KONKRETER Verlaufs-Eintrag geoeffnet wurde
  // (Jonas' Vorgabe 2026-07-28, siehe HistoryPage.tsx) - dieser bleibt dann
  // der aktive Eintrag, statt (wie bei routeProject ohne historyId, z. B.
  // einer frisch aus Datei geladenen Fremd-Datei) einen neuen anzulegen.
  const routeState = location.state as { project?: ProjectConfig; fresh?: boolean; historyId?: string } | null;
  const routeProject = routeState?.project;
  // "Konfiguration starten" auf der Startseite setzt "fresh", damit IMMER
  // ein neues, leeres Projekt beginnt statt (versehentlich) den Cache
  // wiederherzustellen - der Cache bleibt dem expliziten "Aus Cache laden"
  // vorbehalten. Ohne jeden State (z. B. Neuladen der Seite waehrend der
  // Arbeit) greift weiterhin der Cache als Absturz-Sicherheitsnetz.
  const forceFresh = routeState?.fresh === true;
  const routeHistoryId = routeState?.historyId;

  const [project, setProject] = useState<ProjectConfig>(() => {
    if (routeProject) return routeProject;
    if (forceFresh) return emptyProject();
    return loadProjectDraft() ?? emptyProject();
  });
  // Welcher Verlaufs-Eintrag (projectHistoryStore.ts) gerade live mitgeschrieben
  // wird - in einem Ref statt State, weil er sich waehrend der Sitzung nie
  // mehr aendert und keine eigene Re-Render-Ursache sein soll. Per useEffect
  // (nicht im useState-Initializer oben) gesetzt, damit der Seiteneffekt
  // (neuen Verlaufs-Eintrag anlegen) unter React 19 StrictMode garantiert nur
  // EINMAL pro echtem Mount laeuft, nicht zweimal wie es einem reinen
  // Initializer-Aufruf passieren koennte.
  const activeHistoryIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeHistoryIdRef.current) return;
    if (routeHistoryId) {
      activeHistoryIdRef.current = routeHistoryId;
      setActiveHistoryId(routeHistoryId);
    } else if (forceFresh || routeProject) {
      activeHistoryIdRef.current = startNewProjectDraft(project);
    } else {
      activeHistoryIdRef.current = getActiveHistoryId() ?? startNewProjectDraft(project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragValid, setDragValid] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [alignRefId, setAlignRefId] = useState<string | null>(null);
  const [alignTargetId, setAlignTargetId] = useState<string | null>(null);
  const [alignMode, setAlignMode] = useState<"mate" | "flush">("mate");
  const [alignSide, setAlignSide] = useState<MateSide>("left");
  const [alignAxis, setAlignAxis] = useState<"x" | "z">("x");
  const [alignDistance, setAlignDistance] = useState(500);
  const [alignError, setAlignError] = useState<string | null>(null);
  const [showResetProjectConfirm, setShowResetProjectConfirm] = useState(false);
  const workspaceDragRef = useRef<DragState | null>(null);
  // Jonas' Fehlerbericht 2026-08-10 ("Verschieben von Containern lagt sehr,
  // Auswaehlen von Containern dauert sehr lange"): die Drag-/Auswahl-Handler
  // unten (onPointerDown/-Move/-Up an ProjectScene3D) lasen bisher `project`
  // direkt aus dem Closure - dadurch bekam JEDE Instanz in der Baugruppe bei
  // JEDEM Renderaufruf eine NEUE Handler-Referenz, was React.memo (siehe
  // InstanceGroup in ProjectScene3D.tsx) komplett wirkungslos machte: JEDER
  // Container in der Baugruppe wurde bei JEDER Positionsaenderung/Auswahl
  // neu gerendert, nicht nur der betroffene - bei vielen Containern (mit
  // jeweils dutzenden C-Schienen-/Streckgitter-Meshes) summiert sich das
  // spuerbar. projectRef haelt den JEWEILS AKTUELLEN Stand, damit die Handler
  // unten OHNE `project`-Abhaengigkeit (also mit stabiler Referenz ueber
  // useCallback) trotzdem immer korrekt gegen die aktuellen Positionen
  // pruefen/kollidieren koennen.
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Stabile (leere Dependency-Liste) Referenzen - lesen den Container-Stand
  // ausschliesslich ueber projectRef.current statt aus dem `project`-Closure,
  // damit React.memo in ProjectScene3D/InstanceGroup tatsaechlich greift
  // (siehe projectRef-Kommentar oben).
  const handleInstancePointerDown = useCallback((id: string, ground: { x: number; z: number }) => {
    const inst = projectRef.current.instances.find((i) => i.id === id);
    if (!inst) return;
    workspaceDragRef.current = {
      id,
      offsetXMm: ground.x * M_TO_MM - inst.position.x,
      offsetZMm: ground.z * M_TO_MM - inst.position.z,
      lastValidMm: { ...inst.position },
    };
    setDraggingId(id);
    setDragValid(true);
  }, []);

  const handleInstancePointerMove = useCallback((id: string, ground: { x: number; z: number }) => {
    const drag = workspaceDragRef.current;
    if (!drag || drag.id !== id) return;
    const candidatePos = { x: ground.x * M_TO_MM - drag.offsetXMm, z: ground.z * M_TO_MM - drag.offsetZMm };
    const inst = projectRef.current.instances.find((i) => i.id === id);
    if (!inst) return;
    const candidate: OrientedRect = {
      x: candidatePos.x,
      z: candidatePos.z,
      halfWidth: inst.config.size.length / 2,
      halfDepth: inst.config.size.width / 2,
      rotationDeg: inst.rotationY,
    };
    const others = projectRef.current.instances.filter((i) => i.id !== id);
    const valid = !collidesWithAny(candidate, others);
    setDragValid(valid);
    if (valid) drag.lastValidMm = candidatePos;
    setProject((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === id ? { ...i, position: candidatePos } : i)),
    }));
  }, []);

  const handleInstancePointerUp = useCallback((id: string) => {
    const drag = workspaceDragRef.current;
    if (!drag || drag.id !== id) return;
    const finalPos = drag.lastValidMm;
    setProject((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === id ? { ...i, position: finalPos } : i)),
    }));
    workspaceDragRef.current = null;
    setDraggingId(null);
    setDragValid(true);
  }, []);

  // Falls gesetzt: zeigt die Detailbearbeitung EINER Container-Instanz statt
  // der Projekt-Uebersicht - "Zurück zur Baugruppe" schaltet einfach wieder
  // zurueck, ohne dass dabei irgendetwas gesondert uebernommen werden muss
  // (die Instanz wurde waehrend der Bearbeitung schon laufend aktualisiert).
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const editingInstance = project.instances.find((i) => i.id === editingInstanceId) ?? null;
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Steuert das Disc-Icon (statt Download-Icon) auf den "Speichern"-Buttons,
  // solange die asynchrone Kodierung laeuft (Jonas' Vorgabe 2026-07-29:
  // generisches animiertes Icon statt Ladebalken, siehe LoadingIcon.tsx) -
  // heute i. d. R. sofort fertig, haelt aber fuer groessere Baugruppen bereit.
  const [savingInstance, setSavingInstance] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // Jonas' Vorgabe 2026-08-11: "Anfragen" oeffnet erst eine Vorschau
  // (RequestPreviewModal.tsx) statt sofort die E-Mail zu starten - drei
  // Zaehler statt eines einzelnen Werts, weil es drei unabhaengige
  // Zielabschnitte gibt (Grundeinstellungen/Erweiterte Einstellungen/
  // Einbauten), siehe handleJumpToWarning/AccordionSection's
  // forceOpenSignal-Prop.
  const [showRequestPreview, setShowRequestPreview] = useState(false);
  const [grundOpenSignal, setGrundOpenSignal] = useState(0);
  const [erweitertOpenSignal, setErweitertOpenSignal] = useState(0);
  const [einbautenOpenSignal, setEinbautenOpenSignal] = useState(0);
  // Tutorial-Ueberarbeitung 2026-08-11 (per Playwright gefunden): die
  // "Container"-Liste in der Baugruppen-Uebersicht ist wie jeder andere
  // Abschnitt standardmaessig zugeklappt - der Tour-Schritt "Container
  // bearbeiten" (data-tour="edit-instance", der "Detail bearbeiten"-Knopf
  // EINES Eintrags) fand sein Ziel dadurch nie, weil es erst nach manuellem
  // Aufklappen ueberhaupt im DOM existiert (TourOverlay.tsx sucht 3s lang,
  // dann wird der Schritt stillschweigend uebersprungen). Gleiches
  // forceOpenSignal-Muster wie grundOpenSignal/erweitertOpenSignal/
  // einbautenOpenSignal oben, ausgeloest direkt beim Hinzufuegen eines
  // Containers (siehe handleAddInstance) - eine sinnvolle allgemeine
  // Verbesserung unabhaengig von der Tour: nach dem Hinzufuegen will man den
  // gerade angelegten Container ohnehin sofort in der Liste sehen.
  const [containerListOpenSignal, setContainerListOpenSignal] = useState(0);

  // Springt aus der Sonderheiten-Liste im Anfrage-Vorschau-Modal direkt zum
  // verursachenden Abschnitt: wechselt in die Detailbearbeitung DIESER
  // Instanz (falls noch nicht dort) und klappt den passenden Abschnitt auf.
  // Der kurze Timeout gibt dem DOM Zeit, den (evtl. gerade erst gewechselten)
  // Editor UND die Aufklapp-Animation des Abschnitts zu rendern, bevor
  // scrollIntoView darauf zielt - ohne Timeout traefe der Scroll oft noch auf
  // den alten/leeren Zustand.
  function handleJumpToWarning(instanceId: string, category: WarningCategory) {
    setShowRequestPreview(false);
    setEditingInstanceId(instanceId);
    const tourId = category === "color" ? "tour-darstellung" : category === "door" ? "tour-einbauten" : "tour-grundeinstellungen";
    if (tourId === "tour-darstellung") setErweitertOpenSignal((v) => v + 1);
    else if (tourId === "tour-einbauten") setEinbautenOpenSignal((v) => v + 1);
    else setGrundOpenSignal((v) => v + 1);
    window.setTimeout(() => {
      document.querySelector(`[data-tour="${tourId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }

  // Falls die gerade bearbeitete Instanz nicht mehr existiert (z. B. durch
  // Rueckgaengig/Wiederholen entfernt) - zurueck zur Uebersicht statt eines
  // kaputten Editors.
  useEffect(() => {
    if (editingInstanceId && !editingInstance) setEditingInstanceId(null);
  }, [editingInstanceId, editingInstance]);

  // Grundeinstellungen-Overlay beim Einstieg (Jonas' Vorgabe 2026-07-25:
  // "wenn man auf Konfiguration starten geht, soll ein Overlay-Fenster
  // aufploppen, welches ein paar Grundeinstellungen abfragt") - erscheint
  // NICHT, wenn ein konkretes Projekt geladen wurde (routeProject), IMMER bei
  // "fresh" (bewusster Neustart), sonst nur wenn noch kein sinnvolles
  // (nicht-leeres) Projekt im Cache liegt.
  const [showGrundeinstellungen, setShowGrundeinstellungen] = useState(() => {
    if (routeProject) return false;
    if (forceFresh) return true;
    return !hasMeaningfulProjectDraft();
  });

  function handleGrundeinstellungenSubmit(result: GrundeinstellungenResult) {
    setProject((p) => ({ ...p, name: result.name, standort: result.standort }));
    setShowGrundeinstellungen(false);
    notifyEvent("project-created");
  }

  const { setSuppressed: setTourSuppressed, notifyEvent } = useTour();

  // Tour und Grundeinstellungen-Overlay duerfen sich nie gleichzeitig
  // ueberlagern (Jonas' Fehlerbericht 2026-07-25) - die Tour blendet sich
  // waehrend des Overlays aus (suppressed), ohne ihren Fortschritt zu
  // verlieren.
  useEffect(() => {
    setTourSuppressed(showGrundeinstellungen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrundeinstellungen]);

  useEffect(() => {
    // activeHistoryIdRef ist bereits gesetzt, sobald dieser Effekt laeuft
    // (React fuehrt Mount-Effekte in Deklarationsreihenfolge aus, der
    // Session-Initialisierungs-Effekt oben steht vor diesem hier) - die
    // Absicherung greift trotzdem defensiv, falls sich das mal aendert.
    if (!activeHistoryIdRef.current) return;
    saveProjectDraft(activeHistoryIdRef.current, project);
  }, [project]);

  function updateEditingConfig(patch: Partial<ContainerConfig>) {
    if (!editingInstanceId) return;
    setProject((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === editingInstanceId ? { ...i, config: { ...i.config, ...patch } } : i)),
    }));
  }

  // ---------- Rückgängig/Wiederholen (Jonas' Vorgabe 2026-07-25: "vor und
  // zurück Buttons ... für Strg+Z usw.") ----------
  // Ein Verlaufseintrag pro "Aenderungs-Burst" statt pro Tastendruck/Drag-
  // Schritt: die Effekte unten schreiben den Snapshot VOR der Aenderung erst
  // nach einer kurzen Ruhephase (DEBOUNCE_MS) auf den Undo-Stack, sodass
  // z. B. das Tippen einer ganzen Zahl oder ein komplettes Ziehen EIN
  // Rueckgaengig-Schritt ist statt vieler winziger. skipHistory unterdrueckt
  // das erneute Aufzeichnen der eigenen Undo/Redo-Anwendung. Eine einzige
  // Historie für das gesamte Projekt deckt sowohl die Uebersicht als auch
  // die Detailbearbeitung ab, da eine bearbeitete Instanz Teil von
  // `project` ist.
  const DEBOUNCE_MS = 600;
  const HISTORY_LIMIT = 50;

  const [undoStack, setUndoStack] = useState<ProjectConfig[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectConfig[]>([]);
  const skipHistoryRef = useRef(false);
  const lastSnapshotRef = useRef<string | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  // Haelt den Projektstand VOR dem allerersten Wechsel des aktuellen Bursts
  // fest (z. B. vor dem Loslassen der Maustaste beim Ziehen eines
  // Containers) - MUSS waehrend eines laufenden Bursts unveraendert bleiben,
  // sonst wuerde jede Zwischenposition (z. B. jedes einzelne "pointermove"
  // eines Drags) den vorherigen Startpunkt ueberschreiben und Rueckgaengig
  // wuerde nur den letzten winzigen Zwischenschritt statt der kompletten
  // Bewegung zuruecknehmen (Jonas' Fehlerbericht: "es soll die volle
  // Bewegung ... rueckgaengig gemacht werden").
  const burstStartRef = useRef<string | null>(null);

  useEffect(() => {
    const json = JSON.stringify(project);
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      lastSnapshotRef.current = json;
      burstStartRef.current = null;
      if (historyTimerRef.current) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
      return;
    }
    if (lastSnapshotRef.current === json) return;
    const previousJson = lastSnapshotRef.current;
    lastSnapshotRef.current = json;
    if (previousJson === null) return; // erster Aufruf, noch kein "davor"
    if (burstStartRef.current === null) burstStartRef.current = previousJson;
    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => {
      const burstStart = burstStartRef.current;
      burstStartRef.current = null;
      if (burstStart === null) return;
      setUndoStack((s) => [...s, JSON.parse(burstStart)].slice(-HISTORY_LIMIT));
      setRedoStack([]);
    }, DEBOUNCE_MS);
  }, [project]);

  function handleUndo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, project]);
    skipHistoryRef.current = true;
    setProject(prev);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, project]);
    skipHistoryRef.current = true;
    setProject(next);
  }

  // Tastaturkuerzel Strg+Z / Strg+Y (bzw. Strg+Umschalt+Z) - greift nicht,
  // solange der Fokus in einem Text-/Zahlenfeld steht, damit das native
  // Undo dort (z. B. beim Tippen im Bezeichnungsfeld) nicht durchkreuzt wird.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, redoStack]);

  function handleBackToBaugruppe() {
    setEditingInstanceId(null);
    // Tutorial-Ueberarbeitung 2026-08-11: die Baugruppen-Uebersicht (Container-
    // Liste/Ausrichten/Speichern-Laden-Anfragen auf Projekt-Ebene) wird erst
    // ab HIER wieder sichtbar - ohne dieses Ereignis muesste die Tour beim
    // "Zurueck zur Baugruppe"-Schritt auf den reinen "Weiter"-Klick vertrauen
    // und wuerde bei den folgenden Schritten (deren Anker nur in der
    // Uebersicht existieren) sonst jedes Mal 3s lang erfolglos suchen, bevor
    // TourOverlay.tsx automatisch ueberspringt, siehe tour/tourDefinitions.ts.
    notifyEvent("back-to-baugruppe");
  }

  // ---------- Detailbearbeitung einer Instanz ----------
  function handleAddOpening(opening: Opening) {
    if (!editingInstance) return;
    updateEditingConfig({ openings: [...editingInstance.config.openings, opening] });
    notifyEvent("opening-added");
  }
  function handleUpdateOpening(id: string, patch: Partial<Opening>) {
    if (!editingInstance) return;
    updateEditingConfig({ openings: editingInstance.config.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }
  function handleRemoveOpening(id: string) {
    if (!editingInstance) return;
    updateEditingConfig({ openings: editingInstance.config.openings.filter((o) => o.id !== id) });
  }

  function applyResetInstance() {
    if (!editingInstanceId) return;
    updateEditingConfig(defaultConfig());
    setShowResetConfirm(false);
    flashStatus("Container wurde zurückgesetzt.");
  }

  async function handleResetInstanceAndSave() {
    await handleDownloadInstance();
    applyResetInstance();
  }

  function flashStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 4000);
  }

  async function handleDownloadInstance() {
    if (!editingInstance) return;
    setSavingInstance(true);
    try {
      const safeName = sanitizeFileName(editingInstance.label);
      const blob = await encodeConfig(editingInstance.config);
      downloadBlob(blob, `${safeName}${CONFIG_FILE_EXTENSION}`);
      flashStatus("Konfigurationsdatei wurde heruntergeladen.");
    } finally {
      setSavingInstance(false);
    }
  }

  // ---------- Baugruppen-Handler ----------
  function handleAddInstance() {
    const config = defaultConfig();
    const instance: ContainerInstance = {
      id: crypto.randomUUID(),
      label: `Container ${project.instances.length + 1}`,
      config,
      position: findFreePosition(project.instances, config.size.length),
      rotationY: 0,
    };
    setProject((p) => ({ ...p, instances: [...p.instances, instance] }));
    setSelectedId(instance.id);
    setContainerListOpenSignal((v) => v + 1);
    notifyEvent("container-added");
  }

  function handleRemoveInstance(id: string) {
    setProject((p) => ({ ...p, instances: p.instances.filter((i) => i.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function handleLabelChange(id: string, label: string) {
    setProject((p) => ({ ...p, instances: p.instances.map((i) => (i.id === id ? { ...i, label } : i)) }));
  }

  function handleRotate(id: string) {
    setProject((p) => {
      const target = p.instances.find((i) => i.id === id);
      if (!target) return p;
      const rotated: ContainerInstance = { ...target, rotationY: (target.rotationY + 90) % 360 };
      const others = p.instances.filter((i) => i.id !== id);
      if (collidesWithAny(footprintOf(rotated), others)) return p;
      return { ...p, instances: p.instances.map((i) => (i.id === id ? rotated : i)) };
    });
  }

  function handleEditInstance(instance: ContainerInstance) {
    setEditingInstanceId(instance.id);
    notifyEvent("instance-editing-opened");
  }

  async function handleLoadConfigFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const config = await decodeConfig(file);
      const instance: ContainerInstance = {
        id: crypto.randomUUID(),
        label: file.name.replace(new RegExp(`${CONFIG_FILE_EXTENSION}$`), ""),
        config,
        position: findFreePosition(project.instances, config.size.length),
        rotationY: 0,
      };
      setProject((p) => ({ ...p, instances: [...p.instances, instance] }));
      setSelectedId(instance.id);
      setProjectError(null);
    } catch {
      setProjectError("Datei konnte nicht geladen werden – ist es eine gültige Konfigurationsdatei (.sszkonfig)?");
    }
  }

  function handleApplyAlign() {
    setAlignError(null);
    const ref = project.instances.find((i) => i.id === alignRefId);
    const target = project.instances.find((i) => i.id === alignTargetId);
    if (!ref || !target || ref.id === target.id) {
      setAlignError("Bitte zwei unterschiedliche Container auswählen.");
      return;
    }

    const newPos =
      alignMode === "mate"
        ? computeMatePosition(ref, target, alignSide, alignDistance)
        : computeFlushPosition(ref, target, alignAxis, alignDistance);

    const candidate: OrientedRect = {
      x: newPos.x,
      z: newPos.z,
      halfWidth: target.config.size.length / 2,
      halfDepth: target.config.size.width / 2,
      rotationDeg: target.rotationY,
    };
    const others = project.instances.filter((i) => i.id !== target.id && i.id !== ref.id);
    if (collidesWithAny(candidate, others)) {
      setAlignError("Diese Ausrichtung würde zu einer Überschneidung mit einem anderen Container führen.");
      return;
    }

    setProject((p) => ({
      ...p,
      instances: p.instances.map((i) => (i.id === target.id ? { ...i, position: newPos } : i)),
    }));
  }

  async function handleDownloadProject() {
    setSavingProject(true);
    try {
      const blob = await encodeProject(project);
      downloadBlob(blob, `${sanitizeFileName(project.name)}${PROJECT_FILE_EXTENSION}`);
    } finally {
      setSavingProject(false);
    }
  }

  // Anfragen gibt es nur noch auf Projekt-Ebene, nicht mehr pro einzelnem
  // Container (siehe Detailbearbeitung, dort nur noch "Speichern").
  async function handleRequestProject() {
    const safeName = sanitizeFileName(project.name);
    const downloadFirst = window.confirm(
      "Soll die Projektdatei jetzt heruntergeladen werden, damit du sie der E-Mail anhängen kannst?",
    );
    if (downloadFirst) {
      const blob = await encodeProject(project);
      downloadBlob(blob, `${safeName}${PROJECT_FILE_EXTENSION}`);
    }

    const subject = `Anfrage Projekt: ${safeName}`;
    const body = [
      "Hallo,",
      "",
      "ich möchte folgendes Projekt anfragen.",
      `Bitte die Datei "${safeName}${PROJECT_FILE_EXTENSION}" ${downloadFirst ? "(gerade heruntergeladen)" : "aus dem Konfigurator"} manuell an diese E-Mail anhängen, bevor du sie abschickst.`,
      "",
      project.standort ? `Standort: ${project.standort}` : null,
      `Anzahl Container: ${project.instances.length}`,
      ...project.instances.map(
        (inst, i) => `Container ${i + 1} (${inst.label}): ${inst.config.size.length} × ${inst.config.size.width} × ${inst.config.size.height} mm`,
      ),
      "",
      "Mit freundlichen Grüßen",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function applyResetProject() {
    setProject(emptyProject());
    setSelectedId(null);
    setShowResetProjectConfirm(false);
    // Siehe applyResetInstance() - "Projekt zurücksetzen" ist ebenfalls ein
    // selbst-begonnenes neues Projekt.
    setShowGrundeinstellungen(true);
  }

  async function handleResetProjectAndSave() {
    await handleDownloadProject();
    applyResetProject();
  }

  async function handleProjectFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const loaded = await decodeProject(file);
      setProject(loaded);
      setSelectedId(null);
      setProjectError(null);
    } catch {
      setProjectError("Datei konnte nicht geladen werden – ist es eine gültige Projektdatei (.sszprojekt)?");
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink dark:bg-slate-900 dark:text-slate-100">
      <SidebarProvider defaultOpen className="flex-1 overflow-hidden">
        <Sidebar>
          {editingInstance && (
            <SidebarHeader>
              <AnimatedButton
                type="button"
                data-tour="back-to-project"
                onClick={handleBackToBaugruppe}
                className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
              >
                <ArrowLeftIcon size={16} />
                Zurück zur Baugruppe
              </AnimatedButton>
            </SidebarHeader>
          )}
          <SidebarContent>
            {editingInstance ? (
              <>
                {/* Jonas' Fehlerbericht 2026-08-11 (per Playwright gefunden,
                    beim Verifizieren des Sonderheiten-Sprungs): OHNE
                    explizites key blieb der useState/useRef-Zustand EINES
                    AccordionSection ueber einen kompletten Zweigwechsel
                    hinweg erhalten, wenn beide Zweige an derselben
                    Baumposition ein AccordionSection rendern (React
                    reconciled nach Typ+Position, nicht nach Titel) - z.B.
                    "Container" (Baugruppen-Liste, manuell aufgeklappt)
                    wurde so faelschlich zu "Erweiterte Einstellungen"
                    (Detailbearbeitung), die dadurch schon beim ersten
                    Anzeigen unerwartet offen war. key={title} zwingt React,
                    bei jedem Titelwechsel eine frische Komponenteninstanz
                    (frischer State) anzulegen. */}
                <AccordionSection
                  key="Grundeinstellungen"
                  title="Grundeinstellungen"
                  defaultOpen
                  tourId="tour-grundeinstellungen"
                  forceOpenSignal={grundOpenSignal}
                >
                  <label className="mb-3 block text-xs text-slate-500 dark:text-slate-400">
                    Bezeichnung
                    <input
                      type="text"
                      value={editingInstance.label}
                      onChange={(e) => handleLabelChange(editingInstance.id, e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <ContainerSizeControls
                    size={editingInstance.config.size}
                    wallThickness={editingInstance.config.wallThickness}
                    onSizeChange={(size) => {
                      updateEditingConfig({ size });
                      notifyEvent("size-changed");
                    }}
                    onWallThicknessChange={(wallThickness) => updateEditingConfig({ wallThickness })}
                    floorThickness={editingInstance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS}
                    onFloorThicknessChange={(floorThickness) => updateEditingConfig({ floorThickness })}
                  />
                  <div className="mt-3" data-tour="tour-soundclass">
                    <SoundClassControls
                      soundClass={editingInstance.config.soundClass ?? DEFAULT_SOUND_CLASS}
                      wallThickness={editingInstance.config.wallThickness}
                      // Klassenwechsel setzt den Bodenisolierungs-Default neu
                      // (an fuer Silent/Silent-Plus, sonst aus - Jonas'
                      // Vorgabe 2026-08-11) UND korrigiert jetzt aktiv zu
                      // duenne Wand-/Bodenstaerken (Jonas' Korrektur
                      // 2026-08-11, spaeter am selben Tag: "nicht nur die
                      // rote Warnung stehen lassen, den Wert selbst
                      // anheben") - beide Bump-Funktionen sind einseitig
                      // (heben nur an, senken nie), siehe lcStandard.ts. Die
                      // Checkbox/Felder bleiben danach unabhaengig manuell
                      // umschaltbar, siehe onFloorInsulatedChange unten bzw.
                      // onFloorThicknessChange/onWallThicknessChange oben.
                      // notifyEvent (Tutorial-Ueberarbeitung 2026-08-11):
                      // derselbe "echte Aktion loest den naechsten Tour-
                      // Schritt aus"-Mechanismus wie bei size-changed/
                      // opening-added weiter unten, siehe tour/tourDefinitions.ts.
                      onChange={(soundClass) => {
                        const floorInsulated = defaultFloorInsulated(soundClass);
                        updateEditingConfig({
                          soundClass,
                          floorInsulated,
                          wallThickness: bumpedWallThickness(editingInstance.config.wallThickness, soundClass),
                          floorThickness: bumpedFloorThickness(
                            editingInstance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS,
                            floorInsulated,
                          ),
                        });
                        notifyEvent("soundclass-changed");
                      }}
                      floorThickness={editingInstance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS}
                      floorInsulated={editingInstance.config.floorInsulated ?? defaultFloorInsulated(editingInstance.config.soundClass ?? DEFAULT_SOUND_CLASS)}
                      onFloorInsulatedChange={(floorInsulated) =>
                        updateEditingConfig({
                          floorInsulated,
                          floorThickness: bumpedFloorThickness(
                            editingInstance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS,
                            floorInsulated,
                          ),
                        })
                      }
                    />
                  </div>
                </AccordionSection>

                <AccordionSection key="Erweiterte Einstellungen" title="Erweiterte Einstellungen" tourId="tour-darstellung" forceOpenSignal={erweitertOpenSignal}>
                  <DisplaySettingsPanel
                    insideColor={editingInstance.config.insideColor}
                    onInsideColorChange={(insideColor) => updateEditingConfig({ insideColor })}
                    outsideColor={editingInstance.config.outsideColor}
                    onOutsideColorChange={(outsideColor) => updateEditingConfig({ outsideColor })}
                    insideUnpainted={editingInstance.config.insideUnpainted ?? false}
                    onInsideUnpaintedChange={(insideUnpainted) => updateEditingConfig({ insideUnpainted })}
                    outsideNotes={editingInstance.config.outsideNotes ?? ""}
                    onOutsideNotesChange={(outsideNotes) => updateEditingConfig({ outsideNotes })}
                    insideNotes={editingInstance.config.insideNotes ?? ""}
                    onInsideNotesChange={(insideNotes) => updateEditingConfig({ insideNotes })}
                  />
                </AccordionSection>

                <AccordionSection key="Einbauten" title="Einbauten" tourId="tour-einbauten" forceOpenSignal={einbautenOpenSignal}>
                  <OpeningsPanel
                    size={editingInstance.config.size}
                    openings={editingInstance.config.openings}
                    onUpdate={handleUpdateOpening}
                    onRemove={handleRemoveOpening}
                  />
                </AccordionSection>

                <div data-tour="save-project" className="mt-6 space-y-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Speichern</p>
                  <AnimatedButton
                    type="button"
                    onClick={handleDownloadInstance}
                    disabled={savingInstance}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    {savingInstance ? <LoadingIcon active kind="saving" size={16} /> : <DownloadIcon size={16} />}
                    Speichern
                  </AnimatedButton>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    „Speichern“ lädt diesen Container als Datei herunter, um ihn später wieder zu laden.
                  </p>
                  {statusMessage && <p className="text-xs text-brand-dark">{statusMessage}</p>}
                </div>
              </>
            ) : (
              <>
                <AccordionSection key="Grundeinstellungen" title="Grundeinstellungen" defaultOpen>
                  <label className="block text-xs text-slate-500 dark:text-slate-400">
                    Projektname
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                    Standort (optional)
                    <input
                      type="text"
                      value={project.standort ?? ""}
                      onChange={(e) => setProject((p) => ({ ...p, standort: e.target.value || undefined }))}
                      placeholder="z. B. Musterstadt"
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </AccordionSection>

                <AccordionSection
                  key="Container"
                  title="Container"
                  tourId="tour-baugruppe-list"
                  forceOpenSignal={containerListOpenSignal}
                >
                  {project.instances.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Container im Projekt.</p>
                  )}
                  <div className="space-y-2">
                    {project.instances.map((inst) => (
                      <div
                        key={inst.id}
                        onClick={() => setSelectedId(inst.id)}
                        // Jonas' Vorgabe 2026-08-11 ("Doppelklick auf Container
                        // öffnet Detailansicht" auch in der Seitenleiste, nicht
                        // nur im 3D-Viewport - siehe ProjectScene3D.tsx's
                        // gleichnamiges onDoubleClick auf dem Grundriss):
                        // additiv zum bestehenden Einzelklick (waehlt nur aus,
                        // siehe onClick oben) - ein Doppelklick loest ZUERST
                        // zwei Einzelklicks aus (harmlos, waehlt denselben
                        // Container zweimal aus) UND danach dieses
                        // onDoubleClick, das direkt in die Detailbearbeitung
                        // springt, exakt wie der bestehende "Detail
                        // bearbeiten"-Knopf unten in derselben Zeile.
                        onDoubleClick={() => handleEditInstance(inst)}
                        className={`cursor-pointer rounded-lg border p-2.5 text-sm shadow-sm ${
                          selectedId === inst.id
                            ? "border-brand bg-white dark:bg-slate-900"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inst.label}
                            onChange={(e) => handleLabelChange(inst.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          />
                          {/* Sammel-Hinweis fuer diesen Container (Jonas'
                              Vorgabe 2026-08-10: "wenn an einem Container
                              etwas Orange oder rot ist, soll das auch in der
                              Baugruppe übertragen werden ... ein kleines
                              oranges/rotes Ausrufezeichen bei dem jeweiligen
                              Container") - stopPropagation wie bei
                              Drehen/Entfernen daneben, sonst wuerde ein Klick
                              auf das Badge zusaetzlich die Zeile auswaehlen. */}
                          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <ContainerWarningBadge warnings={getContainerWarnings(inst.config)} />
                          </span>
                          <AnimatedButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotate(inst.id);
                            }}
                            aria-label={`${inst.label} drehen`}
                            className="shrink-0 text-slate-400 hover:text-brand dark:text-slate-500"
                          >
                            <RotateCcwIcon size={15} />
                          </AnimatedButton>
                          <AnimatedButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveInstance(inst.id);
                            }}
                            aria-label={`${inst.label} entfernen`}
                            className="shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500"
                          >
                            <TrashIcon size={15} />
                          </AnimatedButton>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {inst.config.size.length} × {inst.config.size.width} mm · {inst.rotationY}°
                        </p>
                        <AnimatedButton
                          type="button"
                          data-tour="edit-instance"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInstance(inst);
                          }}
                          className="mt-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                        >
                          Detail bearbeiten
                          <ArrowRightIcon size={13} />
                        </AnimatedButton>
                      </div>
                    ))}
                  </div>
                </AccordionSection>

                {project.instances.length >= 2 && (
                  <AccordionSection key="Ausrichten" title="Ausrichten" tourId="tour-ausrichten">
                    <label className="block text-xs text-slate-500 dark:text-slate-400">
                      Container
                      <select
                        value={alignTargetId ?? ""}
                        onChange={(e) => setAlignTargetId(e.target.value || null)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">– auswählen –</option>
                        {project.instances.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                      relativ zu
                      <select
                        value={alignRefId ?? ""}
                        onChange={(e) => setAlignRefId(e.target.value || null)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="">– auswählen –</option>
                        {project.instances
                          .filter((i) => i.id !== alignTargetId)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.label}
                            </option>
                          ))}
                      </select>
                    </label>

                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAlignMode("mate")}
                        className={`flex-1 rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                          alignMode === "mate" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        }`}
                      >
                        Passend
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignMode("flush")}
                        className={`flex-1 rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                          alignMode === "flush" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                        }`}
                      >
                        Fluchtend
                      </button>
                    </div>

                    {alignMode === "mate" ? (
                      <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                        Position
                        <select
                          value={alignSide}
                          onChange={(e) => setAlignSide(e.target.value as MateSide)}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="left">rechts daneben</option>
                          <option value="right">links daneben</option>
                          <option value="top">darunter</option>
                          <option value="bottom">darüber</option>
                        </select>
                      </label>
                    ) : (
                      <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                        Achse
                        <select
                          value={alignAxis}
                          onChange={(e) => setAlignAxis(e.target.value as "x" | "z")}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="x">horizontal (X)</option>
                          <option value="z">vertikal (Z)</option>
                        </select>
                      </label>
                    )}

                    <label className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                      Abstand (mm)
                      <input
                        type="number"
                        step={10}
                        value={alignDistance}
                        onChange={(e) => setAlignDistance(Number(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleApplyAlign}
                      className="mt-2 w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                    >
                      Anwenden
                    </button>
                    {alignError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{alignError}</p>}
                  </AccordionSection>
                )}

                <div className="mt-6 space-y-2" data-tour="tour-project-request">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Speichern, Laden &amp; Anfragen</p>
                  <div className="flex gap-2">
                    <AnimatedButton
                      type="button"
                      onClick={handleDownloadProject}
                      disabled={savingProject}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      {savingProject ? <LoadingIcon active kind="saving" size={16} /> : <DownloadIcon size={16} />}
                      Speichern
                    </AnimatedButton>
                    <AnimatedButton
                      type="button"
                      onClick={() => document.getElementById("workspace-project-file-input")?.click()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white"
                    >
                      <UploadIcon size={16} />
                      Laden
                    </AnimatedButton>
                    <input
                      id="workspace-project-file-input"
                      type="file"
                      accept={PROJECT_FILE_EXTENSION}
                      onChange={handleProjectFileSelected}
                      className="hidden"
                    />
                  </div>
                  <AnimatedButton
                    type="button"
                    onClick={() => setShowRequestPreview(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                  >
                    <SendIcon size={16} />
                    Anfragen
                  </AnimatedButton>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    „Speichern“ lädt die Baugruppe als Datei herunter, um sie später wieder zu laden. „Anfragen“ öffnet
                    zusätzlich eine E-Mail-Anfrage.
                  </p>
                  {projectError && <p className="text-xs text-red-600 dark:text-red-400">{projectError}</p>}
                </div>
              </>
            )}
          </SidebarContent>

          <SidebarFooter>
            {editingInstance ? (
              <AnimatedButton
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <RotateCcwIcon size={16} />
                Zurücksetzen
              </AnimatedButton>
            ) : (
              <AnimatedButton
                type="button"
                onClick={() => setShowResetProjectConfirm(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <RotateCcwIcon size={16} />
                Projekt zurücksetzen
              </AnimatedButton>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="relative min-h-0 min-w-0 flex-1">
          <SidebarTrigger className="absolute left-2 top-1/2 z-20 -translate-y-1/2" />
          {editingInstance ? (
            <>
              <Scene
                size={editingInstance.config.size}
                wallThickness={editingInstance.config.wallThickness}
                openings={editingInstance.config.openings}
                viewStyle={editingInstance.config.viewStyle}
                background={editingInstance.config.background}
                insideColor={editingInstance.config.insideColor}
                outsideColor={editingInstance.config.outsideColor}
                insideUnpainted={editingInstance.config.insideUnpainted ?? false}
                floorThickness={editingInstance.config.floorThickness ?? DEFAULT_FLOOR_THICKNESS}
                floorInsulated={
                  editingInstance.config.floorInsulated ?? defaultFloorInsulated(editingInstance.config.soundClass ?? DEFAULT_SOUND_CLASS)
                }
                shadowsEnabled={editingInstance.config.shadowsEnabled ?? true}
                terrainDetail={editingInstance.config.terrainDetail ?? "low"}
                onViewStyleChange={(viewStyle) => updateEditingConfig({ viewStyle })}
                onBackgroundChange={(background) => updateEditingConfig({ background })}
                onShadowsEnabledChange={(shadowsEnabled) => updateEditingConfig({ shadowsEnabled })}
                onTerrainDetailChange={(terrainDetail) => updateEditingConfig({ terrainDetail })}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
              />
              {!showAddPopup && (
                <AnimatedButton
                  type="button"
                  data-tour="add-opening"
                  onClick={() => setShowAddPopup(true)}
                  aria-label="Durchbruch hinzufügen"
                  className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark"
                >
                  <PlusIcon size={20} />
                </AnimatedButton>
              )}
              {showAddPopup && (
                <AddOpeningPopup
                  size={editingInstance.config.size}
                  onAdd={handleAddOpening}
                  onClose={() => setShowAddPopup(false)}
                />
              )}
            </>
          ) : (
            <>
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <AnimatedButton
                  type="button"
                  data-tour="add-container"
                  onClick={handleAddInstance}
                  aria-label="Container hinzufügen"
                  title="Neuen leeren Container hinzufügen"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark"
                >
                  <PlusIcon size={20} />
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  onClick={() => document.getElementById("workspace-config-file-input")?.click()}
                  aria-label="Container aus Datei laden"
                  title="Aus gespeicherter Konfigurationsdatei laden"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-white text-brand shadow-md hover:bg-brand hover:text-white dark:bg-slate-800"
                >
                  <UploadIcon size={16} />
                </AnimatedButton>
                <input
                  id="workspace-config-file-input"
                  type="file"
                  accept={CONFIG_FILE_EXTENSION}
                  onChange={handleLoadConfigFile}
                  className="hidden"
                />
              </div>
              <ProjectScene3D
                instances={project.instances}
                selectedId={selectedId}
                draggingId={draggingId}
                dragValid={dragValid}
                onSelect={setSelectedId}
                onSetAllViewStyle={(v) =>
                  setProject((p) => ({ ...p, instances: p.instances.map((i) => ({ ...i, config: { ...i.config, viewStyle: v } })) }))
                }
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onPointerDown={handleInstancePointerDown}
                onPointerMove={handleInstancePointerMove}
                onPointerUp={handleInstancePointerUp}
                onOpenDetail={(id) => {
                  const inst = project.instances.find((i) => i.id === id);
                  if (inst) handleEditInstance(inst);
                }}
              />
            </>
          )}
        </main>
      </SidebarProvider>

      <GrundeinstellungenOverlay open={showGrundeinstellungen} onSubmit={handleGrundeinstellungenSubmit} />

      <ThreeOptionConfirmDialog
        open={showResetConfirm}
        title="Zurücksetzen"
        message="Container wirklich zurücksetzen? Alle aktuellen Einstellungen und Durchbrüche gehen verloren."
        primaryLabel="Speichern & zurücksetzen"
        onPrimary={handleResetInstanceAndSave}
        confirmLabel="Ja, zurücksetzen"
        onConfirm={applyResetInstance}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ThreeOptionConfirmDialog
        open={showResetProjectConfirm}
        title="Zurücksetzen"
        message="Projekt wirklich zurücksetzen? Alle Container und deren Anordnung gehen verloren."
        primaryLabel="Speichern & zurücksetzen"
        onPrimary={handleResetProjectAndSave}
        confirmLabel="Ja, zurücksetzen"
        onConfirm={applyResetProject}
        onCancel={() => setShowResetProjectConfirm(false)}
      />

      <RequestPreviewModal
        open={showRequestPreview}
        projectName={project.name}
        standort={project.standort}
        instances={project.instances}
        savingProject={savingProject}
        onClose={() => setShowRequestPreview(false)}
        onSave={handleDownloadProject}
        onSend={() => {
          setShowRequestPreview(false);
          void handleRequestProject();
        }}
        onJumpToWarning={handleJumpToWarning}
      />
    </div>
  );
}
