import { useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import { ViewerToolbar } from "./ViewerToolbar";
import { useSectionPlane, SectionAndViewPanel } from "./SectionAndViewPanel";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import {
  DisplaySettingsProvider,
  type BackgroundStyle,
  type TerrainDetail,
  type ViewStyle,
} from "../context/DisplaySettingsContext";

interface SceneProps {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  insideColor: string;
  outsideColor: string;
  insideUnpainted: boolean;
  // Jonas' Vorgabe 2026-07-24: Schatten abschaltbar. Steuert direkt
  // <Canvas shadows={...}> - deaktiviert damit den Shadow-Map-Pass des
  // Renderers global, kein Umweg ueber einzelne Mesh-Props noetig.
  shadowsEnabled: boolean;
  // Jonas' Vorgabe 2026-07-25: 4 Detailstufen fuer den "Gelände"-Hintergrund
  // (siehe TerrainBackground.tsx) - nur relevant/sichtbar, wenn background
  // bereits "terrain" ist, faellt sonst auf "low" zurueck.
  terrainDetail: TerrainDetail;
  // Jonas' Vorgabe 2026-07-24: das "Ansicht"-Panel (Realistisch/Schattiert
  // mit Kanten, Hintergrund, Schatten) zieht aus der Seitenleiste in den
  // Viewer, direkt neben "Schnitt" - deshalb braucht Scene jetzt auch
  // Schreibzugriff (vorher nur lesend als Anzeige-Props). Optional: im
  // readonly-Viewer gibt es diese Steuerung nicht.
  onViewStyleChange?: (v: ViewStyle) => void;
  onBackgroundChange?: (b: BackgroundStyle) => void;
  onShadowsEnabledChange?: (v: boolean) => void;
  onTerrainDetailChange?: (d: TerrainDetail) => void;
  // Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für strg+z usw." -
  // optional, weil der schreibgeschuetzte Viewer (KonfiguratorPage.tsx)
  // nichts rueckgaengig machen kann.
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const MM_TO_M = 1 / 1000;

// Relative Richtungen statt Himmelsrichtungen (Jonas' Fehlerbericht
// 2026-07-23, siehe types/openings.ts) - Reihenfolge entspricht weiterhin
// GizmoViewcube's Erwartung (+X,-X,+Y,-Y,+Z,-Z): +X=Vorne (vorher Sueden),
// -X=Hinten (vorher Norden), +Z=Links (vorher Osten), -Z=Rechts (vorher
// Westen), Oben/Unten unveraendert.
const VIEWCUBE_FACES = ["Vorne", "Hinten", "Oben", "Unten", "Links", "Rechts"];

export function Scene({
  size,
  wallThickness,
  openings,
  viewStyle,
  background,
  insideColor,
  outsideColor,
  insideUnpainted,
  shadowsEnabled,
  terrainDetail,
  onViewStyleChange,
  onBackgroundChange,
  onShadowsEnabledChange,
  onTerrainDetailChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: SceneProps) {
  // Kamera/Grid/Schnittebene rechnen intern in Metern (Three.js-Konvention,
  // siehe Container.tsx) - size kommt in mm an (Jonas' Vorgabe 2026-07-22).
  const lengthM = size.length * MM_TO_M;
  const widthM = size.width * MM_TO_M;
  const heightM = size.height * MM_TO_M;
  const cameraDistance = Math.max(lengthM, widthM) * 1.6 + 4;
  // Halbe Grundriss-Diagonale (Meter) - Reichweite des Containers ab dem
  // Ursprung, siehe TerrainBackground.tsx's extentM.
  const containerExtentM = Math.hypot(lengthM, widthM) / 2;

  // Fuer den Home-Button (Jonas' Vorgabe 2026-07-25: "wie bei Inventor")
  // neben dem ViewCube - OrbitControls' eingebautes reset() faehrt Kamera
  // und target auf genau die Werte zurueck, die beim ERSTEN Rendern dieser
  // Controls galten (position0/target0, siehe three-stdlib), das passt
  // hier automatisch, weil Kamera/target unten unveraendert aus den Props
  // kommen und sich nur bei einer echten Groessenaenderung neu aufbauen.
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Schnitt-Logik (Zustand + Ebenenberechnung) ausgelagert, damit
  // ProjectScene3D.tsx dieselbe Logik fuer den ausgewaehlten Baugruppen-
  // Container wiederverwenden kann, siehe SectionAndViewPanel.tsx.
  const section = useSectionPlane(size);

  const isTerrain = background === "terrain";

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
      >
        {!isTerrain && <color attach="background" args={["#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />
        <DisplaySettingsProvider value={{ viewStyle, insideColor, outsideColor, insideUnpainted }}>
          <SectionPlaneProvider value={section.sectionPlane}>
            <Container size={size} wallThickness={wallThickness} openings={openings} />
          </SectionPlaneProvider>
        </DisplaySettingsProvider>

        {isTerrain ? (
          <>
            <TerrainBackground detail={terrainDetail} extentM={containerExtentM} />
            <Environment preset="park" background={false} />
          </>
        ) : (
          <>
            <Grid args={[40, 40]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={30} position={[0, 0, 0]} />
            <Environment preset="studio" />
          </>
        )}

        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={2}
          maxDistance={40}
          target={[0, heightM / 2, 0]}
          // Mittlere Maustaste verschiebt die Ansicht (Jonas' Vorgabe
          // 2026-07-25: "am PC mit der mittleren Maustaste die Ansicht
          // verschieben können, das geht am Handy/iPad schon mit zwei
          // Fingern") - ersetzt das three.js-Standardverhalten (Dolly/Zoom
          // auf der mittleren Taste), Zoom bleibt ueber das Mausrad
          // weiterhin moeglich. Rechte Taste bleibt zusaetzlich Pan.
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        />
        {/* Inventor-artiger ViewCube (Jonas' Vorgabe 2026-07-22): hellgrau,
            halbtransparent, unten rechts im Viewer. */}
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
        viewStyle={viewStyle}
        background={background}
        shadowsEnabled={shadowsEnabled}
        terrainDetail={terrainDetail}
        onViewStyleChange={onViewStyleChange}
        onBackgroundChange={onBackgroundChange}
        onShadowsEnabledChange={onShadowsEnabledChange}
        onTerrainDetailChange={onTerrainDetailChange}
      />
    </div>
  );
}
