import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { MeasurePoint } from "../utils/measurePoints";

interface MeasureMarkersProps {
  points: MeasurePoint[];
  selected: MeasurePoint[]; // 0, 1 oder 2 Punkte
  onPick: (p: MeasurePoint) => void;
}

// Sichtbarer Radius (Meter) der klickbaren Messpunkt-Markierungen - bewusst
// klein genug, um bei dicht sitzenden Durchbruch-Merkmalspunkten nicht zu
// ueberlappen, aber gross genug, um aus normaler Betrachtungsdistanz noch
// treffbar zu sein.
const MARKER_RADIUS_M = 0.08;

// Jonas' Vorgabe 2026-08-10 ("wie in Inventor Bauteile messen"): Klickbare
// Markierungen an bekannten Merkmalspunkten (Container-Ecken, Durchbruch-/
// Tuer-Mitte/-Ecken/-Rand, siehe utils/measurePoints.ts) statt freiem
// Klicken auf beliebige Mesh-Punkte - der CSG-Aufbau dieses Projekts
// (three-bvh-csg) liefert keine sauberen Kanten/Kreise fuer generisches
// Snapping (siehe die mehreren "Spinnenweben-Linien"-Fixes an CSG-
// Restflaechen in dieser Session), pruezises Snapping auf beliebige
// Mesh-Geometrie waere dadurch nicht zuverlaessig genug gewesen.
// depthTest={false} auf Markern UND Linie, damit Messpunkte/-linien immer
// sichtbar/anklickbar bleiben, auch wenn sie hinter einer Wandflaeche
// liegen (z. B. Container-Ecken auf der Rueckseite) - bewusster Trade-off
// fuer ein Messwerkzeug, kein fotorealistisches Detail.
export function MeasureMarkers({ points, selected, onPick }: MeasureMarkersProps) {
  const linePoints = useMemo<[THREE.Vector3, THREE.Vector3] | null>(() => {
    if (selected.length !== 2) return null;
    return [new THREE.Vector3(...selected[0].position), new THREE.Vector3(...selected[1].position)];
  }, [selected]);

  function handleClick(e: ThreeEvent<MouseEvent>, p: MeasurePoint) {
    e.stopPropagation();
    onPick(p);
  }

  return (
    <group>
      {points.map((p) => {
        const isSelected = selected.some((s) => s.id === p.id);
        return (
          <mesh key={p.id} position={p.position} onClick={(e) => handleClick(e, p)} renderOrder={999}>
            <sphereGeometry args={[MARKER_RADIUS_M, 12, 12]} />
            <meshBasicMaterial
              color={isSelected ? "#0284c7" : "#f97316"}
              transparent
              opacity={isSelected ? 1 : 0.75}
              depthTest={false}
            />
          </mesh>
        );
      })}
      {linePoints && (
        <Line points={linePoints} color="#0284c7" lineWidth={2} depthTest={false} renderOrder={998} transparent />
      )}
    </group>
  );
}
