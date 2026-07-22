import { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
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
}

type SectionAxis = "x" | "y" | "z";

const MM_TO_M = 1 / 1000;

// Normalen so gewaehlt, dass ein steigender Schieberegler-Wert die
// sichtbare Restmenge in eine intuitive Richtung wachsen/schrumpfen laesst
// (siehe Kommentar an der jeweiligen Stelle unten) - THREE.Plane behaelt die
// Haelfte, in die die Normale NICHT zeigt (distanceToPoint >= 0 bleibt sichtbar).
const SECTION_NORMALS: Record<SectionAxis, THREE.Vector3> = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
};

const SECTION_AXIS_LABELS: Record<SectionAxis, string> = {
  x: "Nord–Süd",
  y: "Oben–Unten",
  z: "Ost–West",
};

// Kompass-Beschriftung des ViewCube statt der drei-Standardwerte
// (Right/Left/Top/Bottom/Front/Back, in genau dieser Reihenfolge = +X/-X/+Y/-Y/+Z/-Z) -
// passend zur Kompass-Umbenennung der Waende (Container.tsx): +X=Sueden,
// -X=Norden, +Z=Osten, -Z=Westen, Oben/Unten unveraendert.
const VIEWCUBE_FACES = ["Süden", "Norden", "Oben", "Unten", "Osten", "Westen"];

export function Scene({ size, wallThickness, openings, viewStyle, background, insideColor, outsideColor }: SceneProps) {
  // Kamera/Grid/Schnittebene rechnen intern in Metern (Three.js-Konvention,
  // siehe Container.tsx) - size kommt in mm an (Jonas' Vorgabe 2026-07-22).
  const lengthM = size.length * MM_TO_M;
  const widthM = size.width * MM_TO_M;
  const heightM = size.height * MM_TO_M;
  const cameraDistance = Math.max(lengthM, widthM) * 1.6 + 4;

  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("z");
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
    return new THREE.Plane(SECTION_NORMALS[sectionAxis], sectionOffsetMm * MM_TO_M);
  }, [sectionEnabled, sectionAxis, sectionOffsetMm]);

  function handleAxisChange(axis: SectionAxis) {
    setSectionAxis(axis);
    setSectionOffsetMm((axisRangeMm[axis].min + axisRangeMm[axis].max) / 2);
  }

  const isTerrain = background === "terrain";

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
      >
        {!isTerrain && <color attach="background" args={["#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <DisplaySettingsProvider value={{ viewStyle, insideColor, outsideColor }}>
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

      {/* Schnittansicht-Werkzeug (Jonas' Vorgabe 2026-07-22) - reines HTML-
          Overlay, unten links (damit es sich nicht mit dem ViewCube unten
          rechts ueberschneidet). */}
      <div className="absolute bottom-4 left-4 w-64 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md">
        <label className="flex items-center gap-2 font-medium text-brand-dark">
          <input
            type="checkbox"
            checked={sectionEnabled}
            onChange={(e) => setSectionEnabled(e.target.checked)}
          />
          Schnittansicht
        </label>
        {sectionEnabled && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1">
              {(Object.keys(SECTION_AXIS_LABELS) as SectionAxis[]).map((axis) => (
                <button
                  key={axis}
                  type="button"
                  onClick={() => handleAxisChange(axis)}
                  className={`flex-1 rounded-full px-2 py-1 text-xs ${
                    sectionAxis === axis ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {SECTION_AXIS_LABELS[axis]}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={axisRangeMm[sectionAxis].min}
              max={axisRangeMm[sectionAxis].max}
              step={10}
              value={sectionOffsetMm}
              onChange={(e) => setSectionOffsetMm(Number(e.target.value))}
              className="w-full accent-brand"
            />
            <p className="text-right text-xs text-slate-500">{Math.round(sectionOffsetMm)} mm</p>
          </div>
        )}
      </div>
    </div>
  );
}
