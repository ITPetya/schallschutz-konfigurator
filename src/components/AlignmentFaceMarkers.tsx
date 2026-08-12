import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AlignmentFacePoint } from "../utils/alignmentDependencies";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";

interface AlignmentFaceMarkersProps {
  faces: AlignmentFacePoint[];
  selected: AlignmentFacePoint[]; // 0, 1 oder 2 Flaechen
  onPick: (f: AlignmentFacePoint) => void;
}

// Sichtbarer Radius (Meter) der klickbaren Flaechen-Markierungen - gleiche
// Groessenordnung wie MeasureMarkers.tsx's MARKER_RADIUS_M, hier als flache
// Scheibe statt Kugel (deutet eher eine FLAECHE an als einen Punkt).
const MARKER_RADIUS_M = 0.1;

// Jonas' Vorgabe 2026-08-12: "zwei Flaechen auswaehlen, aehnlich wie beim
// Messen, nur die, die man sieht" - klickbare Markierungen an den vier
// Seitenflaechen jedes Containers (siehe alignmentDependencies.ts's
// computeAlignmentFaces), eigene Farbe (violett statt Messen-Orange) fuer
// klare Unterscheidung, falls beide Werkzeuge zufaellig denselben Bereich
// markieren. Keine Sichtbarkeits-/Verdeckungs-Sonderregeln wie bei
// Messpunkten (MeasureMarkers.tsx) - eine Aussenflaeche ist immer von
// irgendeiner Kameraposition aus erreichbar, es gibt hier kein Innen-/
// Aussen-Konzept.
export function AlignmentFaceMarkers({ faces, selected, onPick }: AlignmentFaceMarkersProps) {
  return (
    <group>
      {faces.map((f) => {
        const key = `${f.instanceId}:${f.axis}:${f.sign}`;
        const isSelected = selected.some((s) => s.instanceId === f.instanceId && s.axis === f.axis && s.sign === f.sign);
        // Scheibe senkrecht zur Flaechen-Normalen ausrichten: eine
        // CircleGeometry liegt standardmaessig in der XY-Ebene (Normale =
        // Welt-Z) - fuer eine X-Flaeche um 90° um Y drehen, fuer eine
        // Z-Flaeche liegt sie schon richtig (ggf. mit sign an der Aussenseite
        // spiegeln, optisch bei einer flachen Scheibe aber irrelevant).
        const rotationY = f.axis === "x" ? Math.PI / 2 : 0;
        return (
          <mesh
            key={key}
            position={f.position}
            rotation={[0, rotationY, 0]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onPick(f);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setPointerCursor();
            }}
            onPointerOut={resetPointerCursor}
          >
            <circleGeometry args={[MARKER_RADIUS_M, 20]} />
            <meshBasicMaterial
              color={isSelected ? "#0284c7" : "#7c3aed"}
              transparent
              opacity={isSelected ? 1 : 0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
