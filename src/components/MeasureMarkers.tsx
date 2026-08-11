import { useCallback, useMemo } from "react";
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
// Restflaechen in dieser Session), praezises Snapping auf beliebige
// Mesh-Geometrie waere dadurch nicht zuverlaessig genug gewesen.
//
// Diese Datei hat drei Runden hinter sich (9c5cd59 -> 0a44577 -> 50784dc),
// die sich alle um EIN Thema gedreht haben: "ist ein Innenpunkt gerade
// benutzbar" per Raycast gegen die echte Container-Geometrie zu beantworten
// (erst nur beim Klick, dann vereinheitlicht mit dem Rendern, dazu eine
// Selbstverdeckungs-Toleranz gegen die eigene Trage-Geometrie). Jede Runde
// hat eine andere Facette desselben Grundproblems repariert, aber der
// Raycast selbst blieb die Fehlerquelle: er traf mal zu viel (Toleranz zu
// klein -> sichtbare Punkte faelschlich blockiert), mal zu wenig (Toleranz
// zu gross -> durch Waende hindurch anklickbar). Jonas' ausdrueckliche
// Vorgabe 2026-08-11 (vierte Runde): KEIN Geometrie-Raycast mehr fuer
// Messpunkt-Benutzbarkeit, egal in welcher Form. Stattdessen zwei einfache,
// rein deklarative Regeln, die nichts mehr gegen die Szene testen:
//
// 1. Aussenpunkte (interior=false/undefined) sind IMMER benutzbar - sie
//    sitzen per Definition auf der Aussenhuelle des Containers und waren
//    von KEINER Kameraposition aus jemals tatsaechlich verdeckt (das war
//    schon vor 9c5cd59, also vor jeder Occlusion-Logik ueberhaupt, so - und
//    hat immer funktioniert). Keine Berechnung noetig.
// 2. Innenpunkte (interior=true) sind NUR benutzbar, wenn (a) eine
//    Schnittansicht aktiv ist UND (b) der Punkt auf der behaltenen Seite der
//    Schnittebene liegt - exakt dieselbe Vorzeichen-Regel, die auch die
//    echte Geometrie-Beschneidung nutzt (siehe isUsable unten). Kein
//    Durchbruch-/Tuer-Sichtfeld-Sonderfall mehr (das urspruengliche
//    9c5cd59-Verhalten bleibt bewusst entfernt, siehe measurePoints.ts).
//
// Strukturell wichtig: "benutzbar" wird EINMAL berechnet (isUsable) und
// entscheidet direkt, OB ein Punkt ueberhaupt als <mesh onClick=...>
// gemountet wird (visiblePoints unten) - es gibt keinen zweiten, separaten
// Zustand fuer "anklickbar", der mit dem Render-Zustand auseinanderlaufen
// koennte. Ein nicht gemounteter Punkt kann physisch nicht getroffen werden,
// ein gemounteter ist immer anklickbar - dieselbe Bugklasse (Rendern und
// Anklickbarkeit als zwei unabhaengige Berechnungen derselben Frage) kann
// dadurch nicht mehr auseinanderlaufen, ohne dass es ein Kompilierfehler
// waere (ein zweiter Gate-Check muesste explizit NEU hinzugefuegt werden).
export function MeasureMarkers({ points, selected, onPick, unit, sectionPlane }: MeasureMarkersProps) {
  // Einzige Quelle der Wahrheit fuer "ist dieser Punkt gerade benutzbar" -
  // siehe die ausfuehrliche Begruendung oben. Kein Raycast, keine Kamera-
  // Abhaengigkeit, keine Toleranzwerte - nur Punktflag + Ebenen-Vorzeichen.
  // useCallback (statt einer einfachen Funktionsdeklaration), damit die
  // useMemo-Deps unten diese eine tatsaechliche Abhaengigkeit (sectionPlane)
  // sauber ausdruecken koennen, statt sie doppelt (einmal ueber isUsable,
  // einmal direkt) aufzufuehren.
  const isUsable = useCallback(
    (p: MeasurePoint): boolean => {
      if (!p.interior) return true;
      if (!sectionPlane) return false;
      // Selbe Vorzeichen-Konvention wie three.js' material.clippingPlanes
      // (und wie SectionAndViewPanel.tsx's useSectionPlane die Ebene baut):
      // distanceToPoint >= 0 = behaltene Seite.
      return sectionPlane.distanceToPoint(new THREE.Vector3(...p.position)) >= 0;
    },
    [sectionPlane],
  );

  const visiblePoints = useMemo(() => points.filter(isUsable), [points, isUsable]);
  const usableIds = useMemo(() => new Set(visiblePoints.map((p) => p.id)), [visiblePoints]);
  // Falls ein Innenpunkt bereits ausgewaehlt war und die Schnittansicht
  // danach deaktiviert/verschoben wird, faellt er aus visiblePoints -
  // showDimensions blendet die verwaiste Bemassung dann sauber mit aus,
  // statt eine Linie zu einem nicht mehr gemounteten Punkt zu zeichnen.
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
