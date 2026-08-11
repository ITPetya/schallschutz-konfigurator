import { useMemo } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
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
// NICHT durchscheinen ("sehr wirr warr") - normale Tiefenpruefung (Material
// bleibt bei depthTest=true statt dem anfaenglichen depthTest={false}) sorgt
// dafuer, dass verdeckte Punkte optisch nicht mehr durchscheinen.
//
// Jonas' Fehlerbericht 2026-08-11 ("Messen kaputt, unsichtbare Punkte
// anklickbar"): der Kommentar oben (und der urspruengliche Commit 9c5cd59,
// der die Innenpunkte hinzufuegte) ging faelschlich davon aus, dass dieselbe
// Tiefenpruefung auch die ANKLICKBARKEIT einschraenkt - "sichtbar/anklickbar"
// wurden dabei synonym behandelt. Root Cause, per Pruefung von r3f's Event-
// System (node_modules/@react-three/fiber/dist/events-*.js, intersect()):
// der Pointer-Raycaster von react-three-fiber schneidet AUSSCHLIESSLICH
// Objekte aus state.internal.interaction (nur Objekte mit tatsaechlich
// registrierten onClick/onPointer*-Props landen dort), NICHT die komplette
// Szene. Wall.tsx/Container.tsx haben BEWUSST keine Pointer-Handler (der
// Container selbst ist nicht klickbar) - die Wand-Meshes sind fuer den
// Klick-Raycaster deshalb schlicht UNSICHTBAR, unabhaengig von GPU-
// Tiefenpruefung (die nur ENTSCHEIDET, was gezeichnet wird, nicht was
// getroffen werden kann). Vor den Innenpunkten (9c5cd59) fiel das nie auf,
// weil alle Messpunkte auf der AUSSENhuelle lagen, dort von jeder Kamera-
// position aus ohnehin nichts im Weg war - seit es Innenpunkte gibt (nur
// durch eine echte Schnittansicht oder einen Durchbruch sichtbar sein
// sollen), klickt man durch eine intakte Wand einfach GERADE DURCH.
// Fix: isBlockedByGeometry() unten fuehrt den fehlenden Occlusion-Test
// SELBST aus - ein echter Raycast von der Kamera zum Kandidatenpunkt gegen
// die tatsaechliche Container-Huelle (Waende/Tueren/Eckbeschlaege/Dachfirst,
// markiert per userData.measureOccluder in Container.tsx), unabhaengig vom
// r3f-Event-System. Nur im Klick-/Hover-Handler ausgefuehrt (nicht pro
// Frame) - guenstig genug, weil er ausschliesslich beim tatsaechlichen
// Hovern/Klicken eines Markers laeuft, nicht kontinuierlich.
export function MeasureMarkers({ points, selected, onPick, unit, sectionPlane }: MeasureMarkersProps) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Prueft, ob zwischen der Kamera und dem Punkt p echte, undurchsichtige
  // Container-Geometrie liegt (siehe grosser Kommentar oben). Die Occluder-
  // Liste wird bei JEDEM Aufruf frisch per scene.traverse gesammelt (Baugruppe
  // kann mehrere Container-Instanzen haben, jede davon soll als Blocker
  // zaehlen) - guenstige reine Baum-Traversierung, keine Geometriearbeit.
  function isBlockedByGeometry(p: MeasurePoint): boolean {
    const target = new THREE.Vector3(...p.position);
    const origin = camera.position;
    const offset = target.clone().sub(origin);
    const distance = offset.length();
    if (distance < 1e-6) return false;

    const occluders: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData?.measureOccluder) occluders.push(obj);
    });
    if (occluders.length === 0) return false;

    raycaster.set(origin, offset.normalize());
    raycaster.near = 0;
    // Knapp VOR dem Zielpunkt selbst stoppen, sonst zaehlt die Wandflaeche,
    // auf der ein Durchbruch-/Eckpunkt oft direkt sitzt, faelschlich als
    // eigener Blocker.
    raycaster.far = Math.max(distance - 1e-3, 0);

    const hits = raycaster.intersectObjects(occluders, true);
    for (const hit of hits) {
      // three.js' CPU-Raycaster kennt material.clippingPlanes nicht (reines
      // Shader-Fragment-Discard) - die Wandgeometrie existiert fuer ihn auch
      // im weggeschnittenen Bereich einer aktiven Schnittansicht vollstaendig
      // weiter. Ein Treffer, der selbst auf der weggeschnittenen Seite liegt,
      // blockiert deshalb NICHT wirklich (er wuerde ja gar nicht gezeichnet).
      if (sectionPlane && sectionPlane.distanceToPoint(hit.point) < 0) continue;
      return true;
    }
    return false;
  }

  function handleClick(e: ThreeEvent<MouseEvent>, p: MeasurePoint) {
    e.stopPropagation();
    if (isBlockedByGeometry(p)) return;
    onPick(p);
  }

  // Ein Punkt bleibt sichtbar/anklickbar, solange er auf der Seite der
  // Ebene liegt, die three.js' clippingPlanes ebenfalls behaelt (Normale
  // zeigt zur behaltenen Haelfte, siehe THREE.Plane.distanceToPoint -
  // negativ = weggeschnittene Seite) - identische Logik zur tatsaechlichen
  // Geometrie-Beschneidung, kein separates Vorzeichen-Ratespiel.
  function isSectionVisible(p: MeasurePoint): boolean {
    if (!sectionPlane) return true;
    return sectionPlane.distanceToPoint(new THREE.Vector3(...p.position)) >= 0;
  }

  const visiblePoints = points.filter(isSectionVisible);
  const showDimensions = selected.length === 2 && isSectionVisible(selected[0]) && isSectionVisible(selected[1]);

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
              if (isBlockedByGeometry(p)) return;
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
