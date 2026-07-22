import type { ContainerSize } from "../constants/containerSizes";

interface ContainerProps {
  size: ContainerSize;
}

// Platzhalter-Grundkoerper: ein einfacher Quader in den Aussenmassen des
// gewaehlten Containertyps. Waende werden hier bewusst noch NICHT als
// separate Flaechen modelliert (kommt erst mit der Durchbruch-Logik) -
// dieser Schritt soll nur den drehbaren 3D-Platzhalter liefern.
export function Container({ size }: ContainerProps) {
  return (
    <mesh position={[0, size.height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[size.length, size.height, size.width]} />
      <meshStandardMaterial color="#c2410c" roughness={0.6} metalness={0.4} />
    </mesh>
  );
}
