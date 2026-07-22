import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Scene } from "../components/Scene";
import { OpeningsPanel } from "../components/OpeningsPanel";
import { OpeningsSummary } from "../components/OpeningsSummary";
import { AddOpeningPopup } from "../components/AddOpeningPopup";
import { ContainerSizeControls } from "../components/ContainerSizeControls";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { AccordionSection } from "../components/AccordionSection";
import { RAL_STANDARD_COLORS } from "../constants/ralColors";
import { DEFAULT_CONTAINER_SIZE, DEFAULT_WALL_THICKNESS, type ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, ViewStyle } from "../context/DisplaySettingsContext";
import type { ContainerConfig } from "../config/types";
import { CONFIG_FILE_EXTENSION, downloadBlob, encodeConfig, sanitizeFileName } from "../config/configFileCodec";
import { REQUEST_EMAIL } from "../config/requestEmail";
import { useTour } from "../tour/TourContext";
import { hasSeenTour } from "../tour/tourStore";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";

interface KonfiguratorPageProps {
  // "readonly" ersetzt die editierbare Seitenleiste durch eine reine
  // Detail-Auflistung (fuer den internen Mitarbeiter-Viewer, siehe
  // pages/InternalPage.tsx - "anstatt links die Sachen zur Konfig ... alle
  // Details wo was ist").
  mode?: "edit" | "readonly";
  initialConfig?: ContainerConfig;
  projectName?: string;
}

function defaultConfig(): ContainerConfig {
  return {
    size: DEFAULT_CONTAINER_SIZE,
    wallThickness: DEFAULT_WALL_THICKNESS,
    openings: [],
    viewStyle: "realistic",
    background: "studio",
    // RAL 7004 Signalgrau.
    insideColor: RAL_STANDARD_COLORS[1].hex,
    outsideColor: RAL_STANDARD_COLORS[1].hex,
  };
}

// Jonas' Vorgabe 2026-07-23: kein Server, kein Konto - eine Konfiguration
// wird als verschluesselte Datei heruntergeladen/eingelesen statt in einer
// Datenbank gespeichert. "Konfiguration laden" auf der Startseite navigiert
// hierher mit der eingelesenen Konfiguration als Router-State; initialConfig
// (Prop) hat Vorrang, weil der interne Viewer (InternalPage.tsx) darueber
// gezielt eine Konfiguration reinreicht.
export function KonfiguratorPage({ mode = "edit", initialConfig, projectName }: KonfiguratorPageProps) {
  const location = useLocation();
  const routeConfig = (location.state as { config?: ContainerConfig } | null)?.config;
  const seed = initialConfig ?? routeConfig ?? defaultConfig();
  const readOnly = mode === "readonly";

  const [size, setSize] = useState<ContainerSize>(seed.size);
  const [wallThickness, setWallThickness] = useState(seed.wallThickness);
  const [openings, setOpenings] = useState<Opening[]>(seed.openings);
  const [showAddPopup, setShowAddPopup] = useState(false);

  const [viewStyle, setViewStyle] = useState<ViewStyle>(seed.viewStyle);
  const [background, setBackground] = useState<BackgroundStyle>(seed.background);
  const [outsideColor, setOutsideColor] = useState(seed.outsideColor);
  const [insideColor, setInsideColor] = useState(seed.insideColor);

  const [fileName, setFileName] = useState("Container-Konfiguration");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { start: startTour } = useTour();
  useEffect(() => {
    // Automatisch nur beim allerersten Aufruf des Konfigurators (Jonas'
    // Vorgabe 2026-07-22) - danach nur noch ueber den "?"-Button.
    if (mode === "edit" && !hasSeenTour(CONFIGURATOR_TOUR_ID)) {
      startTour(CONFIGURATOR_TOUR_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAdd(opening: Opening) {
    setOpenings((prev) => [...prev, opening]);
  }

  function handleUpdate(id: string, patch: Partial<Opening>) {
    setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleRemove(id: string) {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  }

  function currentConfig(): ContainerConfig {
    return { size, wallThickness, openings, viewStyle, background, insideColor, outsideColor };
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
      "",
      "Mit freundlichen Grüßen",
    ].join("\n");

    window.location.href = `mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      {!readOnly && <div className="h-1.5 bg-brand-light" />}
      <header className="flex items-center border-b border-slate-200 px-6 py-3">
        <h1 className="font-heading text-lg font-bold uppercase tracking-wide text-brand-dark">
          {projectName ?? (
            <>
              Schallschutz-Sondercontainer <span className="text-brand-light">–</span> 3D-Konfigurator
            </>
          )}
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-4 py-4">
          {readOnly ? (
            <>
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
              <AccordionSection title="Darstellung">
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <dt className="text-slate-400">Außenfarbe</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: outsideColor }} />
                    {outsideColor}
                  </dd>
                  <dt className="text-slate-400">Innenfarbe</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: insideColor }} />
                    {insideColor}
                  </dd>
                </dl>
              </AccordionSection>
              <AccordionSection title="Einbauten" defaultOpen>
                <OpeningsSummary openings={openings} />
              </AccordionSection>
            </>
          ) : (
            <>
              <AccordionSection title="Grundeinstellungen" defaultOpen tourId="tour-grundeinstellungen">
                <ContainerSizeControls
                  size={size}
                  wallThickness={wallThickness}
                  onSizeChange={setSize}
                  onWallThicknessChange={setWallThickness}
                />
              </AccordionSection>

              <AccordionSection title="Darstellung" tourId="tour-darstellung">
                <DisplaySettingsPanel
                  viewStyle={viewStyle}
                  onViewStyleChange={setViewStyle}
                  background={background}
                  onBackgroundChange={setBackground}
                  insideColor={insideColor}
                  onInsideColorChange={setInsideColor}
                  outsideColor={outsideColor}
                  onOutsideColorChange={setOutsideColor}
                />
              </AccordionSection>

              <AccordionSection title="Einbauten" defaultOpen tourId="tour-einbauten">
                <OpeningsPanel
                  size={size}
                  openings={openings}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onOpenAdd={() => setShowAddPopup(true)}
                />
              </AccordionSection>

              <div data-tour="save-project" className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Speichern &amp; Anfragen</p>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Dateiname"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={handleRequest}
                    className="flex-1 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                  >
                    Anfragen
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  „Speichern“ lädt die Konfiguration als Datei herunter, um sie später wieder zu laden. „Anfragen“ öffnet
                  zusätzlich eine E-Mail-Anfrage.
                </p>
                {statusMessage && <p className="text-xs text-brand-dark">{statusMessage}</p>}
              </div>
            </>
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
          />
          {!readOnly && showAddPopup && (
            <AddOpeningPopup size={size} onAdd={handleAdd} onClose={() => setShowAddPopup(false)} />
          )}
        </main>
      </div>
    </div>
  );
}
