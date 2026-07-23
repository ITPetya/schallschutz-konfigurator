import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import type { ContainerInstance } from "../config/projectTypes";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { DisplaySettingsProvider, type ViewStyle } from "../context/DisplaySettingsContext";
import { ViewerToolbar } from "./ViewerToolbar";
import { useSectionPlane, SectionAndViewPanel } from "./SectionAndViewPanel";
import type { ContainerSize } from "../constants/containerSizes";

const MM_TO_M = 1 / 1000;

// Fallback-Groesse fuer die Schnitt-Achsenbereiche, solange kein Container
// ausgewaehlt ist (useSectionPlane braucht immer eine gueltige Groesse, der
// Hook kann nicht bedingt aufgerufen werden) - wird nie sichtbar genutzt,
// weil das Schnitt-Panel dann ohnehin den disabledHint statt Reglern zeigt.
const FALLBACK_SIZE: ContainerSize = { length: 7000, width: 2990, height: 2990 };

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
  // Schreibt einen Ansicht-Stil auf ALLE Instanzen gleichzeitig (Jonas'
  // Fehlerbericht 2026-07-25: "kann in der Baugruppen-Ansicht keine Schnitte
  // oder die Ansicht verwalten") - anders als "Schnitt" (bezieht sich immer
  // auf GENAU den ausgewaehlten Container) betrifft "Ansicht" hier bewusst
  // die ganze Baugruppe einheitlich, weil Hintergrund/Schatten ohnehin nur
  // EINMAL fuer die ganze geteilte 3D-Szene existieren koennen.
  // Optional: fehlt im schreibgeschuetzten Konstrukteur-Viewer (Jonas'
  // Vorgabe 2026-07-25), dort soll nichts an der geladenen Baugruppe
  // veraendert werden koennen - das Ansicht-Panel blendet sich dann
  // komplett aus (siehe SectionAndViewPanel.tsx's Gate darauf).
  onSetAllViewStyle?: (v: ViewStyle) => void;
  // Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für strg+z usw."
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
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
  onSetAllViewStyle,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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

  // Siehe Scene.tsx fuer die Begruendung (Home-Button + reset()).
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // "Hintergrund"/"Schatten"/Gelände-Detailstufe gelten fuer die ganze
  // geteilte 3D-Szene (nicht pro Instanz, siehe onSetAllViewStyle-Kommentar
  // oben) - deshalb lokaler Szene-Zustand statt eines Felds pro Container.
  const [background, setBackground] = useState<"studio" | "terrain">("studio");
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [terrainDetail, setTerrainDetail] = useState<"low" | "medium" | "high" | "ultra">("low");
  const isTerrain = background === "terrain";

  const selectedInstance = instances.find((i) => i.id === selectedId) ?? null;
  // "Schnitt" bezieht sich immer auf GENAU den ausgewaehlten Container (siehe
  // sectionDisabledHint unten, falls keiner ausgewaehlt ist) - der Hook
  // braucht trotzdem immer eine gueltige Groesse (Hooks duerfen nicht bedingt
  // aufgerufen werden), FALLBACK_SIZE wird dann aber nie sichtbar genutzt.
  const section = useSectionPlane(selectedInstance?.config.size ?? FALLBACK_SIZE);
  // Der Stil-Toggle im Ansicht-Panel zeigt den Wert der ausgewaehlten Instanz
  // (oder der ersten, falls keine ausgewaehlt) und schreibt beim Klick auf
  // ALLE Instanzen zurueck (siehe onSetAllViewStyle).
  const displayedViewStyle = (selectedInstance ?? instances[0])?.config.viewStyle ?? "realistic";

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
    <div className="relative h-full w-full">
      <Canvas
        shadows={shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
        onPointerMissed={() => onSelect(null)}
      >
        {!isTerrain && <color attach="background" args={["#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />

        {instances.map((inst) => (
          <InstanceGroup
            key={inst.id}
            instance={inst}
            selected={selectedId === inst.id}
            dragging={draggingId === inst.id}
            dragValid={dragValid}
            sectionPlane={inst.id === selectedId ? section.sectionPlane : null}
            onPointerDown={(e) => handlePointerEvent(inst.id, e, "down")}
            onPointerMove={(e) => handlePointerEvent(inst.id, e, "move")}
            onPointerUp={(e) => handlePointerEvent(inst.id, e, "up")}
          />
        ))}

        {isTerrain ? (
          <>
            <TerrainBackground detail={terrainDetail} />
            <Environment preset="park" background={false} />
          </>
        ) : (
          <>
            <Grid args={[60, 60]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={50} position={[0, 0, 0]} />
            <Environment preset="studio" />
          </>
        )}

        {/* Waehrend ein Container per Pointer-Drag verschoben wird, MUSS
            OrbitControls deaktiviert sein: e.stopPropagation() im r3f-
            Pointer-Event stoppt nur die Ausbreitung im r3f/three.js-
            Raycasting-System, nicht aber den nativen DOM-Pointer-Listener,
            den drei's OrbitControls direkt am Canvas-Element registriert -
            ohne dieses Flag rotiert die Kamera waehrend jedes Drags
            gleichzeitig mit (fuehrte zu einer stark verzerrten
            Streifschuss-Ansicht, sichtbar in Playwright-Screenshots waehrend
            des Ziehens). */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={!draggingId}
          minDistance={2}
          maxDistance={80}
          target={[0, 1.2, 0]}
          // Siehe Scene.tsx: mittlere Maustaste verschiebt statt zu dollyen.
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        />
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

      <ViewerToolbar onReset={() => controlsRef.current?.reset()} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />

      <SectionAndViewPanel
        section={section}
        viewStyle={displayedViewStyle}
        background={background}
        shadowsEnabled={shadowsEnabled}
        terrainDetail={terrainDetail}
        onViewStyleChange={onSetAllViewStyle}
        onBackgroundChange={setBackground}
        onShadowsEnabledChange={setShadowsEnabled}
        onTerrainDetailChange={setTerrainDetail}
        sectionDisabledHint={selectedId ? undefined : "Container auswählen, um einen Schnitt zu setzen."}
      />
    </div>
  );
}

interface InstanceGroupProps {
  instance: ContainerInstance;
  selected: boolean;
  dragging: boolean;
  dragValid: boolean;
  // In der LOKALEN Achse der Instanz berechnet (wie in Scene.tsx, wo der
  // Container immer im Weltursprung steht) - three.js' clippingPlanes sind
  // aber IMMER Welt-Koordinaten, unabhaengig vom Mesh/Group-Transform.
  // Deshalb unten mit der eigenen Position/Rotation in eine Welt-Ebene
  // umgerechnet, bevor sie ans Material weitergereicht wird - sonst wuerde
  // ein Schnitt an einem verschobenen/gedrehten Container an der falschen
  // Stelle (relativ zum echten Weltursprung) auftauchen.
  sectionPlane: THREE.Plane | null;
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

function InstanceGroup({ instance, selected, dragging, dragValid, sectionPlane, onPointerDown, onPointerMove, onPointerUp }: InstanceGroupProps) {
  const lengthM = instance.config.size.length * MM_TO_M;
  const widthM = instance.config.size.width * MM_TO_M;
  const xM = instance.position.x * MM_TO_M;
  const zM = instance.position.z * MM_TO_M;
  const rotRad = (instance.rotationY * Math.PI) / 180;

  const footprintColor = dragging && !dragValid ? "#dc2626" : selected ? "#0284c7" : "#94a3b8";
  const footprintOpacity = dragging && !dragValid ? 0.6 : dragging || selected ? 0.4 : 0.12;

  const worldSectionPlane = useMemo(() => {
    if (!sectionPlane) return null;
    const matrix = new THREE.Matrix4().makeRotationY(rotRad);
    matrix.setPosition(xM, 0, zM);
    return sectionPlane.clone().applyMatrix4(matrix);
  }, [sectionPlane, rotRad, xM, zM]);

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
        <SectionPlaneProvider value={worldSectionPlane}>
          <Container size={instance.config.size} wallThickness={instance.config.wallThickness} openings={instance.config.openings} />
        </SectionPlaneProvider>
      </DisplaySettingsProvider>
    </group>
  );
}
