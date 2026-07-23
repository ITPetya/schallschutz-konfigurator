import { useState } from "react";
import { Scene } from "../components/Scene";
import { OpeningsSummary } from "../components/OpeningsSummary";
import { AccordionSection } from "../components/AccordionSection";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { ContainerConfig } from "../config/types";

interface KonfiguratorPageProps {
  // Seit der Nacht-Session 2026-07-25 uebernimmt WorkspacePage.tsx den
  // editierbaren Konfigurator komplett (Einzelcontainer UND Baugruppe in
  // einer Seite mit gemeinsamem 3D-Viewer, siehe dort) - diese Komponente
  // wird nur noch als schreibgeschuetzter Detail-Viewer gebraucht (siehe
  // pages/InternalPage.tsx: "anstatt links die Sachen zur Konfig ... alle
  // Details wo was ist"), deshalb kein "mode"-Prop/editierbarer Zweig mehr.
  initialConfig: ContainerConfig;
  projectName?: string;
}

// Reiner schreibgeschuetzter Detail-Viewer fuer eine geladene .sszkonfig
// (siehe InternalPage.tsx) - zeigt Groesse, Farben und Einbauten als reine
// Auflistung statt editierbarer Felder, ohne eigene Speicher-/Reset-/
// Moduswechsel-Logik (die gibt es nur im editierbaren WorkspacePage.tsx).
export function KonfiguratorPage({ initialConfig, projectName }: KonfiguratorPageProps) {
  const config = initialConfig;

  const [size] = useState<ContainerSize>(config.size);
  const [wallThickness] = useState(config.wallThickness);
  const [openings] = useState<Opening[]>(config.openings);
  const [viewStyle] = useState(config.viewStyle);
  const [background] = useState(config.background);
  const [outsideColor] = useState(config.outsideColor);
  const [insideColor] = useState(config.insideColor);
  const [shadowsEnabled] = useState(config.shadowsEnabled ?? true);
  const [terrainDetail] = useState(config.terrainDetail ?? "low");
  const [insideUnpainted] = useState(config.insideUnpainted ?? false);
  const [outsideNotes] = useState(config.outsideNotes ?? "");
  const [insideNotes] = useState(config.insideNotes ?? "");

  return (
    // Kein eigener Header/Accent-Bar mehr hier (Jonas' Fehlerbericht
    // 2026-07-23: "zwei horizontale Linien in der Kopfzeile") - AppShell
    // stellt bereits fuer JEDE Seite eine Kopfzeile, diese hier war eine
    // zweite, redundante Kopfzeile direkt darunter. projectName (der
    // Dateiname der geladenen .sszkonfig) steht stattdessen als schlichte
    // Unterueberschrift oben in der Seitenleiste.
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4">
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
          </div>
        </aside>

        {/* min-w-0/min-h-0 sind noetig, nicht nur kosmetisch (Jonas'
            Fehlerbericht 2026-07-22): ohne das erlaubt Flexbox einem Flex-Kind
            standardmaessig nicht, unter die intrinsische Groesse seines
            eigenen Inhalts zu schrumpfen. */}
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
          />
        </main>
      </div>
    </div>
  );
}
