import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Container } from "./Container";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import type { ContainerConfig } from "../config/types";

const MM_TO_M = 1 / 1000;

interface StartPresetThumbnailProps {
  config: ContainerConfig;
  // Live gewaehlte Aussenfarbe der Karte (siehe StartPresetCard.tsx) -
  // bewusst getrennt von config.outsideColor uebergeben, damit ein
  // Farbwechsel den Snapshot neu ausloest, ohne das Preset selbst zu
  // mutieren.
  outsideColor: string;
  sizePx?: number;
}

// Rendert EINMALIG einen echten Snapshot des Presets (transparenter
// Hintergrund, per toDataURL()) und zeigt danach nur noch das statische Bild
// an - Jonas' Vorgabe 2026-08-18: "ein Bild, das automatisch generiert wird,
// ohne Hintergrund". Bewusst NICHT dauerhaft als lebender 3D-Canvas: acht
// Presets gleichzeitig als volle r3f-Szenen (inkl. CSG-Aufbau) waeren fuer
// eine reine Icon-Vorschau unnoetig teuer, siehe SnapshotCapture unten -
// nach dem einmaligen Einfangen wird der Canvas wieder abgebaut.
export function StartPresetThumbnail({ config, outsideColor, sizePx = 252 }: StartPresetThumbnailProps) {
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // Neu einfangen, sobald sich die Aussenfarbe (Klick auf einen der drei
  // Farbpunkte) oder das Preset selbst aendert - siehe StartPresetCard.tsx.
  useEffect(() => {
    setSnapshot(null);
  }, [config, outsideColor]);

  const lengthM = config.size.length * MM_TO_M;
  const widthM = config.size.width * MM_TO_M;
  const heightM = config.size.height * MM_TO_M;
  // Gleiche Herleitung wie Scene.tsx's cameraDistance - Kamera weit genug
  // weg, um das jeweilige Preset (2,99m bis 18m Laenge) komplett einzufangen.
  const cameraDistance = Math.max(lengthM, widthM) * 1.5 + 3;

  const handleCaptured = useCallback((dataUrl: string) => setSnapshot(dataUrl), []);

  return (
    <div style={{ width: sizePx, height: sizePx }} className="mx-auto flex items-center justify-center">
      {snapshot ? (
        <img src={snapshot} alt="" width={sizePx} height={sizePx} className="h-full w-full object-contain" />
      ) : (
        <Canvas
          gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}
          // dpr fest auf 2 (statt geraeteabhaengig): der Snapshot wird nur
          // EINMAL erzeugt und dann als <img> skaliert - eine hoehere,
          // stabile Aufloesung sieht dabei auf jedem Bildschirm scharf aus,
          // ohne AdaptiveDpr/PerformanceMonitor fuer eine derart kurzlebige
          // Szene extra bemuehen zu muessen.
          dpr={2}
          camera={{ position: [cameraDistance, cameraDistance * 0.55, cameraDistance], fov: 40 }}
          style={{ width: sizePx, height: sizePx }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[6, 8, 4]} intensity={1.4} />
          {/* Sanftes Gegenlicht, damit die vom Hauptlicht abgewandte Seite
              nicht komplett dunkel absaeuft - ohne HDRI/Environment (siehe
              Funktionskommentar oben, kein Hintergrund/keine Zusatz-Ladezeit
              fuer eine reine Icon-Vorschau). */}
          <directionalLight position={[-5, 3, -6]} intensity={0.4} />
          {/* Jonas' Fehlerbericht 2026-08-18: "sonst erkennt man nichts" -
              "realistic" lieferte bei Icon-Groesse ohne HDRI/Environment
              (siehe Funktionskommentar oben, bewusst kein Hintergrund/keine
              Ladezeit) einen fast konturlosen Farbklecks. "shaded_edges"
              zeichnet zusaetzlich die Aussenkontur/Durchbruch-Umrandungen
              als eigene Linien (siehe Wall.tsx's edgeGeometry), das macht
              Form/Tueren/Oeffnungen auch klein noch erkennbar. */}
          <DisplaySettingsProvider
            value={{ viewStyle: "shaded_edges", insideColor: config.insideColor, outsideColor, insideUnpainted: config.insideUnpainted ?? false }}
          >
            <SectionPlaneProvider value={null}>
              <group position={[0, -heightM / 2, 0]}>
                <Container
                  size={config.size}
                  wallThickness={config.wallThickness}
                  openings={config.openings}
                  floorThickness={config.floorThickness}
                  floorInsulated={config.floorInsulated}
                  partitionWalls={config.partitionWalls}
                />
              </group>
            </SectionPlaneProvider>
          </DisplaySettingsProvider>
          <SnapshotCapture onCaptured={handleCaptured} />
        </Canvas>
      )}
    </div>
  );
}

// Container.tsx gibt seine Teile ueber useChunkedReveal STUECKWEISE frei
// (siehe dortiger Kommentar) - statt auf dessen onReady zu warten (das wuerde
// hier eine weitere Prop-Kette nur fuers einmalige Einfangen aufziehen),
// reicht fuer eine derart kleine, schnell fertige Vorschau-Szene ein festes
// Abwarten mehrerer Frames: danach ist die komplette (kleine) CSG-Geometrie
// zuverlaessig aufgebaut und mindestens einmal gezeichnet.
const CAPTURE_AFTER_FRAMES = 12;

function SnapshotCapture({ onCaptured }: { onCaptured: (dataUrl: string) => void }) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const captured = useRef(false);

  useFrame(() => {
    if (captured.current) return;
    frameCount.current += 1;
    if (frameCount.current < CAPTURE_AFTER_FRAMES) return;
    captured.current = true;
    // In useFrame ausgefuehrt, NACHDEM r3f diesen Frame bereits gezeichnet
    // hat (r3f rendert nach dem Aufruf aller useFrame-Callbacks desselben
    // Durchlaufs) - toDataURL() liest hier also den Puffer des VORHERIGEN
    // Frames, fuer eine bis dahin laengst eingeschwungene, unbewegte Szene
    // ohne sichtbaren Unterschied.
    onCaptured(gl.domElement.toDataURL("image/png"));
  });

  return null;
}
