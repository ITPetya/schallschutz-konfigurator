import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Container } from "./Container";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { GeometryCacheScopeContext } from "../utils/geometryCache";
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
// Fix Runde 2: bewusster Kompromiss statt eines der beiden Extreme - wieder
// PRO Preset berechnet, aber mit einem GROSSEN festen Sockelbetrag
// gegenueber einer nur noch flachen Laengen-Steigung - dadurch faellt der
// Grossteil der Distanz auf einen fuer ALLE Presets AEHNLICHEN Sockel, nur
// ein kleinerer Teil variiert noch mit der tatsaechlichen Laenge.
// Fix Runde 3 (Jonas' Fehlerbericht 2026-08-18: "nein, die Container sollen
// nur groesser sein, nicht die ganzen Fenster" - Runde 2 hatte
// faelschlicherweise den ganzen Vorschau-RAHMEN vergroessert, sizePx
// 216->324px in StartPresetCard.tsx, das war NICHT gemeint, siehe dortige
// Rueck-Korrektur): Rahmen/Karte bleiben jetzt unveraendert bei 216px, das
// GEWUENSCHTE "ca. 50% groesser" wird stattdessen ausschliesslich ueber
// staerkeres Heranzoomen (kleinere Kameradistanz) erreicht - Sockel und
// Steigung beide reduziert, das laengste Preset (18m) bewusst bei
// UNVERAENDERTEN ca. 32 belassen (bleibt die sichere obere Grenze, ab der
// nichts mehr am Bildrand abgeschnitten wird), das kuerzeste (10 Fuß) auf
// ca. 9 statt vorher ca. 13 gebracht (Faktor ~1,47, nah an den gewuenschten
// 50%) - je kleiner das Preset, desto staerker der Zoom-Zugewinn, das
// laengste bleibt unangetastet/unveraendert sicher.
// Fix Runde 4 (Jonas' Vorgabe 2026-08-18: "die 3D-Modelle sollen nochmal um
// 50% groesser werden"): Sockel/Steigung diesmal GLEICHMAESSIG um den
// Faktor 1/1,5 (~0,667) reduziert, OHNE das laengste Preset (18m) wie in
// Runde 3 gezielt auszunehmen - Jonas wollte diesmal ausdruecklich alle
// Modelle groesser, nicht nur die kleineren nachziehen. Damit sinkt 18m's
// Distanz von ~32 auf ~21 - das war bisher bewusst die "garantiert nichts
// wird abgeschnitten"-Grenze, jetzt nicht mehr mit derselben Sicherheits-
// marge. Kann in dieser Umgebung nicht visuell geprueft werden (siehe
// Sitzungs-Notizen zu fehlendem WebGL) - beim naechsten Live-Test gezielt
// die laengsten Presets (18m/40 Fuß) auf abgeschnittene Kanten pruefen,
// bei Bedarf Sockel/Steigung fuer genau diese wieder anheben.
const THUMBNAIL_DISTANCE_BASE = 2.94;
const THUMBNAIL_DISTANCE_SLOPE = 1.02;

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
  // Jonas' Fehlerbericht 2026-08-18 ("Previews laden manchmal nicht mehr
  // ganz korrekt, seit ich nach weniger Lag gefragt habe"): der Vorlade-
  // Batch (StartPresetCarousel.tsx) startete den naechsten unsichtbaren
  // Preset-Aufbau bisher zeitbasiert (erst fester Timer, dann
  // requestIdleCallback) - beide Varianten koennen den naechsten Aufbau
  // STARTEN, waehrend der vorherige (bzw. ein sichtbarer Karten-Aufbau)
  // noch laeuft, wenn die geschaetzte Wartezeit/der vermeintliche Leerlauf
  // nicht zur tatsaechlichen Bauzeit passt - zwei gleichzeitige CSG-Aufbauten
  // koennen sich dann sichtbar gegenseitig stoeren. onDone feuert ECHT erst,
  // wenn DIESE Instanz tatsaechlich fertig ist (frisch eingefangen ODER
  // sofort per Cache-Treffer) - der Vorlade-Batch startet den naechsten
  // Preset-Aufbau jetzt NUR noch darauf, nie mehr auf eine Zeitschaetzung.
  onDone?: () => void;
}

