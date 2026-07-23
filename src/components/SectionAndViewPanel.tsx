import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ContainerSize } from "../constants/containerSizes";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";
import { Chevron } from "./icons/Chevron";
import { AnimatedButton } from "./AnimatedButton";

export type SectionAxis = "x" | "y" | "z";

const MM_TO_M = 1 / 1000;

// Normalen so gewaehlt, dass ein steigender Schieberegler-Wert die
// sichtbare Restmenge in eine intuitive Richtung wachsen/schrumpfen laesst -
// siehe cutDirection weiter unten fuer den "Richtung wechseln"-Button, der
// diese Normalen (und die Ebenenkonstante) vorzeichenrichtig umkehrt.
const SECTION_NORMALS: Record<SectionAxis, THREE.Vector3> = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
};

// Kurzformen statt ausgeschriebener Kompassnamen (Jonas' Fehlerbericht
// 2026-07-23) - x-Achse = Vorne/Hinten (V/H), z-Achse = Rechts/Links (R/L),
// y-Achse = Oben/Unten (O/U).
const SECTION_AXIS_LABELS: Record<SectionAxis, string> = {
  x: "V/H",
  z: "R/L",
  y: "O/U",
};

// 4 Detailstufen fuer den Gelände-Hintergrund (Jonas' Vorgabe 2026-07-25) -
// "niedrig" ist der bisherige, unveraenderte Stand (siehe TerrainBackground.tsx).
const TERRAIN_DETAIL_OPTIONS: [TerrainDetail, string][] = [
  ["low", "Niedrig"],
  ["medium", "Mittel"],
  ["high", "Detailliert"],
  ["ultra", "Hochauflösend"],
];

// Ausgelagert aus Scene.tsx (urspruenglich nur Einzelcontainer), damit die
// Baugruppen-Ansicht (ProjectScene3D.tsx) dieselbe Schnitt-/Ansicht-Logik
// und -Optik fuer den JEWEILS AUSGEWAEHLTEN Container wiederverwenden kann
// (Jonas' Fehlerbericht 2026-07-25: "kann in der Baugruppen-Ansicht keine
// Schnitte oder die Ansicht verwalten, also die beiden Menüs unten links im
// Konfigurator"). Reine Zustands-/Berechnungslogik, keine UI - siehe
// SectionAndViewPanel weiter unten fuer die Darstellung.
export function useSectionPlane(size: ContainerSize) {
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("z");
  // Welche Haelfte sichtbar bleibt, ist umkehrbar (Jonas' Fehlerbericht
  // 2026-07-23: "Schnittansichten gehen immer nur in eine Richtung") - der
  // "Richtung wechseln"-Button dreht sowohl Normale als auch Ebenenkonstante
  // vorzeichenrichtig um, siehe sectionPlane unten.
  const [cutDirection, setCutDirection] = useState<1 | -1>(1);
  const [sectionOffsetMm, setSectionOffsetMm] = useState(0);

  // Schieberegler-Bereich bleibt in mm (durchgehende Einheit im UI-Layer),
  // nur beim Bauen der eigentlichen THREE.Plane unten auf Meter umgerechnet.
  const axisRangeMm = useMemo(
    () => ({
      x: { min: -size.length / 2, max: size.length / 2 },
      y: { min: 0, max: size.height },
      z: { min: -size.width / 2, max: size.width / 2 },
    }),
    [size],
  );

  const sectionPlane = useMemo(() => {
    if (!sectionEnabled) return null;
    const normal = SECTION_NORMALS[sectionAxis].clone().multiplyScalar(cutDirection);
    const constant = sectionOffsetMm * MM_TO_M * cutDirection;
    return new THREE.Plane(normal, constant);
  }, [sectionEnabled, sectionAxis, sectionOffsetMm, cutDirection]);

  function handleAxisChange(axis: SectionAxis) {
    setSectionAxis(axis);
    setSectionOffsetMm((axisRangeMm[axis].min + axisRangeMm[axis].max) / 2);
  }

  return {
    sectionEnabled,
    setSectionEnabled,
    sectionAxis,
    cutDirection,
    setCutDirection,
    sectionOffsetMm,
    setSectionOffsetMm,
    axisRangeMm,
    sectionPlane,
    handleAxisChange,
  };
}

export type SectionPlaneState = ReturnType<typeof useSectionPlane>;

