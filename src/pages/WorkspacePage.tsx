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
import type { Opening } from "../types/openings";
import type { ContainerConfig } from "../config/types";
import { CONFIG_FILE_EXTENSION, decodeConfig, downloadBlob, encodeConfig, sanitizeFileName } from "../config/configFileCodec";
import { REQUEST_EMAIL } from "../config/requestEmail";
import { defaultConfig } from "../config/defaultContainerConfig";
import type { ContainerInstance, ProjectConfig } from "../config/projectTypes";
import { hasMeaningfulProjectDraft, loadProjectDraft, saveProjectDraft } from "../config/projectDraftStore";
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
  const routeState = location.state as { project?: ProjectConfig; fresh?: boolean } | null;
  const routeProject = routeState?.project;
  // "Konfiguration starten" auf der Startseite setzt "fresh", damit IMMER
  // ein neues, leeres Projekt beginnt statt (versehentlich) den Cache
  // wiederherzustellen - der Cache bleibt dem expliziten "Aus Cache laden"
  // vorbehalten. Ohne jeden State (z. B. Neuladen der Seite waehrend der
  // Arbeit) greift weiterhin der Cache als Absturz-Sicherheitsnetz.
  const forceFresh = routeState?.fresh === true;

  const [project, setProject] = useState<ProjectConfig>(() => {
    if (routeProject) return routeProject;
    if (forceFresh) return emptyProject();
    return loadProjectDraft() ?? emptyProject();
  });
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

  // Falls gesetzt: zeigt die Detailbearbeitung EINER Container-Instanz statt
  // der Projekt-Uebersicht - "Zurück zur Baugruppe" schaltet einfach wieder
  // zurueck, ohne dass dabei irgendetwas gesondert uebernommen werden muss
  // (die Instanz wurde waehrend der Bearbeitung schon laufend aktualisiert).
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const editingInstance = project.instances.find((i) => i.id === editingInstanceId) ?? null;
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    saveProjectDraft(project);
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
    const safeName = sanitizeFileName(editingInstance.label);
    const blob = await encodeConfig(editingInstance.config);
    downloadBlob(blob, `${safeName}${CONFIG_FILE_EXTENSION}`);
    flashStatus("Konfigurationsdatei wurde heruntergeladen.");
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
    const blob = await encodeProject(project);
    downloadBlob(blob, `${sanitizeFileName(project.name)}${PROJECT_FILE_EXTENSION}`);
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
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {editingInstance ? (
              <>
                <AnimatedButton
                  type="button"
                  data-tour="back-to-project"
                  onClick={handleBackToBaugruppe}
                  className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                >
                  <ArrowLeftIcon size={16} />
                  Zurück zur Baugruppe
                </AnimatedButton>

                <AccordionSection title="Grundeinstellungen" defaultOpen tourId="tour-grundeinstellungen">
                  <label className="mb-3 block text-xs text-slate-500">
                    Bezeichnung
                    <input
                      type="text"
                      value={editingInstance.label}
                      onChange={(e) => handleLabelChange(editingInstance.id, e.target.value)}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
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
                  />
                </AccordionSection>

                <AccordionSection title="Erweiterte Einstellungen" tourId="tour-darstellung">
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

                <AccordionSection title="Einbauten" defaultOpen tourId="tour-einbauten">
                  <OpeningsPanel
                    size={editingInstance.config.size}
                    openings={editingInstance.config.openings}
                    onUpdate={handleUpdateOpening}
                    onRemove={handleRemoveOpening}
                  />
                </AccordionSection>

                <div data-tour="save-project" className="mt-6 space-y-2 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Speichern</p>
                  <AnimatedButton
                    type="button"
                    onClick={handleDownloadInstance}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200"
                  >
                    <DownloadIcon size={16} />
                    Speichern
                  </AnimatedButton>
                  <p className="text-xs text-slate-400">
                    „Speichern“ lädt diesen Container als Datei herunter, um ihn später wieder zu laden.
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
                  <label className="mt-2 block text-xs text-slate-500">
                    Standort (optional)
                    <input
                      type="text"
                      value={project.standort ?? ""}
                      onChange={(e) => setProject((p) => ({ ...p, standort: e.target.value || undefined }))}
                      placeholder="z. B. Musterstadt"
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

                <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Speichern, Laden &amp; Anfragen</p>
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
            {editingInstance ? (
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
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
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

      {showGrundeinstellungen && <GrundeinstellungenOverlay onSubmit={handleGrundeinstellungenSubmit} />}

      {showResetConfirm && (
        <ThreeOptionConfirmDialog
          title="Zurücksetzen"
          message="Container wirklich zurücksetzen? Alle aktuellen Einstellungen und Durchbrüche gehen verloren."
          primaryLabel="Speichern & zurücksetzen"
          onPrimary={handleResetInstanceAndSave}
          confirmLabel="Ja, zurücksetzen"
          onConfirm={applyResetInstance}
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
    </div>
  );
}
