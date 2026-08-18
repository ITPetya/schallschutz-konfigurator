import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Container } from "./Container";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { getCachedThumbnail, setCachedThumbnail } from "../utils/presetThumbnailCache";
import type { ContainerConfig } from "../config/types";

const MM_TO_M = 1 / 1000;

// Kameradistanz-Herleitung, zweite Runde (Jonas' Fehlerbericht 2026-08-18,
// zwei aufeinanderfolgende, gegenlaeufige Rueckmeldungen):
// 1. Urspruenglich (Scene.tsx-Formel) PRO Preset an dessen eigener Laenge
//    berechnet - zoomte kurze Presets automatisch NAEHER heran, lange
//    automatisch WEITER weg, bis beide gleich viel vom eigenen Ausschnitt
//    fuellten. Einzeln gut lesbar, aber jeder Groessenvergleich ZWISCHEN
//    Karten ging verloren ("die groesseren Container sehen kleiner aus").
// 2. Fix Runde 1: EINE feste, geteilte Distanz fuer alle acht Presets,
//    kalibriert auf das laengste (18m) - jetzt technisch "echt
//    massstabsgetreu", aber das kuerzeste Preset (10 Fuß, ~3m) wurde dadurch
//    ca. 6x kleiner dargestellt als das laengste (exaktes Realverhaeltnis
//    18m/2,99m) - "die Vorschau ist dort viel viel zu klein".
// Fix Runde 2 (hier): bewusster Kompromiss statt eines der beiden Extreme -
// wieder PRO Preset berechnet, aber mit einem GROSSEN festen Sockelbetrag
// (9.5) gegenueber einer nur noch flachen Laengen-Steigung (1.25 statt
// vorher 1.5 als voller Multiplikator ohne Sockel) - dadurch faellt der
// Grossteil der Distanz auf den fuer ALLE Presets GLEICHEN Sockel, nur ein
// kleinerer Teil variiert noch mit der tatsaechlichen Laenge. Ergebnis:
// das laengste Preset (18m) bleibt bei ca. 32 (Scene.tsx-aehnliche
// Sicherheitsmarge, damit nichts am Bildrand abgeschnitten wird), das
// kuerzeste (10 Fuß, ~3m) landet bei ca. 13 statt vorher ~30 (Runde 1) oder
// ~7,5 (Original) - sichtbar kleiner als 18m (Groessenverhaeltnis bleibt
// erkennbar, ca. 2,4x statt des extremen echten 6x), aber nicht mehr auf
// einen kaum erkennbaren Punkt zusammengeschrumpft. Feste Werte, kein
// Zusammenhang mehr mit Scene.tsx's Formel - falls sich das
// Preset-Groessenspektrum spaeter aendert (z.B. ein Preset >18m), ggf. neu
// kalibrieren.
const THUMBNAIL_DISTANCE_BASE = 9.5;
const THUMBNAIL_DISTANCE_SLOPE = 1.25;

interface StartPresetThumbnailProps {
  config: ContainerConfig;
  // Live gewaehlte Aussenfarbe der Karte (siehe StartPresetCard.tsx) -
  // bewusst getrennt von config.outsideColor uebergeben, damit ein
  // Farbwechsel den Snapshot neu ausloest, ohne das Preset selbst zu
  // mutieren.
  outsideColor: string;
  // Jonas' Vorgabe 2026-08-18 ("Presets pre-loaden, damit die Karussell-
  // Animation geschmeidig ist"): Schluessel in den geteilten Cache
  // (presetThumbnailCache.ts) - eindeutig pro Preset+Farbe (StartPresetCard.tsx
  // baut ihn aus preset.id + outsideColor). Ein bereits vorhandener Eintrag
  // wird SOFORT angezeigt, kein neuer CSG-Aufbau/Snapshot noetig - das ist
  // der eigentliche Beschleunigungseffekt, den StartPresetCarousel.tsx's
  // Vorlade-Batch (siehe dort) ausnutzt: es rendert alle acht Presets
  // einmalig unsichtbar durch, damit dieser Cache schon gefuellt ist, BEVOR
  // eine Karte durchs Karussell ins Sichtfeld ruckt.
  cacheKey: string;
  sizePx?: number;
}

// Rendert EINMALIG einen echten Snapshot des Presets (transparenter
// Hintergrund, per toDataURL()) und zeigt danach nur noch das statische Bild
// an - Jonas' Vorgabe 2026-08-18: "ein Bild, das automatisch generiert wird,
// ohne Hintergrund". Bewusst NICHT dauerhaft als lebender 3D-Canvas: acht
// Presets gleichzeitig als volle r3f-Szenen (inkl. CSG-Aufbau) waeren fuer
// eine reine Icon-Vorschau unnoetig teuer, siehe SnapshotCapture unten -
// nach dem einmaligen Einfangen wird der Canvas wieder abgebaut.
export function StartPresetThumbnail({ config, outsideColor, cacheKey, sizePx = 324 }: StartPresetThumbnailProps) {
  const [snapshot, setSnapshot] = useState<string | null>(() => getCachedThumbnail(cacheKey) ?? null);

  // Neu einfangen, sobald sich der Cache-Schluessel (Aussenfarbe-Klick auf
  // der Karte, oder ein anderes Preset) aendert - erst im Cache nachsehen
  // (sofortige Anzeige bei Treffer, z.B. weil der Vorlade-Batch das schon
  // erledigt hat oder dieselbe Karte vorher schon einmal sichtbar war),
  // sonst auf null setzen und unten neu rendern/einfangen.
  useEffect(() => {
    setSnapshot(getCachedThumbnail(cacheKey) ?? null);
  }, [cacheKey]);

  const lengthM = config.size.length * MM_TO_M;
  const widthM = config.size.width * MM_TO_M;
  const heightM = config.size.height * MM_TO_M;
  const cameraDistance = THUMBNAIL_DISTANCE_BASE + THUMBNAIL_DISTANCE_SLOPE * Math.max(lengthM, widthM);

  const handleCaptured = useCallback(
    (dataUrl: string) => {
      setCachedThumbnail(cacheKey, dataUrl);
      setSnapshot(dataUrl);
    },
    [cacheKey],
  );

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
