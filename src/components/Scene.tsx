import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import { Chevron } from "./icons/Chevron";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { DisplaySettingsProvider, type BackgroundStyle, type ViewStyle } from "../context/DisplaySettingsContext";

interface SceneProps {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  insideColor: string;
  outsideColor: string;
  insideUnpainted: boolean;
  // Jonas' Vorgabe 2026-07-24: Schatten abschaltbar. Steuert direkt
  // <Canvas shadows={...}> - deaktiviert damit den Shadow-Map-Pass des
  // Renderers global, kein Umweg ueber einzelne Mesh-Props noetig.
  shadowsEnabled: boolean;
  // Nur im editierbaren Konfigurator gesetzt (Jonas' Vorgabe 2026-07-24:
  // "Zuruecksetzen"-Button unten links) - im schreibgeschuetzten internen
  // Viewer bleibt der Button einfach weg (kein Sinn, dort etwas
  // zurueckzusetzen).
  onReset?: () => void;
  // Jonas' Vorgabe 2026-07-24: das "Ansicht"-Panel (Realistisch/Schattiert
  // mit Kanten + Schatten) zieht aus der Seitenleiste in den Viewer, direkt
  // neben "Schnitt" - deshalb braucht Scene jetzt auch Schreibzugriff
  // (vorher nur lesend als Anzeige-Props). Optional aus demselben Grund wie
  // onReset: im readonly-Viewer gibt es diese Steuerung nicht.
  onViewStyleChange?: (v: ViewStyle) => void;
  onShadowsEnabledChange?: (v: boolean) => void;
}

type SectionAxis = "x" | "y" | "z";

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

// Relative Richtungen statt Himmelsrichtungen (Jonas' Fehlerbericht
// 2026-07-23, siehe types/openings.ts) - Reihenfolge entspricht weiterhin
// GizmoViewcube's Erwartung (+X,-X,+Y,-Y,+Z,-Z): +X=Vorne (vorher Sueden),
// -X=Hinten (vorher Norden), +Z=Links (vorher Osten), -Z=Rechts (vorher
// Westen), Oben/Unten unveraendert.
const VIEWCUBE_FACES = ["Vorne", "Hinten", "Oben", "Unten", "Links", "Rechts"];

export function Scene({
  size,
  wallThickness,
  openings,
  viewStyle,
  background,
  insideColor,
  outsideColor,
  insideUnpainted,
  shadowsEnabled,
  onReset,
  onViewStyleChange,
  onShadowsEnabledChange,
}: SceneProps) {
  // Kamera/Grid/Schnittebene rechnen intern in Metern (Three.js-Konvention,
  // siehe Container.tsx) - size kommt in mm an (Jonas' Vorgabe 2026-07-22).
  const lengthM = size.length * MM_TO_M;
  const widthM = size.width * MM_TO_M;
  const heightM = size.height * MM_TO_M;
  const cameraDistance = Math.max(lengthM, widthM) * 1.6 + 4;

  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("z");
  // Welche Haelfte sichtbar bleibt, ist umkehrbar (Jonas' Fehlerbericht
  // 2026-07-23: "Schnittansichten gehen immer nur in eine Richtung") - der
  // "Richtung wechseln"-Button dreht sowohl Normale als auch Ebenenkonstante
  // vorzeichenrichtig um, siehe sectionPlane unten.
  const [cutDirection, setCutDirection] = useState<1 | -1>(1);
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
  const [sectionOffsetMm, setSectionOffsetMm] = useState(0);

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

  const isTerrain = background === "terrain";

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
      >
        {!isTerrain && <color attach="background" args={["#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />
        <DisplaySettingsProvider value={{ viewStyle, insideColor, outsideColor, insideUnpainted }}>
          <SectionPlaneProvider value={sectionPlane}>
            <Container size={size} wallThickness={wallThickness} openings={openings} />
          </SectionPlaneProvider>
        </DisplaySettingsProvider>

        {isTerrain ? (
          <>
            <TerrainBackground />
            <Environment preset="park" background={false} />
          </>
        ) : (
          <>
            <Grid args={[40, 40]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={30} position={[0, 0, 0]} />
            <Environment preset="studio" />
          </>
        )}

        <OrbitControls
          makeDefault
          minDistance={2}
          maxDistance={40}
          target={[0, heightM / 2, 0]}
        />
        {/* Inventor-artiger ViewCube (Jonas' Vorgabe 2026-07-22): hellgrau,
            halbtransparent, unten rechts im Viewer. */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewcube
            faces={VIEWCUBE_FACES}
            color="#e2e8f0"
            hoverColor="#008eb4"
            textColor="#075471"
            strokeColor="#94a3b8"
            opacity={0.75}
          />
        </GizmoHelper>
      </Canvas>

      {/* Unten links: Zuruecksetzen-Button (Jonas' Vorgabe 2026-07-24) ueber
          einer Reihe aus "Schnitt" (Jonas' Vorgabe 2026-07-22, umbenannt
          2026-07-24) und "Ansicht" (Jonas' Vorgabe 2026-07-24, aus der
          Seitenleiste hierher verlegt) nebeneinander. flex-col/flex-row statt
          fest verdrahteter Pixel-Offsets, damit das unabhaengig von der
          Schnitt-Panelhoehe (auf-/zugeklappt) sauber bleibt. */}
      <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-md hover:bg-slate-50"
          >
            <ResetIcon />
            Zurücksetzen
          </button>
        )}
        <div className="flex items-start gap-2">
          <div data-tour="section-view" className="w-64 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md">
            {/* Chevron-Button statt Checkbox (Jonas' Fehlerbericht 2026-07-23:
                "nicht durch so ein Checkfeld", stattdessen ein sich drehender
                Pfeil/Ecke). */}
            <button
              type="button"
              onClick={() => setSectionEnabled((v) => !v)}
              className="flex w-full items-center justify-between font-medium text-brand-dark"
            >
              Schnitt
              <Chevron direction={sectionEnabled ? "up" : "down"} />
            </button>
            {sectionEnabled && (
              <div className="mt-3 space-y-2">
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
              </div>
            )}
          </div>

          {onViewStyleChange && onShadowsEnabledChange && (
            <div data-tour="view-style-panel" className="w-52 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md">
              <p className="mb-2 font-medium text-brand-dark">Ansicht</p>
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
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={shadowsEnabled}
                  onChange={(e) => onShadowsEnabledChange(e.target.checked)}
                />
                Schatten anzeigen
              </label>
            </div>
          )}
        </div>
      </div>
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

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 12a9 9 0 1 1 3 6.7" strokeLinecap="round" />
      <path d="M3 17v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
