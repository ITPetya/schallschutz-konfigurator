import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AlignmentFacePoint } from "../utils/alignmentDependencies";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";

interface AlignmentFaceMarkersProps {
  faces: AlignmentFacePoint[];
  selected: AlignmentFacePoint[]; // 0, 1 oder 2 Flaechen
  onPick: (f: AlignmentFacePoint) => void;
}

// Jonas' Fehlerbericht 2026-08-12: "die ganze Flaeche soll klickbar sein,
// nur soll der Punkt... ein ganzes Stueck kleiner rundherum sein, damit man
// sieht, dass es ein auswaehlbares Feld ist" - zwei getrennte Ebenen pro
// Flaeche statt einer einzigen: eine UNSICHTBARE Ebene in tatsaechlicher
// Flaechengroesse uebernimmt Klick/Hover (ueberall auf der Wand treffbar),
// eine kleinere, deutlich eingerueckte SICHTBARE Ebene daruebergelegt zeigt
// nur die Markierung an - dadurch bleibt erkennbar, dass es sich um ein
// Auswahlfeld AUF der Wand handelt, statt dass die Markierung mit der Wand
// selbst optisch verschmilzt.
// Jonas' Fehlerbericht 2026-08-12 (Praezisierung): "fester Randabstand, der
// an der Seite soll der gleiche wie oben sein" - ein PROPORTIONALER Faktor
// (z. B. "70% der Flaeche") ergibt bei einer rechteckigen, nicht quadratischen
// Wand zwei UNTERSCHIEDLICHE Randbreiten (breite Wand -> breiterer Rand
// links/rechts als oben/unten) - deshalb jetzt ein fester Abstand in Metern,
// gleichermassen von allen vier Seiten abgezogen.
const VISIBLE_MARGIN_M = 0.3;
// Kleiner Versatz nach aussen entlang der Flaechen-Normalen, damit die
// Ebenen nicht exakt in der Wandoberflaeche liegen (Z-Fighting) - gleiche
// Groessenordnung, die sich in diesem Renderer bei aehnlichen Faellen schon
// bewaehrt hat (siehe CornerCasting.tsx).
const OUTWARD_OFFSET_M = 0.01;

export function AlignmentFaceMarkers({ faces, selected, onPick }: AlignmentFaceMarkersProps) {
  return (
    <group>
      {faces.map((f) => {
        const key = `${f.instanceId}:${f.axis}:${f.sign}`;
        const isSelected = selected.some((s) => s.instanceId === f.instanceId && s.axis === f.axis && s.sign === f.sign);
        // Ebene senkrecht zur Flaechen-Normalen ausrichten: eine PlaneGeometry
        // liegt standardmaessig in der XY-Ebene (Normale = Welt-Z) - fuer eine
        // X-Flaeche um 90° um Y drehen, fuer eine Z-Flaeche liegt sie schon
        // richtig.
        const rotationY = f.axis === "x" ? Math.PI / 2 : 0;
        const offset: [number, number, number] = f.axis === "x" ? [f.sign * OUTWARD_OFFSET_M, 0, 0] : [0, 0, f.sign * OUTWARD_OFFSET_M];
        const position: [number, number, number] = [f.position[0] + offset[0], f.position[1] + offset[1], f.position[2] + offset[2]];
        // Auf beiden Achsen derselbe absolute Randabstand (siehe
        // VISIBLE_MARGIN_M oben) - Mindestgroesse als Sicherheitsnetz gegen
        // negative Massse bei sehr kleinen/schmalen Flaechen.
        const visibleWidth = Math.max(f.width - 2 * VISIBLE_MARGIN_M, 0.1);
        const visibleHeight = Math.max(f.height - 2 * VISIBLE_MARGIN_M, 0.1);
        return (
          <group key={key} position={position} rotation={[0, rotationY, 0]}>
            {/* Klick-/Hover-Bereich - deckt die GESAMTE Flaeche ab, unsichtbar. */}
            <mesh
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
              <planeGeometry args={[f.width, f.height]} />
              <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
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
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
