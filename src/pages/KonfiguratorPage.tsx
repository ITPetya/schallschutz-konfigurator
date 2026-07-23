import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Scene } from "../components/Scene";
import { OpeningsPanel } from "../components/OpeningsPanel";
import { OpeningsSummary } from "../components/OpeningsSummary";
import { AddOpeningPopup } from "../components/AddOpeningPopup";
import { ContainerSizeControls } from "../components/ContainerSizeControls";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { AccordionSection } from "../components/AccordionSection";
import { AnimatedButton } from "../components/AnimatedButton";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";
import type { ContainerConfig } from "../config/types";
import { CONFIG_FILE_EXTENSION, downloadBlob, encodeConfig, sanitizeFileName } from "../config/configFileCodec";
import { REQUEST_EMAIL } from "../config/requestEmail";
import { loadDraft, saveDraft } from "../config/draftStore";
import { updateProjectInstanceConfig } from "../config/projectDraftStore";
import { defaultConfig } from "../config/defaultContainerConfig";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { useTour } from "../tour/TourContext";
import { hasSeenTour } from "../tour/tourStore";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { PlusIcon } from "../components/icons/PlusIcon";
import { RotateCcwIcon } from "../components/icons/RotateCcwIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { SendIcon } from "../components/icons/SendIcon";
import { ThreeOptionConfirmDialog } from "../components/ThreeOptionConfirmDialog";
import { useModeSwitch } from "../context/ModeSwitchContext";

interface KonfiguratorPageProps {
  // "readonly" ersetzt die editierbare Seitenleiste durch eine reine
  // Detail-Auflistung (fuer den internen Mitarbeiter-Viewer, siehe
  // pages/InternalPage.tsx - "anstatt links die Sachen zur Konfig ... alle
  // Details wo was ist").
  mode?: "edit" | "readonly";
  initialConfig?: ContainerConfig;
  projectName?: string;
}

