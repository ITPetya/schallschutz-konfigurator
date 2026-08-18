import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { WallFace } from "../utils/wallFaces";
import type { PanelId } from "../types/openings";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";
import { isRectFullyCutAway } from "../utils/planeClipping";

interface WallFaceMarkersProps {
  faces: WallFace[];
  selected: PanelId | null;
  onPick: (panel: PanelId) => void;
  // Aktive Schnittebene des Einzelcontainer-Viewers (Scene.tsx) - dieselbe
  // Ebene, die auch an die Wand-Materialien geht. Jonas' Vorgabe 2026-08-13
  // (im selben Zug wie bei Messen/Ausrichten): eine weggeschnittene Waand
  // darf hier nicht mehr anklickbar/markiert sein.
  sectionPlane?: THREE.Plane | null;
}

// Klick-Overlay fuer die 6 Container-Waende im "Einbauten
// hinzufügen"-Assistenten (Jonas' Vorgabe 2026-08-13: "auch per klicken der
// Fläche, genau wie beim Ausrichten") - gleiches Zwei-Ebenen-Muster wie
// AlignmentFaceMarkers.tsx: eine unsichtbare Ebene in echter Flaechengroesse
// uebernimmt Klick/Hover, eine kleinere, sichtbar eingerueckte Ebene zeigt
// nur die Markierung.
const VISIBLE_MARGIN_M = 0.3;

export function WallFaceMarkers({ faces, selected, onPick, sectionPlane }: WallFaceMarkersProps) {
  // Jonas' Fehlerbericht 2026-08-13 (Folgefehler): die Faces-Filterung unten
  // blendet eine Markierung nur KOMPLETT aus, sobald ihr MITTELPUNKT auf der
  // weggeschnittenen Seite liegt - schneidet der Schnitt eine Flaeche aber
  // mittendurch, blieb der Mittelpunkt oft noch auf der behaltenen Seite,
  // waehrend die Markierung selbst trotzdem ueber die halbe (unsichtbare)
  // Restwand hinausragte, weil ihr Material - anders als die echten Wand-
  // Materialien in Wall.tsx - bisher KEINE clippingPlanes hatte. Beides ist
  // noetig: die Filterung unten fuer den Fall "ganze Flaeche weg" (siehe
  // isRectFullyCutAway - prueft ALLE VIER Ecken, nicht nur den Mittelpunkt,
  // sonst waeren z. B. Vorne/Hinten bei einem R/L-Schnitt faelschlich immer
  // komplett verschwunden, siehe planeClipping.ts), UND clippingPlanes hier
  // fuer den Fall "Flaeche nur teilweise weg" (echtes pixelgenaues
  // Mitschneiden, exakt wie bei der Container-Geometrie selbst).
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];
  const visibleFaces = sectionPlane
    ? faces.filter((f) => !isRectFullyCutAway(f.position, f.rotation, f.width, f.height, sectionPlane))
    : faces;

  return (
    <group>
      {visibleFaces.map((f) => {
        const isSelected = selected === f.panel;
        const visibleWidth = Math.max(f.width - 2 * VISIBLE_MARGIN_M, 0.1);
        const visibleHeight = Math.max(f.height - 2 * VISIBLE_MARGIN_M, 0.1);
        return (
          <group key={f.panel} position={f.position} rotation={f.rotation}>
            {/* Klick-/Hover-Bereich - deckt die GESAMTE Flaeche ab, unsichtbar. */}
            <mesh
              // Siehe MeasureMarkers.tsx fuer die volle Begruendung (Jonas'
              // Fehlerbericht 2026-08-18): onPointerDown MUSS separat
              // gestoppt werden, sonst laeuft das Event zur Container-
              // Grundflaeche dahinter durch (Auswahl/Drag), auch wenn
              // onClick bereits gestoppt ist. Betrifft hier zwar nur den
              // "Einbauten hinzufügen"-Assistenten (kein Baugruppen-
              // Kontext), aus Konsistenz/Robustheit trotzdem ergaenzt.
              onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onPick(f.panel);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setPointerCursor();
              }}
              onPointerOut={resetPointerCursor}
            >
              <planeGeometry args={[f.width, f.height]} />
              <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} clippingPlanes={clippingPlanes} />
            </mesh>
            {/* Sichtbare Markierung - deutlich kleiner als die Flaeche, rein
                dekorativ (kein eigener Klick-Handler noetig, liegt innerhalb
                des Klick-Bereichs oben). */}
            <mesh>
              <planeGeometry args={[visibleWidth, visibleHeight]} />
              <meshBasicMaterial
                color={isSelected ? "#0284c7" : "#7c3aed"}
                transparent
                opacity={isSelected ? 0.85 : 0.5}
                side={THREE.DoubleSide}
                depthWrite={false}
                clippingPlanes={clippingPlanes}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
