import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Scene } from "../components/Scene";
import { ProjectScene3D } from "../components/ProjectScene3D";
import { OpeningsPanel } from "../components/OpeningsPanel";
import { AddOpeningPopup } from "../components/AddOpeningPopup";
import { ContainerSizeControls } from "../components/ContainerSizeControls";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { AccordionSection } from "../components/AccordionSection";
import { AnimatedButton } from "../components/AnimatedButton";
import { ThreeOptionConfirmDialog } from "../components/ThreeOptionConfirmDialog";
import { GrundeinstellungenOverlay, type GrundeinstellungenResult } from "../components/GrundeinstellungenOverlay";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";
import type { ContainerConfig } from "../config/types";
import { CONFIG_FILE_EXTENSION, decodeConfig, downloadBlob, encodeConfig, sanitizeFileName } from "../config/configFileCodec";
import { REQUEST_EMAIL } from "../config/requestEmail";
import { loadDraft, saveDraft } from "../config/draftStore";
import { defaultConfig } from "../config/defaultContainerConfig";
import type { ContainerInstance, ProjectConfig } from "../config/projectTypes";
import { loadProjectDraft, saveProjectDraft } from "../config/projectDraftStore";
import { PROJECT_FILE_EXTENSION, decodeProject, encodeProject } from "../config/projectFileCodec";
import { rectsOverlap, type OrientedRect } from "../utils/collision";
import { useModeSwitch, type WorkspaceMode } from "../context/ModeSwitchContext";
import { useTour } from "../tour/TourContext";
import { hasSeenTour } from "../tour/tourStore";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { PlusIcon } from "../components/icons/PlusIcon";
import { TrashIcon } from "../components/icons/TrashIcon";
import { RotateCcwIcon } from "../components/icons/RotateCcwIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { SendIcon } from "../components/icons/SendIcon";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";

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

