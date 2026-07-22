import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Container } from "./Container";
import type { ContainerSize } from "../constants/containerSizes";

interface SceneProps {
  size: ContainerSize;
}

export function Scene({ size }: SceneProps) {
  const cameraDistance = Math.max(size.length, size.width) * 1.6 + 4;

  return (
    <Canvas
      shadows
      camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
    >
      <color attach="background" args={["#1e293b"]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 12, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Container size={size} />
      <Grid
        args={[40, 40]}
        cellColor="#475569"
        sectionColor="#64748b"
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
