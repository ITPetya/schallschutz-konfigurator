import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Container } from "./Container";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";

interface SceneProps {
  size: ContainerSize;
  openings: Opening[];
}

export function Scene({ size, openings }: SceneProps) {
  const cameraDistance = Math.max(size.length, size.width) * 1.6 + 4;

  return (
    <Canvas
      shadows
      camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
    >
      <color attach="background" args={["#eef2f5"]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 12, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Container size={size} openings={openings} />
      <Grid
        args={[40, 40]}
        cellColor="#cbd5e1"
        sectionColor="#94a3b8"
        fadeDistance={30}
        position={[0, 0, 0]}
      />
      <Environment preset="city" />
      <OrbitControls
        makeDefault
        minDistance={2}
        maxDistance={40}
        target={[0, size.height / 2, 0]}
      />
    </Canvas>
  );
}