interface SectionAndViewPanelProps {
  section: SectionPlaneState;
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  shadowsEnabled: boolean;
  terrainDetail: TerrainDetail;
  onViewStyleChange?: (v: ViewStyle) => void;
  onBackgroundChange?: (b: BackgroundStyle) => void;
  onShadowsEnabledChange?: (v: boolean) => void;
  onTerrainDetailChange?: (d: TerrainDetail) => void;
  // Baugruppen-Ansicht (Jonas' Vorgabe 2026-07-25): ohne ausgewaehlten
  // Container gibt es nichts, worauf sich EIN SCHNITT beziehen koennte - dann
  // Hinweistext statt Regler zeigen, aber das Panel bleibt sichtbar (nicht
  // komplett verschwinden, sonst wirkt es wie ein fehlendes Feature). Betrifft
  // NUR "Schnitt" - "Ansicht" (Hintergrund/Schatten/Stil) gilt fuer die ganze
  // geteilte 3D-Szene und bleibt deshalb immer bedienbar, auch ohne Auswahl.
  sectionDisabledHint?: string;
}

// Unten links im Viewer: "Schnitt" und "Ansicht" nebeneinander, beide
// ausklappbar und klappen nach OBEN auf (Jonas' Vorgabe 2026-07-24) - dafuer
// steht der Umschalt-Button in jedem Panel als LETZTES Kind (am unteren Rand
// des Panels) und items-end richtet beide Panels an ihrer Unterkante aus.
export function SectionAndViewPanel({
  section,
  viewStyle,
  background,
  shadowsEnabled,
  terrainDetail,
  onViewStyleChange,
  onBackgroundChange,
  onShadowsEnabledChange,
  onTerrainDetailChange,
  sectionDisabledHint,
}: SectionAndViewPanelProps) {
  const [viewPanelOpen, setViewPanelOpen] = useState(false);
  const isTerrain = background === "terrain";
  const {
    sectionEnabled,
    setSectionEnabled,
    sectionAxis,
    setCutDirection,
    sectionOffsetMm,
    setSectionOffsetMm,
    axisRangeMm,
    handleAxisChange,
  } = section;

  return (
    <div className="absolute bottom-4 left-4 flex items-end gap-2">
      <div data-tour="section-view" className="w-64 rounded-lg border border-slate-200 bg-white/95 text-sm shadow-md">
        {sectionEnabled && (
          <div className="space-y-2 border-b border-slate-200 p-3">
            {sectionDisabledHint ? (
              <p className="text-xs text-slate-500">{sectionDisabledHint}</p>
            ) : (
              <>
                <div className="flex gap-1">
                  {(Object.keys(SECTION_AXIS_LABELS) as SectionAxis[]).map((axis) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => handleAxisChange(axis)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-bold ${
                        sectionAxis === axis ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {axis === "y" ? (
                        <UpDownAxisIcon active={sectionAxis === axis} />
                      ) : (
                        <CompassAxisIcon emphasize={axis === "x" ? "vh" : "rl"} active={sectionAxis === axis} />
                      )}
                      {SECTION_AXIS_LABELS[axis]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCutDirection((d) => (d === 1 ? -1 : 1))}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  <SwapIcon />
                  Richtung wechseln
                </button>

                <SectionSlider
                  min={axisRangeMm[sectionAxis].min}
                  max={axisRangeMm[sectionAxis].max}
                  value={sectionOffsetMm}
                  onChange={setSectionOffsetMm}
                />
                <p className="text-right text-xs text-slate-500">{Math.round(sectionOffsetMm)} mm</p>
              </>
            )}
          </div>
        )}
        {/* Chevron-Button statt Checkbox (Jonas' Fehlerbericht 2026-07-23:
            "nicht durch so ein Checkfeld", stattdessen ein sich drehender
            Pfeil/Ecke) - zeigt nach oben, solange geschlossen (dahin klappt
            der Inhalt beim Oeffnen auf), nach unten sobald offen. */}
        <AnimatedButton
          type="button"
          onClick={() => setSectionEnabled((v) => !v)}
          className="flex w-full items-center justify-between p-3 font-medium text-brand-dark"
        >
          Schnitt
          <Chevron direction={sectionEnabled ? "down" : "up"} />
        </AnimatedButton>
      </div>

      {onViewStyleChange && onBackgroundChange && onShadowsEnabledChange && (
        <div data-tour="view-style-panel" className="w-52 rounded-lg border border-slate-200 bg-white/95 text-sm shadow-md">
          {viewPanelOpen && (
            <div className="space-y-3 border-b border-slate-200 p-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Ansicht</p>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onViewStyleChange("realistic")}
                    className={`rounded-full px-2 py-1.5 text-xs font-medium ${
                      viewStyle === "realistic" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Realistisch
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewStyleChange("shaded_edges")}
                    className={`rounded-full px-2 py-1.5 text-xs font-medium ${
                      viewStyle === "shaded_edges" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Schattiert mit Kanten
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Hintergrund</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onBackgroundChange("studio")}
                    className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${
                      background === "studio" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => onBackgroundChange("terrain")}
                    className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${
                      background === "terrain" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Gelände
                  </button>
                </div>
              </div>

              {/* Detailstufen fuer den Gelände-Hintergrund (Jonas' Vorgabe
                  2026-07-25) - nur sichtbar/relevant, wenn "Gelände"
                  bereits aktiv ist; faellt sonst immer auf "low" zurueck
                  (siehe TerrainBackground.tsx). onTerrainDetailChange kann
                  fehlen (readonly-Viewer), dann wird die Auswahl gar nicht
                  erst angezeigt. */}
              {isTerrain && onTerrainDetailChange && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Gelände-Detailstufe</p>
                  <div className="grid grid-cols-2 gap-1">
                    {TERRAIN_DETAIL_OPTIONS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onTerrainDetailChange(value)}
                        className={`rounded-full px-2 py-1.5 text-xs font-medium ${
                          terrainDetail === value ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={shadowsEnabled}
                  onChange={(e) => onShadowsEnabledChange(e.target.checked)}
                />
                Schatten anzeigen
              </label>
            </div>
          )}
          <AnimatedButton
            type="button"
            onClick={() => setViewPanelOpen((v) => !v)}
            className="flex w-full items-center justify-between p-3 font-medium text-brand-dark"
          >
            Ansicht
            <Chevron direction={viewPanelOpen ? "down" : "up"} />
          </AnimatedButton>
        </div>
      )}
    </div>
  );
}

// Ersetzt den nativen <input type="range"> (Jonas' Fehlerbericht 2026-07-23:
// "eher ein Pfeil, bzw. ein Pfeil ohne Stiel, der das Fenster für Schnitte
// vergrößert") - eine wachsende Fuellung von links + eine Pfeil-Ecke
// (Chevron, kein Dreieck) an der aktuellen Position, per Pointer-Events
// ziehbar (Maus UND Touch).
function SectionSlider({ min, max, value, onChange }: { min: number; max: number; value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  function setFromClientX(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    onChange(Math.round(raw / 10) * 10);
  }

  return (
    <div
      ref={trackRef}
      className="relative h-6 w-full touch-none rounded-full bg-slate-100"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) setFromClientX(e.clientX);
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-brand-light/50" style={{ width: `${pct}%` }} />
      <div
        className="pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-brand-dark"
        style={{ left: `calc(${pct}% - 12px)` }}
      >
        <Chevron direction="right" />
      </div>
    </div>
  );
}

// Kompass-Icon fuer die V/H- bzw. R/L-Achsenauswahl: alle vier Richtungen
// sichtbar, aber die zwei zur jeweiligen Achse gehoerenden groesser/fetter
// dargestellt (Jonas' Vorgabe 2026-07-23: "die Richtungen die gemeint sind
// nochmal größer oder dicker").
function CompassAxisIcon({ emphasize, active }: { emphasize: "vh" | "rl"; active: boolean }) {
  const big = active ? "#ffffff" : "#075471";
  const small = active ? "rgba(255,255,255,0.6)" : "#94a3b8";
  const vh = emphasize === "vh";
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="11" fill="none" stroke={active ? "rgba(255,255,255,0.5)" : "#cbd5e1"} strokeWidth="1.2" />
      <text x="13" y="9" textAnchor="middle" fontSize={vh ? 10 : 7} fontWeight={vh ? 700 : 500} fill={vh ? big : small}>
        V
      </text>
      <text x="13" y="22" textAnchor="middle" fontSize={vh ? 10 : 7} fontWeight={vh ? 700 : 500} fill={vh ? big : small}>
        H
      </text>
      <text x="4" y="17" textAnchor="middle" fontSize={!vh ? 10 : 7} fontWeight={!vh ? 700 : 500} fill={!vh ? big : small}>
        L
      </text>
      <text x="22" y="17" textAnchor="middle" fontSize={!vh ? 10 : 7} fontWeight={!vh ? 700 : 500} fill={!vh ? big : small}>
        R
      </text>
    </svg>
  );
}

function UpDownAxisIcon({ active }: { active: boolean }) {
  const color = active ? "#ffffff" : "#075471";
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={color} strokeWidth="2" aria-hidden>
      <path d="M9 2v18M9 2l-4 4M9 2l4 4M9 20l-4-4M9 20l4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 7h11l-3-3M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
