import { useRef, useState } from "react";
import type * as THREE from "three";
import { Scene } from "../components/Scene";
import { OpeningsSummary } from "../components/OpeningsSummary";
import { KundenverlaufSection } from "../components/KundenverlaufSection";
import { AccordionSection } from "../components/AccordionSection";
import { AnimatedButton } from "../components/AnimatedButton";
import { ViewerSidebarLayout } from "../components/ViewerSidebarLayout";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";
import { DownloadIcon } from "../components/icons/DownloadIcon";
import { LoadingIcon } from "../components/LoadingIcon";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { ContainerConfig } from "../config/types";
import type { KundenverlaufEintrag } from "../config/kundenverlauf";
import { DEFAULT_FLOOR_THICKNESS, DEFAULT_SOUND_CLASS, SOUND_CLASSES, defaultFloorInsulated } from "../constants/lcStandard";
import { getRalNameForHex } from "../constants/ralColors";
import { sanitizeFileName, downloadBlob } from "../config/configFileCodec";
import { exportGroupAsGlb } from "../utils/exportGlb";

interface KonfiguratorPageProps {
  // Seit der Nacht-Session 2026-07-25 uebernimmt WorkspacePage.tsx den
  // editierbaren Konfigurator komplett (Einzelcontainer UND Baugruppe in
  // einer Seite mit gemeinsamem 3D-Viewer, siehe dort) - diese Komponente
  // wird nur noch als schreibgeschuetzter Detail-Viewer gebraucht (siehe
  // pages/InternalPage.tsx: "anstatt links die Sachen zur Konfig ... alle
  // Details wo was ist"), deshalb kein "mode"-Prop/editierbarer Zweig mehr.
  initialConfig: ContainerConfig;
  projectName?: string;
  // Gesetzt, wenn dieser Container aus einer Baugruppe heraus geoeffnet
  // wurde (Jonas' Vorgabe 2026-07-25: "man soll auch die einzelnen
  // Container aus den Baugruppen öffnen können" im Konstrukteur-Viewer) -
  // zeigt einen Zurueck-Link statt einer zweiten Kopfzeile, siehe
  // "Zurück zur Baugruppe" in WorkspacePage.tsx fuer denselben Stil.
  onBack?: () => void;
  backLabel?: string;
  // Jonas' Vorgabe 2026-08-17: der eingebettete Kundenverlauf (siehe
  // config/kundenverlauf.ts) darf NUR im internen Bereich sichtbar sein -
  // deshalb explizit von aussen uebergeben statt selbst aus initialConfig
  // gelesen (beim Drill-in aus einem Projekt heraus sitzt der Verlauf auf
  // der ProjectConfig, nicht auf der einzelnen ContainerConfig der Instanz,
  // siehe InternalPage.tsx). ProjectViewerPage.tsx (oeffentliches /ansehen)
  // laesst das Prop bewusst weg.
  kundenverlauf?: KundenverlaufEintrag[];
  // Jonas' Vorgabe 2026-08-25: Modell-Export (GLB, spaeter 3D-PDF/STEP) nur
  // im internen Bereich anbieten, NICHT auf der oeffentlichen /ansehen-Seite -
  // gleiches Muster wie kundenverlauf oben: InternalPage.tsx setzt es,
  // ProjectViewerPage.tsx laesst es bewusst weg.
  showExport?: boolean;
}

