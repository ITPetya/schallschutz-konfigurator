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
  // Jonas' Fehlerbericht 2026-08-11 (spaeter, nach echtem Testen des
  // 0a44577-Fixes): "sehe Punkte, kann sie aber nicht anklicken" - Root
  // Cause war, dass RENDERN (bisher: nur sectionPlane-Filter) und
  // ANKLICKBARKEIT (bisher: separater isBlockedByGeometry-Raycast NUR im
  // Klick-/Hover-Handler) zwei UNABHAENGIGE Berechnungen derselben Frage
  // ("ist dieser Punkt gerade tatsaechlich benutzbar?") waren - genau die
  // Bugklasse, bei der zwei getrennte Berechnungen auseinanderlaufen. Fix:
  // EINE Berechnung (siehe usableIds unten), die sowohl entscheidet, OB ein
  // Punkt ueberhaupt gezeichnet wird, als auch (implizit, weil ein Klick
  // physisch nicht auf einen ungezeichneten Punkt treffen kann) ob er
  // anklickbar ist - kein zweiter Klick-Zeit-Raycast mehr noetig.
  //
  // Diese Berechnung braucht einen Raycast pro Kandidatenpunkt gegen die
  // komplette Container-Huelle - zu teuer fuer JEDEN Frame/JEDE
  // Pointer-Bewegung (Jonas' Fehlerbericht 2026-08-11 zu Traegheit beim
  // Messpunkt-Auswaehlen). Sie laeuft deshalb NICHT pro Frame, sondern nur,
  // wenn sich einer der Eingaenge, die das Ergebnis ueberhaupt aendern
  // koennten, tatsaechlich geaendert hat: points/sectionPlane (normale
  // useMemo-Deps) sowie cameraVersion - ein Zaehler, den Scene.tsx/
  // ProjectScene3D.tsx bei JEDEM OrbitControls-"end"-Ereignis hochzaehlen
  // (Kamera hat sich nach einem Dreh/Pan/Zoom "gesetzt"), NICHT bei jedem
  // laufenden "change" waehrend der Bewegung selbst - guenstig genug, weil
  // es sich auf "einmal pro abgeschlossener Kamerabewegung" statt "pro
  // Frame waehrend der Bewegung" beschraenkt, wie in der Aufgabenstellung
  // gefordert.
  cameraVersion: number;
}

// Sichtbarer Radius (Meter) der klickbaren Messpunkt-Markierungen - bewusst
// klein genug, um bei dicht sitzenden Durchbruch-Merkmalspunkten nicht zu
// ueberlappen, aber gross genug, um aus normaler Betrachtungsdistanz noch
// treffbar zu sein.
const MARKER_RADIUS_M = 0.08;

// Toleranz (Meter) fuer die Occlusion-Pruefung unten: ein Messpunkt sitzt so
// gut wie immer EXAKT auf/in der Geometrie, die ihn "traegt" (eine
// Container-Ecke auf dem Eckbeschlag, ein Durchbruch-Punkt auf der eigenen
// Wandflaeche) - ein Raycast von der Kamera zum Punkt trifft diese eigene
// Trage-Geometrie deshalb fast immer VOR dem Punkt selbst, auch wenn der
// Punkt von der Kamera aus komplett frei sichtbar ist. Der urspruengliche
// 0a44577-Fix versuchte das ueber eine winzige Ray-Parameter-Toleranz
// (raycaster.far = distance - 1mm) auszuschliessen - das reicht nicht, wenn
// die Trage-Geometrie (z. B. der 178mm tiefe Eckbeschlag, siehe
// CornerCasting.tsx) selbst deutlich mehr als 1mm Tiefe hat: der Ray trifft
// dann eine Facette der eigenen Trage-Geometrie, die durchaus mehrere cm vor
// dem exakten Zielpunkt liegt (CSG-Restflaechen, Fase/Rundung am
// Eckbeschlag) - genau DAS war der eigentliche Grund fuer "sehe den Punkt,
// kann ihn aber nicht anklicken". Fix: statt eines winzigen Ray-Parameter-
// Abstands wird der tatsaechliche 3D-Abstand jedes Treffers ZUM ZIELPUNKT
// gemessen - alles innerhalb dieser Toleranz gilt als "die eigene
// Trage-Geometrie", nicht als echter Blocker. Wert = groesste denkbare
// Trage-Geometrie-Tiefe (Eckbeschlag 178mm, siehe CORNER_BLOCK_LENGTH_MM)
// plus Sicherheitsmarge, deutlich kleiner als jeder realistische Abstand zu
// ECHTEM blockierendem Material (eine andere Wand, ein zweiter Container in
// der Baugruppe).
const SELF_OCCLUSION_TOLERANCE_M = 0.3;

