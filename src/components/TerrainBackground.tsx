import { useMemo } from "react";
import * as THREE from "three";
import { Sky, Clouds, Cloud } from "@react-three/drei";
import type { TerrainDetail } from "../context/DisplaySettingsContext";

// "Gelände"-Hintergrund (Jonas' Vorgabe 2026-07-22): Wiese, Baeume in
// ferner Distanz, blauer Himmel mit leichter Bewoelkung - Alternative zum
// neutralen "Studio"-Hintergrund. Alles echte 3D-Objekte (kein Foto/Skybox-
// Bild), bewegt sich beim Rotieren also ganz natuerlich mit der Kamera mit,
// genau wie der bisherige Studio-Hintergrund auch schon.
//
// 4 Detailstufen (Jonas' Vorgabe 2026-07-25): "niedrig" ist der bisherige,
// unveraenderte Stand - die anderen drei skalieren Baumzahl, Segmentzahlen
// und Wolken schrittweise hoch, "hochaufloesend" bekommt zusaetzlich ein
// echtes (wenn auch einfaches, sinusbasiertes statt Noise-Textur-basiertes)
// Bodenrelief statt einer komplett flachen Wiese - bewusst weiterhin rein
// prozedural, keine externen Texturen/Assets, gleiche Linie wie der Rest
// dieser Komponente. TerrainDetail selbst lebt in DisplaySettingsContext.tsx
// (siehe dort fuer die Begruendung).
interface DetailParams {
  treeCount: number;
  groundSegments: number;
  treeConeSegments: number;
  treeCylinderSegments: number;
  cloudCount: number;
  cloudSegments: number;
  groundRelief: boolean;
}

const DETAIL_PARAMS: Record<TerrainDetail, DetailParams> = {
  low: { treeCount: 14, groundSegments: 48, treeConeSegments: 8, treeCylinderSegments: 6, cloudCount: 3, cloudSegments: 20, groundRelief: false },
  medium: { treeCount: 26, groundSegments: 64, treeConeSegments: 10, treeCylinderSegments: 8, cloudCount: 5, cloudSegments: 24, groundRelief: false },
  high: { treeCount: 42, groundSegments: 96, treeConeSegments: 12, treeCylinderSegments: 10, cloudCount: 7, cloudSegments: 28, groundRelief: true },
  ultra: { treeCount: 70, groundSegments: 160, treeConeSegments: 16, treeCylinderSegments: 12, cloudCount: 9, cloudSegments: 32, groundRelief: true },
};

// Sehr sanftes, rein prozedurales Bodenrelief (Summe zweier Sinuswellen
// statt einer echten Noise-Textur) - bewusst dezent, damit der Container
// selbst weiter sichtbar auf ebenem Grund zu stehen scheint; wird nur ab
// "detailliert" ueberhaupt angewendet.
function applyGroundRelief(geometry: THREE.CircleGeometry) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // vor der Rotation liegt die Kreisflaeche in der XY-Ebene
    const dist = Math.hypot(x, y);
    // Nahe der Mitte (wo der Container steht) bleibt es flach, das Relief
    // waechst erst ab einigem Abstand - kein hoeckriger Boden UNTER dem Container.
    const falloff = Math.min(1, Math.max(0, (dist - 6) / 10));
    const height = (Math.sin(x * 0.18) * Math.cos(y * 0.15) * 0.35 + Math.sin(x * 0.4 + y * 0.3) * 0.12) * falloff;
    pos.setZ(i, height);
  }
  geometry.computeVertexNormals();
}

export function TerrainBackground({ detail = "low" }: { detail?: TerrainDetail }) {
  const params = DETAIL_PARAMS[detail];

  const trees = useMemo(() => {
    const items: { x: number; z: number; scale: number }[] = [];
    for (let i = 0; i < params.treeCount; i++) {
      const angle = (i / params.treeCount) * Math.PI * 2 + (i % 2) * 0.15;
      const radius = 16 + (i % 3) * 4;
      items.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.8 + ((i * 37) % 10) / 10,
      });
    }
    return items;
  }, [params.treeCount]);

  const groundGeometry = useMemo(() => {
    const geom = new THREE.CircleGeometry(60, params.groundSegments);
    if (params.groundRelief) applyGroundRelief(geom);
    return geom;
  }, [params.groundSegments, params.groundRelief]);

  const cloudSeeds = useMemo(
    () =>
      Array.from({ length: params.cloudCount }, (_, i) => ({
        seed: i + 1,
        bounds: [10 + (i % 3) * 2, 2, 5 + (i % 2) * 1.5] as [number, number, number],
        volume: 5 + (i % 4),
        opacity: 0.28 + ((i * 13) % 25) / 100,
        position: [-10 + i * 3.2, 8 + (i % 3) * 1.4, -14 + (i % 4) * 6] as [number, number, number],
      })),
    [params.cloudCount],
  );

  return (
    <group>
      <Sky sunPosition={[8, 6, 4]} turbidity={3} rayleigh={1.5} mieCoefficient={0.01} mieDirectionalG={0.9} />
      <Clouds limit={Math.max(20, params.cloudCount + 5)}>
        {cloudSeeds.map((c) => (
          <Cloud
            key={c.seed}
            seed={c.seed}
            segments={params.cloudSegments}
            bounds={c.bounds}
            volume={c.volume}
            color="white"
            fade={30}
            position={c.position}
            opacity={c.opacity}
          />
        ))}
      </Clouds>

      {/* Wiese - grosse mattgruene Flaeche statt/unter dem neutralen Grid. */}
      <mesh geometry={groundGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <meshStandardMaterial color="#5c8a4a" roughness={1} metalness={0} />
      </mesh>

      {/* Baeume in ferner Distanz - einfache Kegel+Zylinder-Baeume ringsum. */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 2, params.treeCylinderSegments]} />
            <meshStandardMaterial color="#6b4a2f" roughness={1} />
          </mesh>
          <mesh position={[0, 2.6, 0]} castShadow>
            <coneGeometry args={[1.1, 2.6, params.treeConeSegments]} />
            <meshStandardMaterial color="#3f6b34" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
