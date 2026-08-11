import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewcube, GizmoViewport } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Container } from "./Container";
import { TerrainBackground } from "./TerrainBackground";
import { ViewerToolbar } from "./ViewerToolbar";
import { ViewerLoadingOverlay } from "./ViewerLoadingOverlay";
import { ViewerStatusBar } from "./ViewerStatusBar";
import { MeasureMarkers } from "./MeasureMarkers";
import { useSectionPlane } from "./SectionAndViewPanel";
import { useUnitPreferences } from "../hooks/useUnitPreferences";
import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import { computeMeasurePoints, type MeasurePoint } from "../utils/measurePoints";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { useTheme } from "../context/ThemeContext";
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
  const { theme } = useTheme();

  const isTerrain = background === "terrain";
  // Container.tsx meldet sich per onReady, sobald sein CSG-Aufbau (Waende +
  // Eckbeschlaege) WIRKLICH fertig ist - nicht nur "gemountet" (Container
  // gibt seine 14 Teile selbst stueckweise frei, siehe dort/
  // hooks/useChunkedReveal.ts). Solange das nicht der Fall ist, zeigt das
  // Milchglas-Overlay unten den gestuften Ladezustand.
  const [containerReady, setContainerReady] = useState(false);

  // Jonas' Vorgabe 2026-08-10 ("wie in Inventor Bauteile messen"): erster/
  // zweiter Klick auf einen Messpunkt liefert die Distanz - dritter Klick
  // startet mit diesem Punkt als neuem ersten Punkt neu (kein extra
  // "zuruecksetzen"-Klick noetig). Punkte selbst kommen aus
  // utils/measurePoints.ts (Container-Ecken + Durchbruch-/Tuer-Merkmale),
  // NICHT aus freiem Klicken auf die Mesh-Oberflaeche - siehe MeasureMarkers.tsx
  // fuer die Begruendung (CSG-Restflaechen liefern keine sauberen Kanten/
  // Kreise fuer generisches Snapping).
  const [measureActive, setMeasureActive] = useState(false);
  const [measureSelected, setMeasureSelected] = useState<MeasurePoint[]>([]);
  const measurePoints = useMemo(() => computeMeasurePoints(size, wallThickness, openings), [size, wallThickness, openings]);
  const { prefs: unitPrefs, setPrefs: setUnitPrefs } = useUnitPreferences();

  function handleMeasurePick(p: MeasurePoint) {
    setMeasureSelected((prev) => (prev.length >= 2 ? [p] : prev.some((s) => s.id === p.id) ? prev : [...prev, p]));
  }

  function handleToggleMeasure() {
    setMeasureActive((v) => !v);
    setMeasureSelected([]);
  }

  return (
    // Jonas' Fehlerbericht 2026-08-11 ("Viewer als echtes Fenster"): ViewCube/
    // Fadenkreuz/Werkzeugleiste sassen naeher am unteren Rand als am
    // seitlichen, seit die Fussleiste (ViewerStatusBar) dazukam - Ursache war,
    // dass die Fussleiste bisher ALS OVERLAY (absolute inset-x-0 bottom-0)
    // UEBER dem Canvas lag, waehrend der Canvas selbst weiterhin die VOLLE
    // Hoehe (inklusive der von der Fussleiste optisch verdeckten 24px)
    // einnahm - GizmoHelper (ViewCube/Fadenkreuz) misst seine margin-Werte
    // gegen die ECHTEN Canvas-Pixelmasse, kannte die Fussleiste also gar
    // nicht. Fix: die Fussleiste bekommt jetzt ECHTEN Platz im Layout (flex-
    // Spalte, zweite Zeile) statt eines Overlays - der Canvas-Bereich
    // darueber ist dadurch ein flex-1-Kind mit tatsaechlich kleinerer Hoehe,
    // GizmoHelper/alle absolut positionierten Werkzeug-Elemente (ViewerToolbar)
    // liegen INNERHALB dieses kleineren Bereichs und richten sich dadurch
    // automatisch nach dem echten sichtbaren Viewer-Rahmen aus, nicht mehr
    // nach dem vollen Elternelement.
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
      <Canvas
        shadows={shadowsEnabled}
        gl={{ localClippingEnabled: true }}
        camera={{ position: [cameraDistance, cameraDistance * 0.6, cameraDistance], fov: 45 }}
      >
        {!isTerrain && <color attach="background" args={[theme === "dark" ? "#1e293b" : "#eef2f5"]} />}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 12, 6]}
          intensity={1.2}
          castShadow={shadowsEnabled}
          shadow-mapSize={[2048, 2048]}
        />
        <DisplaySettingsProvider value={{ viewStyle, insideColor, outsideColor, insideUnpainted }}>
          <SectionPlaneProvider value={section.sectionPlane}>
            <Container size={size} wallThickness={wallThickness} openings={openings} onReady={() => setContainerReady(true)} />
          </SectionPlaneProvider>
        </DisplaySettingsProvider>

        {measureActive && (
          <MeasureMarkers points={measurePoints} selected={measureSelected} onPick={handleMeasurePick} unit={unitPrefs.primary} />
        )}

        {/* HDRI-Umgebungsbilder (public/hdri/) - dem Dateinamen nach vermutlich
            von Poly Haven (dort CC0/gemeinfrei) bezogen, aber die genaue
            Bezugsquelle ist im Projekt bisher nicht dokumentiert/bestaetigt -
            vor Live-Schaltung als Unterseite pruefen/bestaetigen. */}
        {isTerrain ? (
          <>
            <TerrainBackground detail={terrainDetail} extentM={containerExtentM} />
            <Environment files="/hdri/rooitou_park_1k.hdr" background={false} />
          </>
        ) : (
          <>
            <Grid args={[40, 40]} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={30} position={[0, 0, 0]} />
            <Environment files="/hdri/studio_small_03_1k.hdr" />
          </>
        )}

        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={2}
          maxDistance={40}
          target={[0, heightM / 2, 0]}
          // Mittlere Maustaste verschiebt die ANSICHT (Jonas' Vorgabe
          // 2026-07-25, am 2026-08-10 nochmal bestaetigt: "die Ansicht soll
          // verschoben werden mit der mittleren Maustaste, aber keine
          // Container/Objekte, nur die Ansicht") - ersetzt das three.js-
          // Standardverhalten (Dolly/Zoom auf der mittleren Taste), Zoom
          // bleibt ueber das Mausrad weiterhin moeglich. Rechte Taste bleibt
          // zusaetzlich Pan. Dass dabei NIE ein Container mitverschoben
          // wird, stellt nicht diese Zuordnung sicher, sondern das
          // e.button===0-Gate in ProjectScene3D.tsx's handlePointerEvent.
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
        {/* Jonas' Vorgabe 2026-08-10: Fadenkreuz unten links (Gegenstueck zum
            ViewCube unten rechts), zeigt die Richtungen X/Y/Z. Die
            ANGEZEIGTEN Beschriftungen weichen bewusst von drei's/three.js'
            tatsaechlicher Achsenbenennung ab (labels-Prop tauscht NUR den
            Text, nicht die echte Geometrie/Kamera-Logik): Jonas nennt die
            Welt-Y-Achse (echte Hoehe, siehe Container.tsx: H liegt auf
            Welt-Y) "Z", und die Welt-Z-Achse (Containerbreite) "Y" -
            "X ist von links nach rechts, Y ist die Tiefe, Z ist die Höhe".
            Jonas' Fehlerbericht 2026-08-10: "soll wie in Inventor sein...
            nur ein Infomaterial, wenn mans braucht" - disabled (keine
            Kamera-Interaktion, reine Anzeige) und hideNegativeAxes (nur 3
            statt 6 Arme) fuer den reduzierten Look, per group scale
            verkleinert (auf GizmoHelper selbst wirkt scale NICHT - das ist
            reines Prop-Durchreichen an eine feste HUD-Kamera, kein normaler
            Szenen-Node). KEIN hideAxisHeads mehr - Jonas' Fehlerbericht:
            "es steht kein X,Y,Z am Kreuz" - drei's GizmoViewport zeichnet
            die Buchstaben-Beschriftung NUR in dieselbe Sprite-Textur wie den
            "Kopf" jeder Achse (siehe node_modules/@react-three/drei/core/
            GizmoViewport.js: AxisHead), hideAxisHeads entfernt beides
            zusammen - es gibt keine Moeglichkeit, nur die Pfeilspitze ohne
            das Label zu verstecken.
            renderPriority={2} auf DIESEM zweiten GizmoHelper ist wichtig:
            drei's Hud-Komponente (beide GizmoHelper nutzen sie intern)
            raeumt bei renderPriority===1 den kompletten Canvas leer und
            zeichnet die Hauptszene neu, BEVOR sie ihren eigenen Inhalt
            zeichnet - zwei GizmoHelper mit demselben Default (1) haben sich
            deshalb gegenseitig ueberschrieben (der zweite hat den ViewCube
            des ersten mit weggeraeumt). Mit renderPriority={2} macht der
            zweite Hud nur noch autoClear=false + zeichnet obendrauf, ohne
            den ViewCube wieder zu loeschen. */}
        <GizmoHelper alignment="bottom-left" margin={[56, 56]} renderPriority={2}>
          <group scale={0.6}>
            <GizmoViewport
              labels={["X", "Z", "Y"]}
              axisColors={["#dc2626", "#16a34a", "#008eb4"]}
              labelColor="white"
              disabled
              hideNegativeAxes
            />
          </group>
        </GizmoHelper>
      </Canvas>

      <ViewerLoadingOverlay contentNotReady={!containerReady} />

      <ViewerToolbar
        onReset={() => controlsRef.current?.reset()}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        section={section}
        viewStyle={viewStyle}
        background={background}
        shadowsEnabled={shadowsEnabled}
        terrainDetail={terrainDetail}
        onViewStyleChange={onViewStyleChange}
        onBackgroundChange={onBackgroundChange}
        onShadowsEnabledChange={onShadowsEnabledChange}
        onTerrainDetailChange={onTerrainDetailChange}
        measureActive={measureActive}
        onToggleMeasure={handleToggleMeasure}
        measureSelected={measureSelected}
        unitPrefs={unitPrefs}
        onChangeUnitPrefs={setUnitPrefs}
      />
      </div>

      {/* Echter Layout-Platz statt Overlay (siehe Begruendung oben) - dadurch
          zieht der Canvas-Bereich sich automatisch um diese Hoehe zusammen,
          statt dass die Fussleiste ihn nur optisch ueberdeckt. */}
      <ViewerStatusBar buildProgress={{ done: containerReady ? 1 : 0, total: 1 }} />
    </div>
  );
}