// Reiner schreibgeschuetzter Detail-Viewer fuer eine geladene .sszkonfig
// (siehe InternalPage.tsx) - zeigt Groesse, Farben und Einbauten als reine
// Auflistung statt editierbarer Felder, ohne eigene Speicher-/Reset-/
// Moduswechsel-Logik (die gibt es nur im editierbaren WorkspacePage.tsx).
export function KonfiguratorPage({ initialConfig, projectName, onBack, backLabel, kundenverlauf, showExport }: KonfiguratorPageProps) {
  const config = initialConfig;

  // Jonas' Vorgabe 2026-08-25 (GLB-Export, nur im internen Bereich, siehe
  // showExport oben): Scene.tsx fuellt diese Ref mit einer Gruppe, die NUR
  // die exportwuerdige Container-Geometrie enthaelt.
  const exportGroupRef = useRef<THREE.Group>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExportGlb() {
    if (!exportGroupRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportGroupAsGlb(exportGroupRef.current);
      downloadBlob(blob, `${sanitizeFileName(projectName ?? "container")}.glb`);
    } catch {
      setExportError("Export fehlgeschlagen.");
    } finally {
      setExporting(false);
    }
  }

  const [size] = useState<ContainerSize>(config.size);
  const [wallThickness] = useState(config.wallThickness);
  const [openings] = useState<Opening[]>(config.openings);
  const [outsideColor] = useState(config.outsideColor);
  const [insideColor] = useState(config.insideColor);
  const [insideUnpainted] = useState(config.insideUnpainted ?? false);
  const [outsideNotes] = useState(config.outsideNotes ?? "");
  const [insideNotes] = useState(config.insideNotes ?? "");
  const [soundClass] = useState(config.soundClass ?? DEFAULT_SOUND_CLASS);
  const [floorThickness] = useState(config.floorThickness ?? DEFAULT_FLOOR_THICKNESS);
  const [floorInsulated] = useState(config.floorInsulated ?? defaultFloorInsulated(soundClass));
  const [partitionWalls] = useState(config.partitionWalls ?? []);
  const soundClassSpec = SOUND_CLASSES.find((c) => c.id === soundClass) ?? SOUND_CLASSES[0];

  return (
    // Kein eigener Header/Accent-Bar mehr hier (Jonas' Fehlerbericht
    // 2026-07-23: "zwei horizontale Linien in der Kopfzeile") - AppShell
    // stellt bereits fuer JEDE Seite eine Kopfzeile, diese hier war eine
    // zweite, redundante Kopfzeile direkt darunter. projectName (der
    // Dateiname der geladenen .sszkonfig) steht stattdessen als schlichte
    // Unterueberschrift oben in der Seitenleiste.
    <div className="flex h-full flex-col bg-white text-ink dark:bg-slate-900 dark:text-slate-100">
      <ViewerSidebarLayout
        sidebar={
          <>
            {onBack && (
              <AnimatedButton
                type="button"
                onClick={onBack}
                className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
              >
                <ArrowLeftIcon size={16} />
                {backLabel ?? "Zurück"}
              </AnimatedButton>
            )}
            {projectName && <p className="mb-3 truncate text-sm font-bold text-brand-dark">{projectName}</p>}
            <AccordionSection title="Grundeinstellungen" defaultOpen>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                <dt className="text-slate-400 dark:text-slate-500">Länge</dt>
                <dd>{size.length} mm</dd>
                <dt className="text-slate-400 dark:text-slate-500">Breite</dt>
                <dd>{size.width} mm</dd>
                <dt className="text-slate-400 dark:text-slate-500">Höhe</dt>
                <dd>{size.height} mm</dd>
                <dt className="text-slate-400 dark:text-slate-500">Wandstärke</dt>
                <dd>{wallThickness} mm</dd>
                <dt className="text-slate-400 dark:text-slate-500">Bodenstärke</dt>
                <dd>{floorThickness} mm</dd>
                <dt className="text-slate-400 dark:text-slate-500">Bodenisolierung</dt>
                <dd>{floorInsulated ? `Ja (${floorThickness} mm gefüllt)` : `Nein (${floorThickness} mm hohl)`}</dd>
                <dt className="text-slate-400 dark:text-slate-500">Schallschutz</dt>
                <dd>
                  {soundClassSpec.label} ({soundClassSpec.rangeLabel})
                </dd>
              </dl>
            </AccordionSection>
            <AccordionSection title="Erweiterte Einstellungen">
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                {/* Jonas' Vorgabe 2026-08-11: nie HEX als Text, immer der
                    RAL-Name - der Swatch (das runde Farbfeld) bleibt bewusst
                    bei der echten Hintergrundfarbe (hex), nur der begleitende
                    Text daneben wechselt auf getRalNameForHex(). */}
                <dt className="text-slate-400 dark:text-slate-500">Außenfarbe</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: outsideColor }} />
                  {getRalNameForHex(outsideColor)}
                </dd>
                <dt className="text-slate-400 dark:text-slate-500">Innenfarbe</dt>
                <dd className="flex items-center gap-1.5">
                  {insideUnpainted ? (
                    "Unlackiert"
                  ) : (
                    <>
                      <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: insideColor }} />
                      {getRalNameForHex(insideColor)}
                    </>
                  )}
                </dd>
              </dl>
              {outsideNotes.trim() && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-400 dark:text-slate-500">Sonderheiten Außen:</span> {outsideNotes}
                </p>
              )}
              {insideNotes.trim() && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-400 dark:text-slate-500">Sonderheiten Innen:</span> {insideNotes}
                </p>
              )}
            </AccordionSection>
            <AccordionSection title="Einbauten">
              <OpeningsSummary openings={openings} />
            </AccordionSection>
            {kundenverlauf && <KundenverlaufSection entries={kundenverlauf} />}
            {showExport && (
              <div className="mt-6 space-y-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Exportieren</p>
                <AnimatedButton
                  type="button"
                  onClick={handleExportGlb}
                  disabled={exporting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  {exporting ? <LoadingIcon active kind="saving" size={16} /> : <DownloadIcon size={16} />}
                  Als GLB herunterladen
                </AnimatedButton>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Lädt das 3D-Modell als .glb-Datei herunter – öffnet unter Windows z. B. direkt mit der App „3D-Viewer”.
                </p>
                {exportError && <p className="text-xs text-red-600 dark:text-red-400">{exportError}</p>}
              </div>
            )}
          </>
        }
      >
        <Scene
          size={size}
          wallThickness={wallThickness}
          openings={openings}
          partitionWalls={partitionWalls}
          insideColor={insideColor}
          outsideColor={outsideColor}
          insideUnpainted={insideUnpainted}
          floorThickness={floorThickness}
          floorInsulated={floorInsulated}
          exportGroupRef={exportGroupRef}
        />
      </ViewerSidebarLayout>
    </div>
  );
}