// Rendert EINMALIG einen echten Snapshot des Presets (transparenter
// Hintergrund, per toDataURL()) und zeigt danach nur noch das statische Bild
// an - Jonas' Vorgabe 2026-08-18: "ein Bild, das automatisch generiert wird,
// ohne Hintergrund". Bewusst NICHT dauerhaft als lebender 3D-Canvas: acht
// Presets gleichzeitig als volle r3f-Szenen (inkl. CSG-Aufbau) waeren fuer
// eine reine Icon-Vorschau unnoetig teuer - nach dem einmaligen Einfangen
// wird der Canvas wieder abgebaut. Der Zeitpunkt des Einfangens wartet auf
// Container.tsx's echtes onReady statt (wie urspruenglich) eine geratene
// Frame-Anzahl abzuwarten - siehe SnapshotCapture unten fuer die volle
// Begruendung (Jonas' Fehlerbericht 2026-08-19: Dach/Boden fehlten
// manchmal im fertigen Snapshot).
export function StartPresetThumbnail({ config, outsideColor, cacheKey, sizePx = 216, onDone }: StartPresetThumbnailProps) {
  // Jonas' Fehlerbericht 2026-08-18 ("Container laden vollstaendig und dann
  // verschwinden Bauteile wieder") - siehe GeometryCacheScopeContext-
  // Kommentar in geometryCache.ts fuer die volle Begruendung: eine pro Mount
  // eindeutige ID isoliert den CSG-Geometrie-Cache dieser kurzlebigen
  // Vorschau-Instanz komplett vom app-weit geteilten Cache, damit ihr
  // schnelles Mounten/Einfangen/Unmounten nie mit echten, dauerhaften
  // Containern anderswo in der App interferieren kann.
  const geometryScope = useId();
  const [snapshot, setSnapshot] = useState<string | null>(() => getCachedThumbnail(cacheKey) ?? null);
  // Jonas' Fehlerbericht 2026-08-19: Dach und/oder Boden fehlten manchmal
  // komplett im fertigen Snapshot - siehe containerReady/SnapshotCapture-
  // Kommentare unten fuer die volle Begruendung (echte Fertigstellung statt
  // einer geratenen Frame-Anzahl).
  const [containerReady, setContainerReady] = useState(false);

  // Meldet echte Fertigstellung nach oben (siehe onDone-Kommentar oben) -
  // laeuft bei JEDEM Uebergang von "noch kein Bild" auf "Bild da", egal ob
  // durch einen frischen Snapshot (handleCaptured) oder einen sofortigen
  // Cache-Treffer (Initialwert oben, oder der Effekt weiter unten bei
  // Cache-Key-Wechsel) ausgeloest - onDone bewusst NICHT in den Deps (kann
  // bei jedem Render eine neue Funktionsreferenz vom Aufrufer sein), soll
  // nur auf eine echte snapshot-Aenderung reagieren.
  useEffect(() => {
    if (snapshot) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  // Neu einfangen, sobald sich der Cache-Schluessel (Aussenfarbe-Klick auf
  // der Karte, oder ein anderes Preset) aendert - erst im Cache nachsehen
  // (sofortige Anzeige bei Treffer, z.B. weil der Vorlade-Batch das schon
  // erledigt hat oder dieselbe Karte vorher schon einmal sichtbar war),
  // sonst auf null setzen und unten neu rendern/einfangen.
  useEffect(() => {
    setContainerReady(false);
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
  const handleContainerReady = useCallback(() => setContainerReady(true), []);

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
          <GeometryCacheScopeContext.Provider value={geometryScope}>
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
                    onReady={handleContainerReady}
                  />
                </group>
              </SectionPlaneProvider>
            </DisplaySettingsProvider>
          </GeometryCacheScopeContext.Provider>
          <SnapshotCapture ready={containerReady} onCaptured={handleCaptured} />
        </Canvas>
      )}
    </div>
  );
}

// Jonas' Fehlerbericht 2026-08-19: "Container laden vollstaendig, aber Dach
// und/oder Boden fehlen manchmal komplett im fertigen Snapshot" - betraf
// urspruenglich (Runde 1, siehe Git-Historie) EIN festes Abwarten mehrerer
// Frames (die Annahme "eine derart kleine Szene ist immer nach N Frames
// fertig") STATT auf Container.tsx's echtes onReady zu warten. Diese Annahme
// war falsch: Container.tsx gibt seine ~14-15 Teile ueber useChunkedReveal
// ADAPTIV/zeitbasiert frei (siehe dortiger Kommentar) - unter genug
// Hintergrundlast (z. B. waehrend der Vorlade-Batch in StartPresetCarousel.tsx
// gleichzeitig weitere Presets aufbaut) kann das laenger dauern als jede
// fest geratene Frame-Zahl, egal wie grosszuegig gewaehlt. Jetzt wird
// stattdessen auf Container.tsx's eigenes onReady gewartet (ready-Prop,
// siehe handleContainerReady in StartPresetThumbnail) - das feuert
// garantiert erst, wenn WIRKLICH alle Teile gemountet sind, unabhaengig von
// Timing/Systemlast. SETTLE_FRAMES_AFTER_READY wartet zusaetzlich noch ein
// paar Frames NACH ready, weil onReady in einem useEffect feuert (also NACH
// dem Commit) - der zuletzt gemountete Teil braucht noch einen echten
// r3f-Zeichendurchlauf, bevor toDataURL() ihn tatsaechlich im Puffer sieht.
const SETTLE_FRAMES_AFTER_READY = 3;

function SnapshotCapture({ ready, onCaptured }: { ready: boolean; onCaptured: (dataUrl: string) => void }) {
  const { gl } = useThree();
  const settleFrames = useRef(0);
  const captured = useRef(false);

  useFrame(() => {
    if (captured.current || !ready) return;
    settleFrames.current += 1;
    if (settleFrames.current < SETTLE_FRAMES_AFTER_READY) return;
    captured.current = true;
    // In useFrame ausgefuehrt, NACHDEM r3f diesen Frame bereits gezeichnet
    // hat (r3f rendert nach dem Aufruf aller useFrame-Callbacks desselben
    // Durchlaufs) - toDataURL() liest hier also den Puffer des VORHERIGEN
    // Frames, fuer eine zu diesem Zeitpunkt laengst eingeschwungene,
    // unbewegte Szene ohne sichtbaren Unterschied.
    onCaptured(gl.domElement.toDataURL("image/png"));
  });

  return null;
}
