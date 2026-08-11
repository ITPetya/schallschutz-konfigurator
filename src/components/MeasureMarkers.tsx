import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { MeasurePoint } from "../utils/measurePoints";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";
import { MeasureDimensions } from "./MeasureDimensions";
import type { LengthUnit } from "../utils/lengthUnits";

interface MeasureMarkersProps {
  points: MeasurePoint[];
  selected: MeasurePoint[]; // 0, 1 oder 2 Punkte
  onPick: (p: MeasurePoint) => void;
  unit: LengthUnit;
  // Jonas' Fehlerbericht 2026-08-11: Messpunkte im weggeschnittenen Teil
  // einer aktiven Schnittansicht blieben sichtbar/anklickbar - anders als
  // die Wand-Geometrie (die three.js' localClipping ueber material.
  // clippingPlanes automatisch entfernt) haben die Markierungs-Kugeln hier
  // nie ein clippingPlanes-Material bekommen. WELT-Ebene (dieselbe, die auch
  // an die Wand-Materialien geht) statt Context, weil Scene.tsx die
  // Markierungen bisher AUSSERHALB des SectionPlaneProvider rendert (der
  // Context-Wert waere dort immer null) und ProjectScene3D.tsx' Messpunkte
  // ueber MEHRERE Instanzen hinweg gehen, von denen hoechstens die
  // ausgewaehlte ueberhaupt eine Schnittebene hat - direktes Prop ist in
  // beiden Faellen eindeutiger als sich auf eine bestimmte Context-
  // Verschachtelung zu verlassen.
  sectionPlane?: THREE.Plane | null;
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
export function MeasureMarkers({ points, selected, onPick, unit, sectionPlane }: MeasureMarkersProps) {
  function handleClick(e: ThreeEvent<MouseEvent>, p: MeasurePoint) {
    e.stopPropagation();
    onPick(p);
  }

  // Ein Punkt bleibt sichtbar/anklickbar, solange er auf der Seite der
  // Ebene liegt, die three.js' clippingPlanes ebenfalls behaelt (Normale
  // zeigt zur behaltenen Haelfte, siehe THREE.Plane.distanceToPoint -
  // negativ = weggeschnittene Seite) - identische Logik zur tatsaechlichen
  // Geometrie-Beschneidung, kein separates Vorzeichen-Ratespiel.
  function isVisible(p: MeasurePoint): boolean {
    if (!sectionPlane) return true;
    return sectionPlane.distanceToPoint(new THREE.Vector3(...p.position)) >= 0;
  }

  const visiblePoints = points.filter(isVisible);
  const showDimensions = selected.length === 2 && isVisible(selected[0]) && isVisible(selected[1]);

  return (
    <group>
      {visiblePoints.map((p) => {
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
      {showDimensions && <MeasureDimensions a={selected[0].position} b={selected[1].position} unit={unit} />}
    </group>
  );
}