// Jonas' Vorgabe 2026-08-10 ("wie in Inventor Bauteile messen"): Klickbare
// Markierungen an bekannten Merkmalspunkten (Container-Ecken, Durchbruch-/
// Tuer-Mitte/-Ecken/-Rand, siehe utils/measurePoints.ts) statt freiem
// Klicken auf beliebige Mesh-Punkte - der CSG-Aufbau dieses Projekts
// (three-bvh-csg) liefert keine sauberen Kanten/Kreise fuer generisches
// Snapping (siehe die mehreren "Spinnenweben-Linien"-Fixes an CSG-
// Restflaechen in dieser Session), pruezises Snapping auf beliebige
// Mesh-Geometrie waere dadurch nicht zuverlaessig genug gewesen.
//
// Jonas' Fehlerbericht 2026-08-11 ("Messen kaputt, unsichtbare Punkte
// anklickbar"): der urspruengliche Commit 9c5cd59, der die Innenpunkte
// hinzufuegte, ging faelschlich davon aus, dass WebGL-Tiefenpruefung auch
// die ANKLICKBARKEIT einschraenkt. Root Cause, per Pruefung von r3f's
// Event-System (node_modules/@react-three/fiber/dist/events-*.js,
// intersect()): der Pointer-Raycaster von react-three-fiber schneidet
// AUSSCHLIESSLICH Objekte aus state.internal.interaction (nur Objekte mit
// tatsaechlich registrierten onClick/onPointer*-Props landen dort), NICHT
// die komplette Szene - Wand-Meshes (ohne eigene Pointer-Handler) sind fuer
// den Klick-Raycaster deshalb unsichtbar, unabhaengig von GPU-Tiefenpruefung.
// 0a44577 reparierte das per separatem isBlockedByGeometry-Raycast NUR im
// Klick-/Hover-Handler - das ueberkorrigierte (siehe cameraVersion-Kommentar
// oben: Render-Bedingung und Klick-Bedingung liefen auseinander). Diese
// Version berechnet "ist dieser Punkt gerade benutzbar" EINMAL (usableIds)
// und benutzt genau dieses Ergebnis fuer BEIDES: was gezeichnet wird UND was
// angeklickt werden kann (Klick kann ohnehin physisch nicht auf einen nicht
// gezeichneten Punkt treffen).
export function MeasureMarkers({ points, selected, onPick, unit, sectionPlane, cameraVersion }: MeasureMarkersProps) {
  const { camera, scene } = useThree();

  // Ein Punkt bleibt sichtbar/anklickbar, solange er auf der Seite der
  // Ebene liegt, die three.js' clippingPlanes ebenfalls behaelt (Normale
  // zeigt zur behaltenen Haelfte, siehe THREE.Plane.distanceToPoint -
  // negativ = weggeschnittene Seite) - identische Logik zur tatsaechlichen
  // Geometrie-Beschneidung, kein separates Vorzeichen-Ratespiel.
  function isSectionVisible(p: MeasurePoint): boolean {
    if (!sectionPlane) return true;
    return sectionPlane.distanceToPoint(new THREE.Vector3(...p.position)) >= 0;
  }

  // EINZIGE Quelle der Wahrheit fuer "welche Punkte sind gerade benutzbar" -
  // siehe die ausfuehrlichen Kommentare oben (cameraVersion-Prop, JSDoc am
  // Komponentenkopf) fuer die Begruendung von WANN das neu berechnet wird
  // und WARUM ein einziger Distanz-Toleranzwert statt eines Ray-Parameter-
  // Abstands verwendet wird.
  const usableIds = useMemo(() => {
    const usable = new Set<string>();

    // Jonas' Vorgabe 2026-08-11 (spaeter, Vereinfachung): Innenpunkte
    // (interior=true, siehe measurePoints.ts) sind NUR bei aktiver
    // Schnittansicht ueberhaupt Kandidaten - unabhaengig davon, ob ein
    // Durchbruch/eine Tuer den Blick zufaellig freigeben wuerde. Wenn KEIN
    // Innenpunkt ueberhaupt in Frage kommt (kein Schnitt aktiv), lohnt sich
    // nicht einmal die Occluder-Sammlung fuer sie - nur echte Kandidaten
    // (Aussenpunkte immer, Innenpunkte nur bei aktivem Schnitt) werden
    // ueberhaupt per Raycast geprueft.
    const candidates = points.filter((p) => (!p.interior || sectionPlane) && isSectionVisible(p));
    if (candidates.length === 0) return usable;

    // Occluder-Liste EINMAL pro Neuberechnung sammeln (nicht mehr pro Punkt
    // pro Hover/Klick wie im urspruenglichen 0a44577-Fix) - reine
    // Baum-Traversierung, aber jetzt nur noch selten (siehe cameraVersion-
    // Kommentar oben) statt bei jeder Mausbewegung.
    const occluders: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData?.measureOccluder) occluders.push(obj);
    });

    const raycaster = new THREE.Raycaster();
    const origin = camera.position;

    for (const p of candidates) {
      if (occluders.length === 0) {
        usable.add(p.id);
        continue;
      }
      const target = new THREE.Vector3(...p.position);
      const offset = target.clone().sub(origin);
      const distance = offset.length();
      if (distance < 1e-6) {
        usable.add(p.id);
        continue;
      }

      raycaster.set(origin, offset.normalize());
      raycaster.near = 0;
      raycaster.far = distance;

      const hits = raycaster.intersectObjects(occluders, true);
      let blocked = false;
      for (const hit of hits) {
        // three.js' CPU-Raycaster kennt material.clippingPlanes nicht (reines
        // Shader-Fragment-Discard) - die Wandgeometrie existiert fuer ihn auch
        // im weggeschnittenen Bereich einer aktiven Schnittansicht vollstaendig
        // weiter. Ein Treffer, der selbst auf der weggeschnittenen Seite liegt,
        // blockiert deshalb NICHT wirklich (er wuerde ja gar nicht gezeichnet).
        if (sectionPlane && sectionPlane.distanceToPoint(hit.point) < 0) continue;
        // Siehe SELF_OCCLUSION_TOLERANCE_M oben: Treffer sehr nah am Zielpunkt
        // selbst sind die eigene Trage-Geometrie des Punkts, kein echter
        // Blocker.
        if (hit.point.distanceTo(target) < SELF_OCCLUSION_TOLERANCE_M) continue;
        blocked = true;
        break;
      }
      if (!blocked) usable.add(p.id);
    }

    return usable;
    // sectionPlane/points/cameraVersion sind die einzigen Groessen, die das
    // Ergebnis aendern koennen (siehe JSDoc am cameraVersion-Prop) - camera/
    // scene sind stabile r3f-Referenzen, kein zusaetzlicher Dep noetig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, sectionPlane, cameraVersion]);

  const visiblePoints = points.filter((p) => usableIds.has(p.id));
  const showDimensions = selected.length === 2 && usableIds.has(selected[0].id) && usableIds.has(selected[1].id);

  return (
    <group>
      {visiblePoints.map((p) => {
        const isSelected = selected.some((s) => s.id === p.id);
        return (
          <mesh
            key={p.id}
            position={p.position}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onPick(p);
            }}
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
