import { useState } from "react";
import { Scene } from "../components/Scene";
import { OpeningsPanel } from "../components/OpeningsPanel";
import { OpeningsSummary } from "../components/OpeningsSummary";
import { AddOpeningPopup } from "../components/AddOpeningPopup";
import { ContainerSizeControls } from "../components/ContainerSizeControls";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { AccordionSection } from "../components/AccordionSection";
import { getStandardColors } from "../admin/standardsStore";
import { DEFAULT_CONTAINER_SIZE, DEFAULT_WALL_THICKNESS, type ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, ViewStyle } from "../context/DisplaySettingsContext";
import type { ProjectConfig } from "../projects/types";
import { createProject } from "../projects/mockProjectStore";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "../layout/AuthPopoverContext";

interface KonfiguratorPageProps {
  // "readonly" ersetzt die editierbare Seitenleiste durch eine reine
  // Detail-Auflistung (Jonas' Vorgabe 2026-07-22: Konstrukteur-Viewer zeigt
  // "anstatt links die Sachen zur Konfig ... alle Details wo was ist").
  mode?: "edit" | "readonly";
  initialConfig?: ProjectConfig;
  projectName?: string;
}

function defaultConfig(): ProjectConfig {
  const standardColors = getStandardColors();
  return {
    size: DEFAULT_CONTAINER_SIZE,
    wallThickness: DEFAULT_WALL_THICKNESS,
    openings: [],
    viewStyle: "realistic",
    background: "studio",
    // RAL 7004 Signalgrau, falls vorhanden, sonst erste Standardfarbe.
    insideColor: standardColors[1]?.hex ?? standardColors[0].hex,
    outsideColor: standardColors[1]?.hex ?? standardColors[0].hex,
  };
}

export function KonfiguratorPage({ mode = "edit", initialConfig, projectName }: KonfiguratorPageProps) {
  const seed = initialConfig ?? defaultConfig();
  const readOnly = mode === "readonly";

  const [size, setSize] = useState<ContainerSize>(seed.size);
  const [wallThickness, setWallThickness] = useState(seed.wallThickness);
  const [openings, setOpenings] = useState<Opening[]>(seed.openings);
  const [showAddPopup, setShowAddPopup] = useState(false);

  const [viewStyle, setViewStyle] = useState<ViewStyle>(seed.viewStyle);
  const [background, setBackground] = useState<BackgroundStyle>(seed.background);
  const [outsideColor, setOutsideColor] = useState(seed.outsideColor);
  const [insideColor, setInsideColor] = useState(seed.insideColor);

  const { user } = useAuth();
  const { open: openAuthPopover } = useAuthPopover();
  const [saveName, setSaveName] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleAdd(opening: Opening) {
    setOpenings((prev) => [...prev, opening]);
  }

  function handleUpdate(id: string, patch: Partial<Opening>) {
    setOpenings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleRemove(id: string) {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  }

  function handleSaveProject() {
    if (!user) {
      openAuthPopover();
      return;
    }
    const name = saveName.trim() || "Unbenanntes Projekt";
    createProject(name, user.id, {
      size,
      wallThickness,
      openings,
      viewStyle,
      background,
      insideColor,
      outsideColor,
    });
    setSaveName("");
    setSavedMessage(`„${name}“ wurde gespeichert.`);
    window.setTimeout(() => setSavedMessage(null), 4000);
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
              <AccordionSection title="Grundeinstellungen" defaultOpen>
                <ContainerSizeControls
                  size={size}
                  wallThickness={wallThickness}
                  onSizeChange={setSize}
                  onWallThicknessChange={setWallThickness}
                />
              </AccordionSection>

              <AccordionSection title="Darstellung">
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

              <AccordionSection title="Einbauten" defaultOpen>
                <OpeningsPanel
                  size={size}
                  openings={openings}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onOpenAdd={() => setShowAddPopup(true)}
                />
              </AccordionSection>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Projekt speichern</p>
                {user ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Projektname"
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProject}
                      className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
                    >
                      Projekt anfragen
                    </button>
                    {savedMessage && <p className="text-xs text-brand-dark">{savedMessage}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Zum Speichern/Anfragen eines Projekts bitte{" "}
                    <button type="button" onClick={openAuthPopover} className="font-medium text-brand underline">
                      registrieren oder anmelden
                    </button>
                    .
                  </p>
                )}
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
