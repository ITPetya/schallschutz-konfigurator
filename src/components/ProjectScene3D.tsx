import { useMemo } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { Container } from "./Container";
import type { ContainerInstance } from "../config/projectTypes";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";

const MM_TO_M = 1 / 1000;

// Gleicher ViewCube-Stil wie Scene.tsx (Einzelcontainer-Konfigurator) - siehe
// dort fuer die Herleitung der Bezeichnungen/Reihenfolge.
const VIEWCUBE_FACES = ["Vorne", "Hinten", "Oben", "Unten", "Links", "Rechts"];

// Wandelt einen Kamera-Strahl (aus einem r3f-Pointer-Event) in die
// Schnittkoordinate mit der Bodenebene (Welt-Y=0) um - GENAUER als
// event.point (das nur die Position auf dem tatsaechlich getroffenen Mesh
// waere), funktioniert deshalb auch waehrend des Ziehens zuverlaessig, wenn
// der Cursor durch die Bewegung nicht mehr exakt ueber dem urspruenglichen
// Mesh steht (Pointer Capture haelt die Events am Mesh, der Strahl selbst
// bleibt aber immer korrekt).
function rayToGroundXZ(ray: THREE.Ray): { x: number; z: number } {
  const t = ray.direction.y !== 0 ? -ray.origin.y / ray.direction.y : 0;
  return { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
}

export interface ProjectScene3DHandlers {
  onSelect: (id: string | null) => void;
  onPointerDown: (id: string, ground: { x: number; z: number }) => void;
  onPointerMove: (id: string, ground: { x: number; z: number }) => void;
  onPointerUp: (id: string) => void;
}

interface ProjectScene3DProps extends ProjectScene3DHandlers {
  instances: ContainerInstance[];
  selectedId: string | null;
  draggingId: string | null;
  dragValid: boolean;
}

// 3D-Ansicht der Baugruppe (Jonas' Vorgabe 2026-07-25: "soll auch einen 3D
// Viewer haben nicht so komisch 2D") - ersetzt die bisherige SVG-Draufsicht.
// Jede Instanz bekommt ein unsichtbares/halbtransparentes Grundriss-Rechteck
// auf Bodenhoehe (Drag-Ziel + Kollisions-Faerbung, siehe InstanceGroup unten)
// UNTER dem echten 3D-Container (wiederverwendet die bestehende
// Container-Komponente unveraendert) - dadurch bleibt die Interaktion
// (Ziehen, Ausrichten, Kollision) exakt dieselbe wie vorher in der 2D-Ansicht
// (siehe collision.ts/computeMate-/computeFlushPosition in WorkspacePage.tsx),
// nur jetzt in echtem 3D sichtbar statt in einer Draufsicht.
export function ProjectScene3D({
  instances,
  selectedId,
  draggingId,
  dragValid,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: ProjectScene3DProps) {
  const cameraDistance = useMemo(() => {
    if (instances.length === 0) return 14;
    let maxReach = 6;
    for (const inst of instances) {
      const reachMm = Math.hypot(inst.position.x, inst.position.z) + Math.hypot(inst.config.size.length, inst.config.size.width) / 2;
      maxReach = Math.max(maxReach, reachMm * MM_TO_M);
    }
    return maxReach * 1.3 + 4;
  }, [instances]);

  function handlePointerEvent(id: string, e: ThreeEvent<PointerEvent>, action: "down" | "move" | "up") {
    e.stopPropagation();
    if (action === "down") {
      (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
      onSelect(id);
      onPointerDown(id, rayToGroundXZ(e.ray));
    } else if (action === "move") {
      onPointerMove(id, rayToGroundXZ(e.ray));
    } else {
      onPointerUp(id);
    }
  }

  return (
    <Canvas
      shadows
      gl={{ localClippingEnabled: true }}
      camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#eef2f5"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 12, 6]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />

      {instances.map((inst) => (
        <InstanceGroup
          key={inst.id}
          instance={inst}
          selected={selectedId === inst.id}
          dragging={draggingId === inst.id}
          dragValid={dragValid}
          onPointerDown={(e) => handlePointerEvent(inst.id, e, "down")}
          onPointerMove={(e) => handlePointerEvent(inst.id, e, "move")}
          onPointerUp={(e) => handlePointerEvent(inst.id, e, "up")}
        />
      ))}

      <Grid args={[60, 60]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={50} position={[0, 0, 0]} />
      <Environment preset="studio" />

      {/* Waehrend ein Container per Pointer-Drag verschoben wird, MUSS
          OrbitControls deaktiviert sein: e.stopPropagation() im r3f-
          Pointer-Event stoppt nur die Ausbreitung im r3f/three.js-
          Raycasting-System, nicht aber den nativen DOM-Pointer-Listener,
          den drei's OrbitControls direkt am Canvas-Element registriert -
          ohne dieses Flag rotiert die Kamera waehrend jedes Drags
          gleichzeitig mit (fuehrte zu einer stark verzerrten
          Streifschuss-Ansicht, sichtbar in Playwright-Screenshots waehrend
          des Ziehens). */}
      <OrbitControls makeDefault enabled={!draggingId} minDistance={2} maxDistance={80} target={[0, 1.2, 0]} />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewcube
          faces={VIEWCUBE_FACES}
          color="#e2e8f0"
          hoverColor="#008eb4"
          textColor="#075471"
          strokeColor="#94a3b8"
          opacity={0.75}
        />
      </GizmoHelper>
    </Canvas>
  );
}

interface InstanceGroupProps {
  instance: ContainerInstance;
  selected: boolean;
  dragging: boolean;
  dragValid: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
}

// Rand, um den das Grundriss-Rechteck ueber die tatsaechliche
// Container-Grundflaeche hinaussteht (Meter). Ohne diesen Rand liegt die
// Flaeche exakt unter dem opaken Container und ist aus JEDER normalen
// (erhoehten/isometrischen) Kamera-Perspektive komplett unsichtbar - das
// Kollisions-Rot war dadurch beim Ziehen nie zu sehen (bestaetigt per
// Playwright-Screenshot waehrend einer echten Kollision: kein Rot
// erkennbar). Mit Rand ragt ein farbiger Streifen rundum unter dem
// Container hervor und bleibt so aus jedem Blickwinkel sichtbar.
const FOOTPRINT_MARGIN_M = 0.6;

function InstanceGroup({ instance, selected, dragging, dragValid, onPointerDown, onPointerMove, onPointerUp }: InstanceGroupProps) {
  const lengthM = instance.config.size.length * MM_TO_M;
  const widthM = instance.config.size.width * MM_TO_M;
  const xM = instance.position.x * MM_TO_M;
  const zM = instance.position.z * MM_TO_M;
  const rotRad = (instance.rotationY * Math.PI) / 180;

  const footprintColor = dragging && !dragValid ? "#dc2626" : selected ? "#0284c7" : "#94a3b8";
  const footprintOpacity = dragging && !dragValid ? 0.6 : dragging || selected ? 0.4 : 0.12;

  return (
    <group position={[xM, 0, zM]} rotation={[0, rotRad, 0]}>
      {/* Grundriss-Rechteck auf Bodenhoehe - der eigentliche Drag-/Auswahl-
          Hit-Bereich (groesser, verlaesslicher Treffer als der Container
          selbst) und Kollisions-Farbfeedback. Ragt bewusst ueber die
          Container-Grundflaeche hinaus (siehe FOOTPRINT_MARGIN_M). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <planeGeometry args={[lengthM + FOOTPRINT_MARGIN_M, widthM + FOOTPRINT_MARGIN_M]} />
        <meshBasicMaterial color={footprintColor} transparent opacity={footprintOpacity} depthWrite={false} />
      </mesh>

      <DisplaySettingsProvider
        value={{
          viewStyle: instance.config.viewStyle,
          insideColor: instance.config.insideColor,
          outsideColor: instance.config.outsideColor,
          insideUnpainted: instance.config.insideUnpainted ?? false,
        }}
      >
        <SectionPlaneProvider value={null}>
          <Container size={instance.config.size} wallThickness={instance.config.wallThickness} openings={instance.config.openings} />
        </SectionPlaneProvider>
      </DisplaySettingsProvider>
    </group>
  );
}
