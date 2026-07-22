import { useMemo } from "react";
import { Sky, Clouds, Cloud } from "@react-three/drei";

// "Gelände"-Hintergrund (Jonas' Vorgabe 2026-07-22): Wiese, Baeume in
// ferner Distanz, blauer Himmel mit leichter Bewoelkung - Alternative zum
// neutralen "Studio"-Hintergrund. Alles echte 3D-Objekte (kein Foto/Skybox-
// Bild), bewegt sich beim Rotieren also ganz natuerlich mit der Kamera mit,
// genau wie der bisherige Studio-Hintergrund auch schon.
export function TerrainBackground() {
  const trees = useMemo(() => {
    const items: { x: number; z: number; scale: number }[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.15;
      const radius = 16 + (i % 3) * 4;
      items.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.8 + ((i * 37) % 10) / 10,
      });
    }
    return items;
  }, []);

  return (
    <group>
      <Sky sunPosition={[8, 6, 4]} turbidity={3} rayleigh={1.5} mieCoefficient={0.01} mieDirectionalG={0.9} />
      <Clouds limit={20}>
        <Cloud seed={1} segments={20} bounds={[12, 2, 6]} volume={6} color="white" fade={30} position={[-6, 9, -10]} opacity={0.5} />
        <Cloud seed={2} segments={20} bounds={[14, 2, 6]} volume={7} color="white" fade={30} position={[8, 10.5, -14]} opacity={0.4} />
        <Cloud seed={3} segments={16} bounds={[10, 2, 5]} volume={5} color="white" fade={30} position={[2, 8, 12]} opacity={0.35} />
      </Clouds>

      {/* Wiese - grosse mattgruene Flaeche statt/unter dem neutralen Grid. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#5c8a4a" roughness={1} metalness={0} />
      </mesh>

      {/* Baeume in ferner Distanz - einfache Kegel+Zylinder-Baeume ringsum. */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
            <meshStandardMaterial color="#6b4a2f" roughness={1} />
          </mesh>
          <mesh position={[0, 2.6, 0]} castShadow>
            <coneGeometry args={[1.1, 2.6, 8]} />
            <meshStandardMaterial color="#3f6b34" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
