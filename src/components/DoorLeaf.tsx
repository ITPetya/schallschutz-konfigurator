import type { DoorHinge } from "../types/openings";
import { useSectionPlane } from "../context/SectionPlaneContext";

interface DoorLeafProps {
  u: number;
  v: number;
  width: number;
  height: number;
  panelHeight: number;
  hinge: DoorHinge;
  color?: string;
}

const LEAF_THICKNESS = 0.04;
const LEAF_GAP = 0.02; // kleiner Falz-Spalt ringsum, damit das Blatt nicht wie zugeschweisst wirkt
const HANDLE_COLOR = "#4b5563";

// Ein einzelnes Tuerblatt: gefuellte Platte im Ausschnitt (statt eines
// offenen Lochs) + Scharniere auf der Bandseite + ein Griff auf JEDER Seite
// (innen UND aussen sichtbar) auf der Gegenseite - genau das macht DIN
// Links/Rechts ueberhaupt sichtbar/definierbar (Jonas' Vorgabe 2026-07-22),
// nicht nur ein Metadaten-Feld ohne optische Wirkung. Wird komplett in den
// LOKALEN Koordinaten der jeweiligen Wall gerendert (dieselbe (u, v -
// panelHeight/2)-Umrechnung wie der CSG-Ausschnitt selbst), landet also
// automatisch an der richtigen Stelle/Seite, egal welche Wand.
export function DoorLeaf({ u, v, width, height, panelHeight, hinge, color = "#e8eaed" }: DoorLeafProps) {
  const localY = v - panelHeight / 2;
  const hingeEdgeU = hinge === "left" ? u - width / 2 : u + width / 2;
  const handleEdgeU = hinge === "left" ? u + width / 2 - width * 0.12 : u - width / 2 + width * 0.12;
  const hingeHeights = [0.15, 0.5, 0.85].map((f) => localY - height / 2 + f * height);
  const sectionPlane = useSectionPlane();
  const clippingPlanes = sectionPlane ? [sectionPlane] : undefined;

  return (
    <group>
      <mesh position={[u, localY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - LEAF_GAP, height - LEAF_GAP, LEAF_THICKNESS]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} clippingPlanes={clippingPlanes} />
      </mesh>

      {hingeHeights.map((y, i) => (
        <mesh key={i} position={[hingeEdgeU, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.08, 12]} />
          <meshStandardMaterial color={HANDLE_COLOR} roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Griff aussen UND innen - je ein kleiner Block auf beiden Blattseiten. */}
      <mesh position={[handleEdgeU, localY, LEAF_THICKNESS / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.03, 0.12, 0.04]} />
        <meshStandardMaterial color={HANDLE_COLOR} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[handleEdgeU, localY, -(LEAF_THICKNESS / 2 + 0.02)]} castShadow>
        <boxGeometry args={[0.03, 0.12, 0.04]} />
        <meshStandardMaterial color={HANDLE_COLOR} roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  );
}
