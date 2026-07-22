import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { Opening } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";

interface WallProps {
  position: [number, number, number];
  rotation: [number, number, number];
  panelWidth: number;
  panelHeight: number;
  thickness: number;
  openings: Opening[];
  color: string;
  // +1, wenn die lokale +Z-Richtung dieser Wand (vor Rotation) nach AUSSEN
  // zeigt, -1, wenn lokal -Z nach aussen zeigt - haengt davon ab, wie die
  // Wand in Container.tsx positioniert/rotiert wurde. Wird nur fuer
  // Durchbrueche mit protrusionDepth gebraucht (z. B. Wetterschutzgitter).
  outwardSign: 1 | -1;
}

// Ein Evaluator reicht global - er haelt keinen Zustand zwischen Aufrufen,
// siehe three-bvh-csg-Doku.
const evaluator = new Evaluator();

// Rendert eine einzelne Wand als CSG-Ausschnitt: Wand-Quader minus je einem
// Quader (rechteckige Durchbrueche) oder Zylinder (Rohrdurchführung, rund)
// pro platziertem Durchbruch dieser Wand. Die Ausschnitt-Geometrie wird in
// LOKALEN Koordinaten der Wand berechnet (bevor Position/Rotation der Wand
// selbst angewendet werden) - dadurch ist diese Komponente unabhaengig davon,
// an welcher Seite des Containers sie tatsaechlich sitzt. Durchbrueche mit
// protrusionDepth (aktuell nur das Wetterschutzgitter, "baut 12mm nach aussen
// auf") bekommen zusaetzlich einen kleinen, nicht ausgeschnittenen, sondern
// AUFGESETZTEN Block auf der Aussenseite.
export function Wall({ position, rotation, panelWidth, panelHeight, thickness, openings, color, outwardSign }: WallProps) {
  const geometry = useMemo(() => {
    const wallGeom = new THREE.BoxGeometry(panelWidth, panelHeight, thickness);
    let result: Brush = new Brush(wallGeom);
    result.updateMatrixWorld();

    for (const opening of openings) {
      const typeDef = OPENING_TYPES[opening.kind];
      // Tiefer als die Wand selbst, damit der Ausschnitt sauber komplett
      // durchgeht (keine Rest-Flaechen durch Koplanaritaet an der Oberflaeche).
      const cutDepth = thickness * 4;

      const cutGeom =
        typeDef.shape === "round"
          ? new THREE.CylinderGeometry(opening.width / 2, opening.width / 2, cutDepth, 32)
          : new THREE.BoxGeometry(opening.width, opening.height, cutDepth);

      if (typeDef.shape === "round") {
        // Zylinder-Achse zeigt per Default entlang Y - fuer die Wanddicken-
        // richtung (lokales Z) um 90 Grad um X kippen.
        cutGeom.rotateX(Math.PI / 2);
      }

      const cutBrush = new Brush(cutGeom);
      cutBrush.position.set(opening.u, opening.v - panelHeight / 2, 0);
      cutBrush.updateMatrixWorld();

      result = evaluator.evaluate(result, cutBrush, SUBTRACTION);
    }

    return result.geometry;
  }, [panelWidth, panelHeight, thickness, openings]);

  const protrusions = openings.filter((o) => OPENING_TYPES[o.kind].protrusionDepth);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {protrusions.map((o) => {
        const depth = OPENING_TYPES[o.kind].protrusionDepth!;
        const zOffset = outwardSign * (thickness / 2 + depth / 2);
        return (
          <mesh key={o.id} position={[o.u, o.v - panelHeight / 2, zOffset]} castShadow>
            <boxGeometry args={[o.width, o.height, depth]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