// Jonas' Vorgabe 2026-07-23: kein Server, kein Konto - eine Konfiguration
// wird als verschluesselte Datei heruntergeladen/eingelesen statt in einer
// Datenbank gespeichert. "Konfiguration laden" auf der Startseite navigiert
// hierher mit der eingelesenen Konfiguration als Router-State; initialConfig
// (Prop) hat Vorrang, weil der interne Viewer (InternalPage.tsx) darueber
// gezielt eine Konfiguration reinreicht.
export function KonfiguratorPage({ mode = "edit", initialConfig, projectName }: KonfiguratorPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { config?: ContainerConfig; returnToProject?: { instanceId: string } } | null;
  const routeConfig = routeState?.config;
  // Baugruppen-Feature (Nacht-Session 2026-07-23): wenn ProjectPage hierher
  // navigiert, um EINE Container-Instanz im normalen Konfigurator zu
  // bearbeiten, haengt sie diese Info an den Router-State - "Zurück zum
  // Projekt" schreibt dann die bearbeitete Config gezielt in genau diese
  // Instanz zurueck (siehe projectDraftStore.ts), statt eine neue Instanz
  // oder ein neues Projekt anzulegen.
  const returnToProject = routeState?.returnToProject;
  // Zwischengespeicherter Entwurf (Jonas' Vorgabe 2026-07-23: "falls
  // irgendwas abstürzt immer ein Zwischenstand noch da") hat Vorrang vor dem
  // leeren Default, aber NICHT vor einer explizit uebergebenen/geladenen
  // Konfiguration - und ist nur im editierbaren Modus relevant, nicht im
  // schreibgeschuetzten internen Viewer.
  const draftConfig = mode === "edit" ? loadDraft() : null;
  const seed = initialConfig ?? routeConfig ?? draftConfig ?? defaultConfig();
  const readOnly = mode === "readonly";

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
  // Jonas' Vorgabe 2026-07-24: statt window.confirm() ein richtiger Dialog
  // mit drei Optionen (Ja / Nein / Speichern-und-Ja).
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Ziel eines angefragten Moduswechsels, waehrend die Sicherheitsabfrage
  // sichtbar ist (Jonas' Vorgabe 2026-07-25) - null heisst "kein Wechsel
  // angefragt/Dialog zu".
  const [modeSwitchTarget, setModeSwitchTarget] = useState<string | null>(null);

  const { start: startTour } = useTour();
  const { registerGuard } = useModeSwitch();
  // Registriert bei JEDER relevanten Zustandsaenderung neu (gleiche
  // Abhaengigkeiten wie der Autosave-Effekt darunter), damit der Guard immer
  // den AKTUELLEN Stand sieht: nur wenn die Konfiguration von der leeren
  // Default-Konfiguration abweicht, wird der Moduswechsel-Dialog gezeigt -
  // ein frisch geoeffneter, unveraenderter Konfigurator wechselt sofort ohne
  // Nachfrage.
  useEffect(() => {
    if (mode !== "edit") return;
    registerGuard((targetPath) => {
      const isDefault = JSON.stringify(currentConfig()) === JSON.stringify(defaultConfig());
      if (isDefault) {
        navigate(targetPath);
      } else {
        setModeSwitchTarget(targetPath);
      }
    });
    return () => registerGuard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
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
    // Automatisch nur beim allerersten Aufruf des Konfigurators (Jonas'
    // Vorgabe 2026-07-22) - danach nur noch ueber den "?"-Button.
    if (mode === "edit" && !hasSeenTour(CONFIGURATOR_TOUR_ID)) {
      startTour(CONFIGURATOR_TOUR_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Laufende Zwischensicherung bei jeder Aenderung (Jonas' Vorgabe
  // 2026-07-23) - unabhaengig vom manuellen "Speichern"-Dateidownload.
  useEffect(() => {
    if (mode !== "edit") return;
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
    mode,
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

  function handleAdd(opening: Opening) {
    setOpenings((prev) => [...prev, opening]);
  }

  function handleUpdate(id: string, patch: Partial<Opening>) {
    setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleRemove(id: string) {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  }

  // Jonas' Vorgabe 2026-07-24: Button zum Zuruecksetzen sitzt jetzt fest
  // unten in der Seitenleiste (nicht mehr im Viewer, siehe <aside> unten)
  // und oeffnet einen richtigen Dialog mit drei Optionen statt window.confirm().
  // Ueberschreibt auch den Autosave-Entwurf, da der useEffect oben nach dem
  // Reset automatisch mit den neuen (Default-)Werten erneut feuert - kein
  // manuelles saveDraft() hier noetig.
  function applyReset() {
    const fresh = defaultConfig();
    setSize(fresh.size);
    setWallThickness(fresh.wallThickness);
    setOpenings(fresh.openings);
    setViewStyle(fresh.viewStyle);
    setBackground(fresh.background);
    setInsideColor(fresh.insideColor);
    setOutsideColor(fresh.outsideColor);
    setShadowsEnabled(fresh.shadowsEnabled ?? true);
    setTerrainDetail(fresh.terrainDetail ?? "low");
    setInsideUnpainted(fresh.insideUnpainted ?? false);
    setOutsideNotes(fresh.outsideNotes ?? "");
    setInsideNotes(fresh.insideNotes ?? "");
    setShowResetConfirm(false);
    flashStatus("Konfiguration wurde zurückgesetzt.");
  }

  async function handleResetAndSave() {
    await handleDownload();
    applyReset();
  }

  function currentConfig(): ContainerConfig {
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

  function handleBackToProject() {
    if (returnToProject) {
      updateProjectInstanceConfig(returnToProject.instanceId, currentConfig());
    }
    navigate("/projekt");
  }

  function flashStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 4000);
  }

  async function handleDownload() {
    const safeName = sanitizeFileName(fileName);
    const blob = await encodeConfig(currentConfig());
    downloadBlob(blob, `${safeName}${CONFIG_FILE_EXTENSION}`);
    flashStatus("Konfigurationsdatei wurde heruntergeladen.");
  }

  // Jonas' Vorgabe 2026-07-23: "es soll auch einen Button Anfragen geben, da
  // wird dann ein mailto geoeffnet ... parallel soll gefragt werden ob die
  // Konfigdatei heruntergeladen werden soll." mailto: kann selbst KEINEN
  // Dateianhang setzen (von Browsern aus Sicherheitsgruenden nicht
  // unterstuetzt) - deshalb wird die Datei bei Bedarf heruntergeladen und die
  // E-Mail fordert im Text explizit zum manuellen Anhaengen auf.
  async function handleRequest() {
    const safeName = sanitizeFileName(fileName);
    const downloadFirst = window.confirm(
      "Soll die Konfigurationsdatei jetzt heruntergeladen werden, damit du sie der E-Mail anhängen kannst?",
    );
    if (downloadFirst) {
      const blob = await encodeConfig(currentConfig());
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

  return (
    // Kein eigener Header/Accent-Bar mehr hier (Jonas' Fehlerbericht
    // 2026-07-23: "zwei horizontale Linien in der Kopfzeile") - AppShell
    // stellt bereits fuer JEDE Seite eine Kopfzeile, diese hier war eine
    // zweite, redundante Kopfzeile direkt darunter. Der projectName (im
    // readonly-Viewer der Dateiname) steht stattdessen als schlichte
    // Unterueberschrift oben in der Seitenleiste.
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        {/* Jonas' Vorgabe 2026-07-24: "Zurücksetzen" fest unten in der
            Seitenleiste statt als eigener Viewer-Button - deshalb ist die
            Seitenleiste jetzt selbst ein flex-col: der Akkordeon-Bereich
            scrollt (flex-1 overflow-y-auto), der Reset-Button darunter
            bleibt als eigener, nicht scrollender Footer immer sichtbar. */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {readOnly ? (
            <>
              {projectName && <p className="mb-3 truncate text-sm font-bold text-brand-dark">{projectName}</p>}
              <AccordionSection title="Grundeinstellungen" defaultOpen>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <dt className="text-slate-400">Länge</dt>
                  <dd>{size.length} mm</dd>
                  <dt className="text-slate-400">Breite</dt>
                  <dd>{size.width} mm</dd>
                  <dt className="text-slate-400">Höhe</dt>
                  <dd>{size.height} mm</dd>
                  <dt className="text-slate-400">Wandstärke</dt>
                  <dd>{wallThickness} mm</dd>
                </dl>
              </AccordionSection>
              <AccordionSection title="Erweiterte Einstellungen">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <dt className="text-slate-400">Außenfarbe</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: outsideColor }} />
                    {outsideColor}
                  </dd>
                  <dt className="text-slate-400">Innenfarbe</dt>
                  <dd className="flex items-center gap-1.5">
                    {insideUnpainted ? (
                      "Unlackiert"
                    ) : (
                      <>
                        <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: insideColor }} />
                        {insideColor}
                      </>
                    )}
                  </dd>
                </dl>
                {outsideNotes.trim() && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Sonderheiten Außen:</span> {outsideNotes}
                  </p>
                )}
                {insideNotes.trim() && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Sonderheiten Innen:</span> {insideNotes}
                  </p>
                )}
              </AccordionSection>
              <AccordionSection title="Einbauten" defaultOpen>
                <OpeningsSummary openings={openings} />
              </AccordionSection>
            </>
          ) : (
            <>
              {returnToProject && (
                <AnimatedButton
                  type="button"
                  onClick={handleBackToProject}
                  className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
                >
                  <ArrowLeftIcon size={16} />
                  Zurück zum Projekt
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
                <OpeningsPanel size={size} openings={openings} onUpdate={handleUpdate} onRemove={handleRemove} />
              </AccordionSection>

              {/* Kein eigener border-t hier (Jonas' Fehlerbericht 2026-07-23:
                  "eine Trennlinie zu viel") - die AccordionSection "Einbauten"
                  direkt darueber hat bereits einen border-b, der reicht. */}
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
          )}
        </div>
        {!readOnly && (
          <div className="border-t border-slate-200 p-3">
            <AnimatedButton
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              <RotateCcwIcon size={16} />
              Zurücksetzen
            </AnimatedButton>
          </div>
        )}
        </aside>

        {/* min-w-0/min-h-0 sind noetig, nicht nur kosmetisch (Jonas'
            Fehlerbericht 2026-07-22): ohne das erlaubt Flexbox einem Flex-Kind
            standardmaessig nicht, unter die intrinsische Groesse seines
            eigenen Inhalts zu schrumpfen - der Canvas hat kurz nach einem
            Resize eine intrinsische Groesse, die genau diesen Bug ausloest
            (Fenster verkleinern nach vorherigem Vergroessern haengt fest). */}
        <main className="relative min-h-0 min-w-0 flex-1">
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
            onViewStyleChange={readOnly ? undefined : setViewStyle}
            onBackgroundChange={readOnly ? undefined : setBackground}
            onShadowsEnabledChange={readOnly ? undefined : setShadowsEnabled}
            onTerrainDetailChange={readOnly ? undefined : setTerrainDetail}
          />
          {/* Jonas' Vorgabe 2026-07-24: "+"-Button fuer neue Durchbrueche
              zieht aus der Seitenleiste hierher, oben links im Viewer -
              gleiche Ecke, in der sich das Popup danach oeffnet. Waehrend
              das Popup offen ist, ersetzt es den Button (statt sich zu
              ueberlappen). */}
          {!readOnly && !showAddPopup && (
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
          {!readOnly && showAddPopup && (
            <AddOpeningPopup size={size} onAdd={handleAdd} onClose={() => setShowAddPopup(false)} />
          )}
        </main>
      </div>

      {/* Jonas' Vorgabe 2026-07-24: statt window.confirm() ein richtiger
          Dialog mit drei Optionen - Nein (abbrechen), Ja (nur zuruecksetzen),
          Speichern & Zuruecksetzen (erst als Datei sichern, dann zuruecksetzen). */}
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

      {/* Moduswechsel-Sicherheitshinweis (Jonas' Vorgabe 2026-07-25): wenn
          man schon eine nicht-triviale Einzelcontainer-Konfiguration hat und
          in den Baugruppen-Modus wechseln will, dieselbe Speichern/Verwerfen-
          Erinnerung wie beim Zuruecksetzen - siehe registerGuard-Effekt oben. */}
      {modeSwitchTarget && (
        <ThreeOptionConfirmDialog
          title="Modus wechseln"
          message="Du hast bereits einen Container konfiguriert. Beim Wechsel bleibt die Konfiguration zwar als Entwurf erhalten, aber falls du sie behalten willst, lade sie dir vorher als Datei herunter."
          primaryLabel="Speichern & wechseln"
          onPrimary={async () => {
            await handleDownload();
            navigate(modeSwitchTarget);
          }}
          confirmLabel="Ja, wechseln"
          onConfirm={() => navigate(modeSwitchTarget)}
          onCancel={() => setModeSwitchTarget(null)}
        />
      )}
    </div>
  );
}