// Einzelcontainer- und Baugruppen-Konfigurator teilen sich jetzt EINE Seite
// mit einem gemeinsamen 3D-Viewer (Jonas' Vorgabe 2026-07-25: "soll auch
// einen 3D Viewer haben nicht so komisch 2D" + "dann sollen sich eigentlich
// nur die Tools in der Seitenleiste ändern") - das Dropdown dafuer sitzt im
// gemeinsamen AppShell-Header, siehe ModeSwitchContext.tsx fuer die Bruecke
// dazwischen. Wechselt man von "single" zu "project", wird eine bereits
// begonnene Einzelcontainer-Konfiguration automatisch als neue Instanz in
// die Baugruppe uebernommen (Jonas' Vorgabe: "es soll der vorher
// konfigurierte Container ... darein geladen werden").
export function WorkspacePage() {
  const location = useLocation();
  // "project" hier zusaetzlich zu "config" (Jonas' Vorgabe 2026-07-25:
  // "Konfiguration laden soll natürlich für einzelne Container als auch
  // Baugruppen gehen") - StartPage.tsx erkennt anhand der Dateiendung, ob
  // eine .sszkonfig- oder .sszprojekt-Datei geladen wurde, und uebergibt
  // entsprechend "config" ODER "project" ueber location.state.
  const routeState = location.state as { config?: ContainerConfig; project?: ProjectConfig } | null;
  const routeConfig = routeState?.config;
  const routeProject = routeState?.project;
  const draftConfig = loadDraft();
  const seed = routeConfig ?? draftConfig ?? defaultConfig();

  const [mode, setMode] = useState<WorkspaceMode>(() => (location.pathname === "/projekt" ? "project" : "single"));
  // Falls gesetzt: der Einzelcontainer-Modus zeigt gerade eine BESTEHENDE
  // Baugruppen-Instanz zur Detailbearbeitung an (statt einer freien neuen
  // Konfiguration) - "Zurück zur Baugruppe" schreibt dann gezielt in genau
  // diese Instanz zurueck, statt eine neue anzulegen.
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<WorkspaceMode | null>(null);

  // ---------- Einzelcontainer-Zustand ----------
  const [size, setSize] = useState<ContainerSize>(seed.size);
  const [wallThickness, setWallThickness] = useState(seed.wallThickness);
  const [openings, setOpenings] = useState<Opening[]>(seed.openings);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>(seed.viewStyle);
  const [background, setBackground] = useState<BackgroundStyle>(seed.background);
  const [outsideColor, setOutsideColor] = useState(seed.outsideColor);
  const [insideColor, setInsideColor] = useState(seed.insideColor);
  const [shadowsEnabled, setShadowsEnabled] = useState(seed.shadowsEnabled ?? true);
  const [terrainDetail, setTerrainDetail] = useState<TerrainDetail>(seed.terrainDetail ?? "low");
  const [insideUnpainted, setInsideUnpainted] = useState(seed.insideUnpainted ?? false);
  const [outsideNotes, setOutsideNotes] = useState(seed.outsideNotes ?? "");
  const [insideNotes, setInsideNotes] = useState(seed.insideNotes ?? "");
  const [fileName, setFileName] = useState("Container-Konfiguration");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ---------- Baugruppen-Zustand ----------
  const [project, setProject] = useState<ProjectConfig>(() => routeProject ?? loadProjectDraft() ?? emptyProject());
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

  // Grundeinstellungen-Overlay beim Einstieg (Jonas' Vorgabe 2026-07-25:
  // "wenn man auf Konfiguration starten geht, soll ein Overlay-Fenster
  // aufploppen, welches ein paar Grundeinstellungen abfragt") - erscheint
  // NICHT, wenn eine konkrete Datei geladen wurde (routeConfig) oder bereits
  // eine SINNVOLLE (nicht-leere/nicht-Standard) Konfiguration im Cache liegt
  // ("Das Fenster soll nicht kommen, wenn man noch ein Projekt im Cache
  // hat") - sonst wuerde man bei jedem Neuladen wieder gefragt, obwohl schon
  // gearbeitet wurde.
  const [showGrundeinstellungen, setShowGrundeinstellungen] = useState(() => {
    if (routeConfig || routeProject) return false;
    if (location.pathname === "/projekt") {
      const projectDraft = loadProjectDraft();
      return !projectDraft || projectDraft.instances.length === 0;
    }
    return !draftConfig || JSON.stringify(draftConfig) === JSON.stringify(defaultConfig());
  });

  function handleGrundeinstellungenSubmit(result: GrundeinstellungenResult) {
    if (mode === "project") {
      setProject((p) => ({ ...p, name: result.name }));
    } else {
      setFileName(result.name);
      if (result.size) setSize(result.size);
      if (result.outsideColor) setOutsideColor(result.outsideColor);
    }
    setShowGrundeinstellungen(false);
  }

  const { start: startTour, setSuppressed: setTourSuppressed } = useTour();
  useEffect(() => {
    // Die Tour zeigt ausschliesslich Einzelcontainer-UI-Elemente (siehe
    // tourDefinitions.ts) - nur automatisch starten, wenn der allererste
    // Aufruf tatsaechlich im Einzelcontainer-Modus landet (z. B. direkter
    // Erstbesuch von /projekt bleibt ohne Auto-Tour, "Tutorial" im
    // "?"-Menü funktioniert trotzdem jederzeit manuell).
    if (mode === "single" && !hasSeenTour(CONFIGURATOR_TOUR_ID)) startTour(CONFIGURATOR_TOUR_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tour und Grundeinstellungen-Overlay duerfen sich nie gleichzeitig
  // ueberlagern (Jonas' Fehlerbericht 2026-07-25: "das Tutorial kollidiert
  // ein bisschen mit dem Fenster ... wenn dann nachher das Tutorial
  // irgendwo aufgerufen wird, soll auch dort weitergemacht werden, nicht
  // einfach von vorne") - die Tour blendet sich waehrend des Overlays aus
  // (suppressed), OHNE ihren Fortschritt zu verlieren: egal ob sie gerade
  // erst startet (Erstbesuch) oder schon mitten in einem Schritt war (z. B.
  // Zurücksetzen zeigt das Overlay erneut) - sie macht danach GENAU an
  // dieser Stelle weiter statt bei Schritt 1 neu zu beginnen.
  useEffect(() => {
    setTourSuppressed(showGrundeinstellungen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrundeinstellungen]);

  useEffect(() => {
    saveDraft({
      size,
      wallThickness,
      openings,
      viewStyle,
      background,
      insideColor,
      outsideColor,
      shadowsEnabled,
      terrainDetail,
      insideUnpainted,
      outsideNotes,
      insideNotes,
    });
  }, [
    size,
    wallThickness,
    openings,
    viewStyle,
    background,
    insideColor,
    outsideColor,
    shadowsEnabled,
    terrainDetail,
    insideUnpainted,
    outsideNotes,
    insideNotes,
  ]);

  useEffect(() => {
    saveProjectDraft(project);
  }, [project]);

  function currentSingleConfig(): ContainerConfig {
    return {
      size,
      wallThickness,
      openings,
      viewStyle,
      background,
      insideColor,
      outsideColor,
      shadowsEnabled,
      terrainDetail,
      insideUnpainted,
      outsideNotes,
      insideNotes,
    };
  }

  function loadSingleConfig(config: ContainerConfig) {
    setSize(config.size);
    setWallThickness(config.wallThickness);
    setOpenings(config.openings);
    setViewStyle(config.viewStyle);
    setBackground(config.background);
    setInsideColor(config.insideColor);
    setOutsideColor(config.outsideColor);
    setShadowsEnabled(config.shadowsEnabled ?? true);
    setTerrainDetail(config.terrainDetail ?? "low");
    setInsideUnpainted(config.insideUnpainted ?? false);
    setOutsideNotes(config.outsideNotes ?? "");
    setInsideNotes(config.insideNotes ?? "");
  }

  // ---------- Rückgängig/Wiederholen (Jonas' Vorgabe 2026-07-25: "vor und
  // zurück Buttons ... für Strg+Z usw.") ----------
  // Ein Verlaufseintrag pro "Aenderungs-Burst" statt pro Tastendruck/Drag-
  // Schritt: die Effekte unten schreiben den Snapshot VOR der Aenderung erst
  // nach einer kurzen Ruhephase (DEBOUNCE_MS) auf den Undo-Stack, sodass
  // z. B. das Tippen einer ganzen Zahl oder ein komplettes Ziehen EIN
  // Rueckgaengig-Schritt ist statt vieler winziger. skipHistory* unterdrueckt
  // das erneute Aufzeichnen der eigenen Undo/Redo-Anwendung.
  const DEBOUNCE_MS = 600;
  const HISTORY_LIMIT = 50;

  const [singleUndoStack, setSingleUndoStack] = useState<ContainerConfig[]>([]);
  const [singleRedoStack, setSingleRedoStack] = useState<ContainerConfig[]>([]);
  const singleSkipHistoryRef = useRef(false);
  const singleLastSnapshotRef = useRef<string | null>(null);
  const singleHistoryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const json = JSON.stringify(currentSingleConfig());
    if (singleSkipHistoryRef.current) {
      singleSkipHistoryRef.current = false;
      singleLastSnapshotRef.current = json;
      return;
    }
    if (singleLastSnapshotRef.current === json) return;
    const previousJson = singleLastSnapshotRef.current;
    singleLastSnapshotRef.current = json;
    if (previousJson === null) return; // erster Aufruf, noch kein "davor"
    if (singleHistoryTimerRef.current) window.clearTimeout(singleHistoryTimerRef.current);
    singleHistoryTimerRef.current = window.setTimeout(() => {
      setSingleUndoStack((s) => [...s, JSON.parse(previousJson)].slice(-HISTORY_LIMIT));
      setSingleRedoStack([]);
    }, DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, wallThickness, openings, viewStyle, background, insideColor, outsideColor, shadowsEnabled, terrainDetail, insideUnpainted, outsideNotes, insideNotes]);

  function handleUndoSingle() {
    if (singleUndoStack.length === 0) return;
    const prev = singleUndoStack[singleUndoStack.length - 1];
    setSingleUndoStack((s) => s.slice(0, -1));
    setSingleRedoStack((s) => [...s, currentSingleConfig()]);
    singleSkipHistoryRef.current = true;
    loadSingleConfig(prev);
  }

  function handleRedoSingle() {
    if (singleRedoStack.length === 0) return;
    const next = singleRedoStack[singleRedoStack.length - 1];
    setSingleRedoStack((s) => s.slice(0, -1));
    setSingleUndoStack((s) => [...s, currentSingleConfig()]);
    singleSkipHistoryRef.current = true;
    loadSingleConfig(next);
  }

  const [projectUndoStack, setProjectUndoStack] = useState<ProjectConfig[]>([]);
  const [projectRedoStack, setProjectRedoStack] = useState<ProjectConfig[]>([]);
  const projectSkipHistoryRef = useRef(false);
  const projectLastSnapshotRef = useRef<string | null>(null);
  const projectHistoryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const json = JSON.stringify(project);
    if (projectSkipHistoryRef.current) {
      projectSkipHistoryRef.current = false;
      projectLastSnapshotRef.current = json;
      return;
    }
    if (projectLastSnapshotRef.current === json) return;
    const previousJson = projectLastSnapshotRef.current;
    projectLastSnapshotRef.current = json;
    if (previousJson === null) return;
    if (projectHistoryTimerRef.current) window.clearTimeout(projectHistoryTimerRef.current);
    projectHistoryTimerRef.current = window.setTimeout(() => {
      setProjectUndoStack((s) => [...s, JSON.parse(previousJson)].slice(-HISTORY_LIMIT));
      setProjectRedoStack([]);
    }, DEBOUNCE_MS);
  }, [project]);

  function handleUndoProject() {
    if (projectUndoStack.length === 0) return;
    const prev = projectUndoStack[projectUndoStack.length - 1];
    setProjectUndoStack((s) => s.slice(0, -1));
    setProjectRedoStack((s) => [...s, project]);
    projectSkipHistoryRef.current = true;
    setProject(prev);
  }

  function handleRedoProject() {
    if (projectRedoStack.length === 0) return;
    const next = projectRedoStack[projectRedoStack.length - 1];
    setProjectRedoStack((s) => s.slice(0, -1));
    setProjectUndoStack((s) => [...s, project]);
    projectSkipHistoryRef.current = true;
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
        mode === "single" ? handleUndoSingle() : handleUndoProject();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        mode === "single" ? handleRedoSingle() : handleRedoProject();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, singleUndoStack, singleRedoStack, projectUndoStack, projectRedoStack]);

  // ---------- Moduswechsel (siehe ModeSwitchContext.tsx) ----------
  const { registerWorkspace } = useModeSwitch();
  useEffect(() => {
    registerWorkspace({ mode, requestModeChange });
    return () => registerWorkspace(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, size, wallThickness, openings, viewStyle, background, insideColor, outsideColor, shadowsEnabled, terrainDetail, insideUnpainted, outsideNotes, insideNotes, project, editingInstanceId]);

  function requestModeChange(newMode: WorkspaceMode) {
    if (newMode === mode) return;
    if (mode === "single") {
      if (editingInstanceId) {
        applyModeSwitch(newMode);
        return;
      }
      const isDefault = JSON.stringify(currentSingleConfig()) === JSON.stringify(defaultConfig());
      if (isDefault) applyModeSwitch(newMode);
      else setPendingModeSwitch(newMode);
    } else {
      if (project.instances.length === 0) applyModeSwitch(newMode);
      else setPendingModeSwitch(newMode);
    }
  }

  // Jonas' Vorgabe 2026-07-25: "es soll der vorher konfigurierte Container,
  // falls einer konfiguriert wurde, [in die Baugruppe] geladen werden" -
  // beim Wechsel von "single" zu "project" wird eine nicht-triviale
  // Konfiguration automatisch als neue Instanz uebernommen (oder, falls
  // gerade eine bestehende Instanz bearbeitet wurde, gezielt in DIESE
  // zurueckgeschrieben statt eine neue anzulegen). Einzelcontainer-Zustand
  // wird danach auf den leeren Standard zurueckgesetzt, damit eine spaetere
  // Einzelcontainer-Sitzung nicht versehentlich noch einmal dieselbe
  // Konfiguration uebernimmt.
  function applyModeSwitch(newMode: WorkspaceMode) {
    if (mode === "single" && newMode === "project") {
      if (editingInstanceId) {
        const instanceId = editingInstanceId;
        const finishedConfig = currentSingleConfig();
        setProject((p) => ({
          ...p,
          instances: p.instances.map((i) => (i.id === instanceId ? { ...i, config: finishedConfig } : i)),
        }));
        setEditingInstanceId(null);
      } else {
        const config = currentSingleConfig();
        const isDefault = JSON.stringify(config) === JSON.stringify(defaultConfig());
        if (!isDefault) {
          const instance: ContainerInstance = {
            id: crypto.randomUUID(),
            label: `Container ${project.instances.length + 1}`,
            config,
            position: findFreePosition(project.instances, config.size.length),
            rotationY: 0,
          };
          setProject((p) => ({ ...p, instances: [...p.instances, instance] }));
        }
      }
      loadSingleConfig(defaultConfig());
    }
    setMode(newMode);
    setPendingModeSwitch(null);
  }

  function handleBackToBaugruppe() {
    applyModeSwitch("project");
  }

  // ---------- Einzelcontainer-Handler ----------
  function handleAddOpening(opening: Opening) {
    setOpenings((prev) => [...prev, opening]);
  }
  function handleUpdateOpening(id: string, patch: Partial<Opening>) {
    setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function handleRemoveOpening(id: string) {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  }

  function applyReset() {
    loadSingleConfig(defaultConfig());
    setShowResetConfirm(false);
    flashStatus("Konfiguration wurde zurückgesetzt.");
    // Zurücksetzen ist genauso ein "selbst ein neues Projekt beginnen" wie
    // der allererste Aufruf (Jonas' Vorgabe 2026-07-25: "die
    // Grundeinstellungen sollen ... angezeigt werden, wenn der User im
    // Configurator selber ein neues Projekt beginnt") - deshalb auch hier
    // wieder abfragen, nicht nur beim ersten Laden ohne Cache.
    setShowGrundeinstellungen(true);
  }

  async function handleResetAndSave() {
    await handleDownload();
    applyReset();
  }

  function flashStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 4000);
  }

  async function handleDownload() {
    const safeName = sanitizeFileName(fileName);
    const blob = await encodeConfig(currentSingleConfig());
    downloadBlob(blob, `${safeName}${CONFIG_FILE_EXTENSION}`);
    flashStatus("Konfigurationsdatei wurde heruntergeladen.");
  }

  async function handleRequest() {
    const safeName = sanitizeFileName(fileName);
    const downloadFirst = window.confirm(
      "Soll die Konfigurationsdatei jetzt heruntergeladen werden, damit du sie der E-Mail anhängen kannst?",
    );
    if (downloadFirst) {
      const blob = await encodeConfig(currentSingleConfig());
      downloadBlob(blob, `${safeName}${CONFIG_FILE_EXTENSION}`);
    }

    const subject = `Anfrage Container-Konfiguration: ${safeName}`;
    const body = [
      "Hallo,",
      "",
      "ich möchte folgende Container-Konfiguration anfragen.",
      `Bitte die Datei "${safeName}${CONFIG_FILE_EXTENSION}" ${downloadFirst ? "(gerade heruntergeladen)" : "aus dem Konfigurator"} manuell an diese E-Mail anhängen, bevor du sie abschickst.`,
      "",
      `Containergröße: ${size.length} × ${size.width} × ${size.height} mm`,
      `Wandstärke: ${wallThickness} mm`,
      `Durchbrüche: ${openings.length}`,
      insideUnpainted ? "Innen: unlackiert" : null,
      outsideNotes.trim() ? `Sonderheiten Außen: ${outsideNotes.trim()}` : null,
      insideNotes.trim() ? `Sonderheiten Innen: ${insideNotes.trim()}` : null,
      "",
      "Mit freundlichen Grüßen",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  // Jonas' Vorgabe 2026-07-25: statt einer Seitennavigation schaltet
  // "Detail bearbeiten" jetzt einfach in den Einzelcontainer-Modus derselben
  // Seite um, mit der Instanz-Konfiguration vorgeladen - "Zurück zur
  // Baugruppe" (siehe handleBackToBaugruppe) schreibt gezielt wieder zurueck.
  function handleEditInstance(instance: ContainerInstance) {
    loadSingleConfig(instance.config);
    setEditingInstanceId(instance.id);
    setMode("single");
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
    const blob = await encodeProject(project);
    downloadBlob(blob, `${sanitizeFileName(project.name)}${PROJECT_FILE_EXTENSION}`);
  }

  // Baugruppen-Pendant zu handleRequest (Jonas' Vorgabe 2026-07-25: "Baugruppen
  // soll man auch anfragen können, genauso wie da jetzt ein Laden-Button ist,
  // kann auch genauso der Anfragen-Button [sein]") - gleiche Mechanik
  // (Datei zum Anhaengen herunterladen, dann mailto: mit Zusammenfassung).
  async function handleRequestProject() {
    const safeName = sanitizeFileName(project.name);
    const downloadFirst = window.confirm(
      "Soll die Projektdatei jetzt heruntergeladen werden, damit du sie der E-Mail anhängen kannst?",
    );
    if (downloadFirst) {
      const blob = await encodeProject(project);
      downloadBlob(blob, `${safeName}${PROJECT_FILE_EXTENSION}`);
    }

    const subject = `Anfrage Baugruppen-Projekt: ${safeName}`;
    const body = [
      "Hallo,",
      "",
      "ich möchte folgende Baugruppe (mehrere Container) anfragen.",
      `Bitte die Datei "${safeName}${PROJECT_FILE_EXTENSION}" ${downloadFirst ? "(gerade heruntergeladen)" : "aus dem Konfigurator"} manuell an diese E-Mail anhängen, bevor du sie abschickst.`,
      "",
      `Anzahl Container: ${project.instances.length}`,
      ...project.instances.map(
        (inst, i) => `Container ${i + 1} (${inst.label}): ${inst.config.size.length} × ${inst.config.size.width} × ${inst.config.size.height} mm`,
      ),
      "",
      "Mit freundlichen Grüßen",
    ].join("\n");

    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function applyResetProject() {
    setProject(emptyProject());
    setSelectedId(null);
    setShowResetProjectConfirm(false);
    // Siehe applyReset() - "Projekt zurücksetzen" ist ebenfalls ein
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
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {mode === "single" ? (
              <>
                {editingInstanceId && (
                  <AnimatedButton
                    type="button"
                    onClick={handleBackToBaugruppe}
                    className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                  >
                    <ArrowLeftIcon size={16} />
                    Zurück zur Baugruppe
                  </AnimatedButton>
                )}
                <AccordionSection title="Grundeinstellungen" defaultOpen tourId="tour-grundeinstellungen">
                  <ContainerSizeControls
                    size={size}
                    wallThickness={wallThickness}
                    onSizeChange={setSize}
                    onWallThicknessChange={setWallThickness}
                  />
                </AccordionSection>

                <AccordionSection title="Erweiterte Einstellungen" tourId="tour-darstellung">
                  <DisplaySettingsPanel
                    insideColor={insideColor}
                    onInsideColorChange={setInsideColor}
                    outsideColor={outsideColor}
                    onOutsideColorChange={setOutsideColor}
                    insideUnpainted={insideUnpainted}
                    onInsideUnpaintedChange={setInsideUnpainted}
                    outsideNotes={outsideNotes}
                    onOutsideNotesChange={setOutsideNotes}
                    insideNotes={insideNotes}
                    onInsideNotesChange={setInsideNotes}
                  />
                </AccordionSection>

                <AccordionSection title="Einbauten" defaultOpen tourId="tour-einbauten">
                  <OpeningsPanel size={size} openings={openings} onUpdate={handleUpdateOpening} onRemove={handleRemoveOpening} />
                </AccordionSection>

                <div data-tour="save-project" className="mt-4 space-y-2 pt-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Speichern &amp; Anfragen</p>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Dateiname"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <AnimatedButton
                      type="button"
                      onClick={handleDownload}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200"
                    >
                      <DownloadIcon size={16} />
                      Speichern
                    </AnimatedButton>
                    <AnimatedButton
                      type="button"
                      onClick={handleRequest}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                    >
                      <SendIcon size={16} />
                      Anfragen
                    </AnimatedButton>
                  </div>
                  <p className="text-xs text-slate-400">
                    „Speichern“ lädt die Konfiguration als Datei herunter, um sie später wieder zu laden. „Anfragen“ öffnet
                    zusätzlich eine E-Mail-Anfrage.
                  </p>
                  {statusMessage && <p className="text-xs text-brand-dark">{statusMessage}</p>}
                </div>
              </>
            ) : (
              <>
                <AccordionSection title="Grundeinstellungen" defaultOpen>
                  <label className="block text-xs text-slate-500">
                    Projektname
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                    />
                  </label>
                </AccordionSection>

                <AccordionSection title="Container" defaultOpen>
                  {project.instances.length === 0 && (
                    <p className="text-sm text-slate-400">Noch keine Container im Projekt.</p>
                  )}
                  <div className="space-y-2">
                    {project.instances.map((inst) => (
                      <div
                        key={inst.id}
                        onClick={() => setSelectedId(inst.id)}
                        className={`cursor-pointer rounded-lg border p-2.5 text-sm shadow-sm ${
                          selectedId === inst.id ? "border-brand bg-white" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={inst.label}
                            onChange={(e) => handleLabelChange(inst.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                          />
                          <AnimatedButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotate(inst.id);
                            }}
                            aria-label={`${inst.label} drehen`}
                            className="shrink-0 text-slate-400 hover:text-brand"
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
                            className="shrink-0 text-slate-400 hover:text-red-500"
                          >
                            <TrashIcon size={15} />
                          </AnimatedButton>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {inst.config.size.length} × {inst.config.size.width} mm · {inst.rotationY}°
                        </p>
                        <AnimatedButton
                          type="button"
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
                  <AccordionSection title="Ausrichten">
                    <label className="block text-xs text-slate-500">
                      Container
                      <select
                        value={alignTargetId ?? ""}
                        onChange={(e) => setAlignTargetId(e.target.value || null)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                      >
                        <option value="">– auswählen –</option>
                        {project.instances.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="mt-2 block text-xs text-slate-500">
                      relativ zu
                      <select
                        value={alignRefId ?? ""}
                        onChange={(e) => setAlignRefId(e.target.value || null)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
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
                          alignMode === "mate" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        Passend
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignMode("flush")}
                        className={`flex-1 rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                          alignMode === "flush" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        Fluchtend
                      </button>
                    </div>

                    {alignMode === "mate" ? (
                      <label className="mt-2 block text-xs text-slate-500">
                        Position
                        <select
                          value={alignSide}
                          onChange={(e) => setAlignSide(e.target.value as MateSide)}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                        >
                          <option value="left">rechts daneben</option>
                          <option value="right">links daneben</option>
                          <option value="top">darunter</option>
                          <option value="bottom">darüber</option>
                        </select>
                      </label>
                    ) : (
                      <label className="mt-2 block text-xs text-slate-500">
                        Achse
                        <select
                          value={alignAxis}
                          onChange={(e) => setAlignAxis(e.target.value as "x" | "z")}
                          className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                        >
                          <option value="x">horizontal (X)</option>
                          <option value="z">vertikal (Z)</option>
                        </select>
                      </label>
                    )}

                    <label className="mt-2 block text-xs text-slate-500">
                      Abstand (mm)
                      <input
                        type="number"
                        step={10}
                        value={alignDistance}
                        onChange={(e) => setAlignDistance(Number(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleApplyAlign}
                      className="mt-2 w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                    >
                      Anwenden
                    </button>
                    {alignError && <p className="mt-1 text-xs text-red-600">{alignError}</p>}
                  </AccordionSection>
                )}

                <div className="mt-4 space-y-2 pt-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Speichern, Laden &amp; Anfragen</p>
                  <div className="flex gap-2">
                    <AnimatedButton
                      type="button"
                      onClick={handleDownloadProject}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200"
                    >
                      <DownloadIcon size={16} />
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
                  {/* Baugruppen-Pendant zum Einzel-Modus (Jonas' Vorgabe
                      2026-07-25: "Baugruppen soll man auch anfragen können,
                      genauso wie da jetzt ein Laden-Button ist"). */}
                  <AnimatedButton
                    type="button"
                    onClick={handleRequestProject}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                  >
                    <SendIcon size={16} />
                    Anfragen
                  </AnimatedButton>
                  <p className="text-xs text-slate-400">
                    „Speichern“ lädt die Baugruppe als Datei herunter, um sie später wieder zu laden. „Anfragen“ öffnet
                    zusätzlich eine E-Mail-Anfrage.
                  </p>
                  {projectError && <p className="text-xs text-red-600">{projectError}</p>}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            {mode === "single" ? (
              <AnimatedButton
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                <RotateCcwIcon size={16} />
                Zurücksetzen
              </AnimatedButton>
            ) : (
              <AnimatedButton
                type="button"
                onClick={() => setShowResetProjectConfirm(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                <RotateCcwIcon size={16} />
                Projekt zurücksetzen
              </AnimatedButton>
            )}
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1">
          {mode === "single" ? (
            <>
              <Scene
                size={size}
                wallThickness={wallThickness}
                openings={openings}
                viewStyle={viewStyle}
                background={background}
                insideColor={insideColor}
                outsideColor={outsideColor}
                insideUnpainted={insideUnpainted}
                shadowsEnabled={shadowsEnabled}
                terrainDetail={terrainDetail}
                onViewStyleChange={setViewStyle}
                onBackgroundChange={setBackground}
                onShadowsEnabledChange={setShadowsEnabled}
                onTerrainDetailChange={setTerrainDetail}
                onUndo={handleUndoSingle}
                onRedo={handleRedoSingle}
                canUndo={singleUndoStack.length > 0}
                canRedo={singleRedoStack.length > 0}
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
                <AddOpeningPopup size={size} onAdd={handleAddOpening} onClose={() => setShowAddPopup(false)} />
              )}
            </>
          ) : (
            <>
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <AnimatedButton
                  type="button"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-white text-brand shadow-md hover:bg-brand hover:text-white"
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
                onUndo={handleUndoProject}
                onRedo={handleRedoProject}
                canUndo={projectUndoStack.length > 0}
                canRedo={projectRedoStack.length > 0}
                onPointerDown={(id, ground) => {
                  const inst = project.instances.find((i) => i.id === id);
                  if (!inst) return;
                  workspaceDragRef.current = {
                    id,
                    offsetXMm: ground.x * M_TO_MM - inst.position.x,
                    offsetZMm: ground.z * M_TO_MM - inst.position.z,
                    lastValidMm: { ...inst.position },
                  };
                  setDraggingId(id);
                  setDragValid(true);
                }}
                onPointerMove={(id, ground) => {
                  const drag = workspaceDragRef.current;
                  if (!drag || drag.id !== id) return;
                  const candidatePos = { x: ground.x * M_TO_MM - drag.offsetXMm, z: ground.z * M_TO_MM - drag.offsetZMm };
                  const inst = project.instances.find((i) => i.id === id);
                  if (!inst) return;
                  const candidate: OrientedRect = {
                    x: candidatePos.x,
                    z: candidatePos.z,
                    halfWidth: inst.config.size.length / 2,
                    halfDepth: inst.config.size.width / 2,
                    rotationDeg: inst.rotationY,
                  };
                  const others = project.instances.filter((i) => i.id !== id);
                  const valid = !collidesWithAny(candidate, others);
                  setDragValid(valid);
                  if (valid) drag.lastValidMm = candidatePos;
                  setProject((p) => ({
                    ...p,
                    instances: p.instances.map((i) => (i.id === id ? { ...i, position: candidatePos } : i)),
                  }));
                }}
                onPointerUp={(id) => {
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
                }}
              />
            </>
          )}
        </main>
      </div>

      {showGrundeinstellungen && <GrundeinstellungenOverlay mode={mode} onSubmit={handleGrundeinstellungenSubmit} />}

      {showResetConfirm && (
        <ThreeOptionConfirmDialog
          title="Zurücksetzen"
          message="Konfiguration wirklich zurücksetzen? Alle aktuellen Einstellungen und Durchbrüche gehen verloren."
          primaryLabel="Speichern & zurücksetzen"
          onPrimary={handleResetAndSave}
          confirmLabel="Ja, zurücksetzen"
          onConfirm={applyReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {showResetProjectConfirm && (
        <ThreeOptionConfirmDialog
          title="Zurücksetzen"
          message="Projekt wirklich zurücksetzen? Alle Container und deren Anordnung gehen verloren."
          primaryLabel="Speichern & zurücksetzen"
          onPrimary={handleResetProjectAndSave}
          confirmLabel="Ja, zurücksetzen"
          onConfirm={applyResetProject}
          onCancel={() => setShowResetProjectConfirm(false)}
        />
      )}

      {pendingModeSwitch && (
        <ThreeOptionConfirmDialog
          title="Modus wechseln"
          message={
            mode === "single"
              ? "Deine aktuelle Container-Konfiguration wird beim Wechsel automatisch als neuer Container in die Baugruppe übernommen. Falls du sie zusätzlich als eigene Datei sichern willst, tu das vorher."
              : "Dieses Projekt enthält bereits Container. Beim Wechsel bleibt es als Entwurf erhalten, aber falls du es behalten willst, lade es dir vorher als Datei herunter."
          }
          primaryLabel={mode === "single" ? "Speichern & übernehmen" : "Speichern & wechseln"}
          onPrimary={async () => {
            if (mode === "single") await handleDownload();
            else await handleDownloadProject();
            applyModeSwitch(pendingModeSwitch);
          }}
          confirmLabel={mode === "single" ? "Ja, übernehmen" : "Ja, wechseln"}
          onConfirm={() => applyModeSwitch(pendingModeSwitch)}
          onCancel={() => setPendingModeSwitch(null)}
        />
      )}
    </div>
  );
}
