import type { ThreeEvent } from "@react-three/fiber";
import type { MeasurePoint } from "../utils/measurePoints";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";
import { MeasureDimensions } from "./MeasureDimensions";
import type { LengthUnit } from "../utils/lengthUnits";

interface MeasureMarkersProps {
  points: MeasurePoint[];
  selected: MeasurePoint[]; // 0, 1 oder 2 Punkte
  onPick: (p: MeasurePoint) => void;
  unit: LengthUnit;
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
// Jonas' Fehlerbericht 2026-08-10: Punkte/Linie hinter einer Wand sollen
// NICHT durchscheinen ("sehr wirr warr") - normale Tiefenpruefung statt
// dem anfaenglichen depthTest={false}, verdeckte Punkte sind dadurch weder
// sichtbar noch anklickbar (muss man sich per Kamera-Drehung zugaenglich
// machen, genau wie bei echten CAD-Messwerkzeugen).
export function MeasureMarkers({ points, selected, onPick, unit }: MeasureMarkersProps) {
  function handleClick(e: ThreeEvent<MouseEvent>, p: MeasurePoint) {
    e.stopPropagation();
    onPick(p);
  }

  return (
    <group>
      {points.map((p) => {
        const isSelected = selected.some((s) => s.id === p.id);
        return (
          <mesh
            key={p.id}
            position={p.position}
            onClick={(e) => handleClick(e, p)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setPointerCursor();
            }}
            onPointerOut={resetPointerCursor}
          >
            <sphereGeometry args={[MARKER_RADIUS_M, 12, 12]} />
            <meshBasicMaterial color={isSelected ? "#0284c7" : "#f97316"} transparent opacity={isSelected ? 1 : 0.75} />
          </mesh>
        );
      })}
      {selected.length === 2 && <MeasureDimensions a={selected[0].position} b={selected[1].position} unit={unit} />}
    </group>
  );
}
