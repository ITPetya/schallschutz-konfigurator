import { Component, StrictMode, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Container } from "../components/Container";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { GeometryCacheScopeContext } from "../utils/geometryCache";
import { START_PRESETS, type StartPreset } from "../constants/startPresets";
import { RAL_STANDARD_COLORS, findRalColorByCode, findNearestRalColor, RAL_SPECIAL_COLORS } from "../constants/ralColors";
import { ColorWheelPicker } from "./ColorWheelPicker";
import { PersonalizeButton } from "./PersonalizeButton";
import type { ContainerConfig } from "../config/types";
import { APP_VERSION } from "../config/appVersion";

// Jonas' Vorgabe 2026-08-19: der 3D-Viewer soll eigenstaendig (z.B. per
// <iframe>) in eine fremde Webseite einbettbar sein - urspruenglich als
// reine, unbedienbare Ansicht (drehbar per Maus), jetzt erweitert um echte
// Bedienelemente: Standardfarben-Punkte + Farbrad (siehe ColorWheelPicker.tsx),
// eine Preset-Auswahl, und einen "Personalisieren"-Button, der mit dem
// gerade gewaehlten Preset+Farbe direkt im vollen Studio landet (siehe
// PersonalizeButton.tsx + WorkspacePage.tsx's neuer ?preset=-URL-Fallback).
// Eigener Vite-Build-Eintrag (siehe vite.config.ts, viewer.html) statt einer
// Route in der Haupt-App: dadurch zieht dieses Bundle NICHTS von
// react-router-dom/radix-ui/motion/den ~55 Bearbeitungs-Panels aus
// src/components/ mit, nur die bereits von Haus aus entkoppelte Render-Kette
// (Container.tsx und alles darunter haengt an keinerlei App-/Routing-/
// Layout-Code) plus react-three-fiber/drei/three-bvh-csg selbst. Die neuen
// Bedienelemente hier sind bewusst reines Inline-Styling (kein Tailwind/
// index.css-Import, siehe viewer.html) - eigenstaendig genug, dass sich das
// nicht lohnt fuer eine Handvoll Buttons/Punkte.

const MM_TO_M = 1 / 1000;

// Siehe StartPresetThumbnail.tsx fuer die Herleitung dieser Formel (dort
// ueber mehrere Runden anhand aller 8 Presets kalibriert) - hier als
// Startpunkt uebernommen. ACHTUNG: dort auf eine feste kleine
// Vorschau-Kachelgroesse abgestimmt, nicht auf ein beliebiges
// iframe-Seitenverhaeltnis - bei Bedarf nach dem ersten echten
// Live-Test in einem Browser (kein WebGL in der Entwicklungsumgebung
// dieser Session) hier eigenstaendig nachjustieren, ohne die
// Vorschaubild-Konstanten drueben anzufassen.
const VIEWER_DISTANCE_BASE = 2.94;
const VIEWER_DISTANCE_SLOPE = 1.02;

// Jonas' Vorgabe 2026-08-19: "die Buttons muessen sich mit der
// Fenstergroesse auch anpassen. Die Farbwahl-Buttons und der Colorpicker
// sind bei 420er Hoehe gut, aber die Auswahl-Buttons fuer Preset und
// Konfigurieren eher bei 320er Hoehe" - zwei GETRENNTE Referenzhoehen
// (nicht eine gemeinsame), weil die linke Farbgruppe und die rechte
// Preset-/Personalisieren-Gruppe bei EXAKT derselben Einbettungshoehe
// (420px) unterschiedlich richtig gross wirken - jede Gruppe skaliert
// deshalb relativ zu ihrer EIGENEN kalibrierten Referenz. clamp() verhindert
// absurd winzige/riesige Bedienelemente bei sehr kleinen/grossen Embeds.
const COLOR_CONTROLS_REFERENCE_HEIGHT = 420;
const TOP_CONTROLS_REFERENCE_HEIGHT = 320;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.7;

// Jonas' Vorgabe 2026-08-19: "standardmaessig soll das helle Blau von der
// Webseite sein, das sieht dann cool aus" - --color-brand-light aus
// index.css. Der Konfigurator kennt aber nur echte RAL-Toene (siehe
// getRalNameForHex-Kommentar in ralColors.ts), deshalb auf den
// naechstliegenden RAL-Sonderton eingerastet statt den rohen Marken-Hex-Wert
// direkt als Aussenfarbe zu verwenden - dieselbe findNearestRalColor-Logik
// wie im Farbrad selbst.
const BRAND_LIGHT_BLUE = "#71c8dd";
const DEFAULT_ACCENT_COLOR = findNearestRalColor(BRAND_LIGHT_BLUE, RAL_SPECIAL_COLORS).hex;

// Jonas' Vorgabe 2026-08-19: "sortiere die Previews nach Groesse und Art,
// also nicht wie bei der Startseite vom eigentlichen Konfigurator, sondern
// die Dropdown-Liste gescheit sortiert" - START_PRESETS selbst bleibt
// UNVERAENDERT in seiner eigenen, absichtlich handkuratierten Reihenfolge
// (Jonas' Vorgabe 2026-08-18 fuer die Start-Seiten-Karten, siehe
// startPresets.ts), hier nur eine SEPARATE Kopie speziell fuer dieses
// Embed. Fehlerbericht 2026-08-19 (Runde 2, nach erstem Live-Test): reine
// Sortierung nach Laenge allein reisst die Fuss-Familie auseinander (40ft
// = 12192mm faellt dabei zwischen 12m und 15m) - "10ft, 20ft, 40ft sollte
// so sein, aber 40ft ist irgendwo." Jetzt echte zweistufige Sortierung:
// zuerst nach Art (Fuss-Praesets VOR Meter-Praesets, per id-Endung "ft"
// erkannt), erst INNERHALB jeder Gruppe nach Laenge aufsteigend - ergibt
// "10ft, 20ft, 40ft, 7m, 9,6m, 12m, 15m, 18m".
function isFeetPreset(preset: StartPreset): boolean {
  return preset.id.endsWith("ft");
}
const SORTED_PRESETS = [...START_PRESETS].sort((a, b) => {
  const familyDiff = Number(isFeetPreset(a)) - Number(isFeetPreset(b));
  if (familyDiff !== 0) return -familyDiff; // Fuss (true=1) soll VOR Meter (false=0) stehen
  return a.config.size.length - b.config.size.length;
});

// Minimale Plausibilitaetspruefung fuer ?config= (siehe parseConfig unten) -
// Container.tsx selbst prueft seine Eingaben nicht defensiv (das war bisher
// nie noetig, alle bisherigen Aufrufer liefern bereits gepruefte
// App-eigene Daten) - hier kommt aber potenziell nicht-vertrauenswuerdige
// URL-Eingabe von einer fremden Webseite an, deshalb die Pruefung genau an
// dieser Embed-Grenze statt in Container.tsx selbst.
function isPlausibleContainerConfig(value: unknown): value is ContainerConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ContainerConfig>;
  if (!v.size || typeof v.size !== "object") return false;
  const { length, width, height } = v.size;
  if (!(length > 0) || !(width > 0) || !(height > 0)) return false;
  if (!Array.isArray(v.openings)) return false;
  if (typeof v.wallThickness !== "number" || typeof v.insideColor !== "string" || typeof v.outsideColor !== "string") {
    return false;
  }
  return true;
}

// Ermittelt Config + Standardfarbe aus ?preset=<id> ODER ?config=<JSON> -
// siehe resolveConfig unten fuer den (davon getrennten) Farb-Override.
// Faellt OHNE jeden Farb-Override auf DEFAULT_ACCENT_COLOR zurueck (nicht
// auf preset.config.outsideColor, das ist app-weit Signalgrau) - der Embed
// soll standardmaessig markentypisch aussehen, siehe Kommentar oben.
function resolveBaseConfig(params: URLSearchParams): { config: ContainerConfig; outsideColor: string } {
  const configParam = params.get("config");
  if (configParam) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(configParam));
      if (isPlausibleContainerConfig(parsed)) {
        return { config: parsed, outsideColor: parsed.outsideColor };
      }
    } catch {
      // Fehlerhaftes JSON - faellt unten auf den Preset-Zweig zurueck.
    }
  }

  const presetId = params.get("preset");
  const preset = START_PRESETS.find((p) => p.id === presetId) ?? START_PRESETS[0];
  return { config: preset.config, outsideColor: DEFAULT_ACCENT_COLOR };
}

// Liest die Container-Konfiguration aus der URL (viewer.html?...). Faellt
// bei JEDEM Fehler auf den ersten Preset zurueck statt eine leere/kaputte
// Seite zu zeigen - ein Embed auf einer fremden Webseite soll nie sichtbar
// "kaputt" wirken.
function resolveConfig(): { config: ContainerConfig; outsideColor: string } {
  const params = new URLSearchParams(window.location.search);
  const base = resolveBaseConfig(params);

  // Farb-Override, gilt fuer BEIDE Modi oben (auch bei ?config=, damit ein
  // bestehender Konfigurations-Link ohne Neuerzeugung trotzdem in einer
  // anderen Farbe gezeigt werden kann). ?RAL=<nummer> (Jonas' Vorgabe
  // 2026-08-19: "keine Ahnung ueber ?RAL=7004 oder sowas" - naeher an dem,
  // wie er/seine Kunden tatsaechlich denken, die ganze App zeigt Farben ja
  // auch sonst immer als RAL-Ton, nie als Hex, siehe getRalNameForHex-
  // Kommentar in ralColors.ts) hat Vorrang vor dem rohen
  // ?color=<hex>-Fallback fuer Faelle ohne passenden RAL-Ton.
  const ralParam = params.get("RAL") ?? params.get("ral");
  const ralColor = ralParam ? findRalColorByCode(ralParam) : undefined;
  if (ralColor) return { ...base, outsideColor: ralColor.hex };

  const colorParam = params.get("color");
  if (colorParam && /^#[0-9a-fA-F]{3,8}$/.test(colorParam)) {
    return { ...base, outsideColor: colorParam };
  }

  return base;
}

// Eigener, schlanker Fehler-Rahmen statt des bestehenden
// components/ErrorBoundary.tsx - der nutzt Tailwind-Klassen und
// App-spezifische Texte (z.B. den Autosave-Hinweis), beides hier fehl am
// Platz und wuerde ausserdem indirekt Tailwind-Erwartungen ins Embed
// ziehen, obwohl viewer.html bewusst kein index.css einbindet. Faengt
// sowohl eine fehlerhafte ?config=-Eingabe als auch CSG-Randfaelle ab.
class ViewerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            fontSize: 13,
            color: "#64748b",
            textAlign: "center",
            padding: 16,
          }}
        >
          Ansicht konnte nicht geladen werden.
        </div>
      );
    }
    return this.props.children;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function ColorDot({ color, active, onClick, title }: { color: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9999,
        padding: 0,
        cursor: "pointer",
        background: color,
        border: active ? "2px solid #008eb4" : "2px solid rgba(255,255,255,0.9)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
      }}
    />
  );
}

// Jonas' Vorgabe 2026-08-19: "die Einbettungen sollen auch das typische
// Lade-Symbol haben, welches auch im Konfigurator existiert, mit
// milchigem Glas etc." - 1:1 dieselbe Optik wie LoadingIndicator.tsx's
// Overlay-Variante (bg-white/70 + backdrop-blur-sm + rotierendes
// Orbit-Icon + "Lädt…"-Text), hier als eigenstaendige Inline-Style-Version
// nachgebaut statt die echte Komponente zu importieren (die haengt an
// Tailwind-Klassen/useLoadingPhase.ts - beides fuer ein derart kleines,
// bewusst CSS-freies Embed unnoetiger Overhead, siehe Kommentar oben zur
// Bundle-Groesse). Rotation per reiner CSS-@keyframes-Klasse
// (.viewer-spin, siehe viewer.html) statt JS/rAF-getrieben, aus demselben
// Grund wie OrbitIcon.tsx's eigener Kommentar: bleibt vom Hauptthread
// (schwere CSG-Berechnung laeuft genau waehrend dieses Overlay sichtbar
// ist) unberuehrt, laeuft auf dem Compositor-Thread.
function LoadingOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <svg
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#008eb4"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="viewer-spin"
      >
        <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85" />
        <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
      </svg>
      <span style={{ fontFamily: "sans-serif", fontSize: 13, color: "#94a3b8" }}>Lädt…</span>
    </div>
  );
}

function ViewerRoot() {
  const geometryScope = useId();
  const initial = useMemo(resolveConfig, []);
  // Jonas' Vorgabe 2026-08-19 (siehe LoadingOverlay oben): true, sobald
  // Container.tsx's eigenes onReady (Scene.tsx/StartPresetThumbnail.tsx
  // nutzen das schon genauso) meldet, dass wirklich alle Teile des
  // ERSTEN Aufbaus gemountet sind - deckt zuverlaessig den schwersten Fall
  // ab (kalter Erststart inkl. three.js/CSG-Bundle-Aufwaermen). Bewusst
  // NICHT bei jedem Preset-Wechsel zurueckgesetzt: Container.tsx's
  // useChunkedReveal reveal-Zaehler laeuft nur neu an, wenn sich die
  // TEILE-ANZAHL aendert (parts.length) - bei gleich vielen Teilen (alle
  // Presets ohne Trennwaende, also praktisch immer) bleibt er bereits
  // "voll" stehen und der Wechsel passiert ohnehin synchron in einem
  // Render, ein erneutes Overlay wuerde dort nur flackern ohne echten
  // Ladevorgang dahinter.
  const [ready, setReady] = useState(false);
  // presetId ist IMMER ein echter Preset (auch im ?config=-Fall, dann als
  // sinnvoller Startwert fuer die Preset-Auswahl unten) - der
  // "Personalisieren"-Link baut deshalb immer aus presetId+outsideColor,
  // ohne die (seltene) individuelle ?config=-Ausgangs-Config selbst
  // durchreichen zu muessen (WorkspacePage.tsx's neuer URL-Fallback
  // versteht ohnehin nur ?preset=, kein ?config=).
  const initialPresetId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const presetId = params.get("preset");
    return START_PRESETS.some((p) => p.id === presetId) ? (presetId as string) : START_PRESETS[0].id;
  }, []);

  const [presetId, setPresetId] = useState(initialPresetId);
  const [outsideColor, setOutsideColor] = useState(initial.outsideColor);
  // Ohne outsideColor - wird bei Preset-Wechsel ersetzt, bleibt bei reiner
  // Farbwahl unveraendert (Farbe soll ueber einen Preset-Wechsel hinweg
  // erhalten bleiben, nicht auf das neue Presets Standardfarbe zurueckspringen).
  const [baseConfig, setBaseConfig] = useState<ContainerConfig>(initial.config);

  function handlePresetChange(id: string) {
    setPresetId(id);
    const preset = START_PRESETS.find((p) => p.id === id);
    if (preset) setBaseConfig(preset.config);
  }

  const config: ContainerConfig = { ...baseConfig, outsideColor };
  const lengthM = config.size.length * MM_TO_M;
  const widthM = config.size.width * MM_TO_M;
  const heightM = config.size.height * MM_TO_M;
  const cameraDistance = VIEWER_DISTANCE_BASE + VIEWER_DISTANCE_SLOPE * Math.max(lengthM, widthM);

  const personalizeHref = `/projekt?preset=${encodeURIComponent(presetId)}&color=${encodeURIComponent(outsideColor)}`;

  const grau = RAL_STANDARD_COLORS[1]; // RAL 7004 Signalgrau
  const gruen = RAL_STANDARD_COLORS[0]; // RAL 6005 Moosgruen

  // Beobachtet die TATSAECHLICHE gerenderte Hoehe des Embeds (nicht die
  // Fenstergroesse - ein iframe kann per CSS auf jede beliebige Groesse
  // gesetzt werden, unabhaengig vom Browserfenster) per ResizeObserver statt
  // eines resize-Events, damit es auch reagiert, wenn NUR der umgebende
  // Container (nicht das Browserfenster) seine Groesse aendert.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(COLOR_CONTROLS_REFERENCE_HEIGHT);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setContainerHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const colorControlsScale = clamp(containerHeight / COLOR_CONTROLS_REFERENCE_HEIGHT, MIN_SCALE, MAX_SCALE);
  const topControlsScale = clamp(containerHeight / TOP_CONTROLS_REFERENCE_HEIGHT, MIN_SCALE, MAX_SCALE);

  return (
    <ViewerErrorBoundary>
      <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <Canvas
          gl={{ alpha: true }}
          // Jonas' Vorgabe 2026-08-19: "der Konfigurator soll nicht die
          // Webseite, auf der er eingesetzt ist, verlangsamen - das ist
          // essenziell wichtig." r3f rendert per Default JEDEN Frame
          // durchgehend neu (auch wenn sich rein gar nichts aendert), was
          // bei einer eingebetteten, meist unbewegten Szene reine
          // GPU/CPU-Verschwendung im Hintergrund waere, selbst wenn der
          // umgebende Tab/das umgebende iframe gar nicht im Fokus steht.
          // frameloop="demand" rendert stattdessen nur noch, wenn sich
          // tatsaechlich etwas aendert (React-Commits im Canvas-Baum, z.B.
          // waehrend des anfaenglichen CSG-Aufbaus) ODER wenn drei's
          // OrbitControls selbst invalidiert (laeuft eingebaut mit, auch
          // waehrend des Ausschwingens der enableDamping-Traegheit nach
          // dem Loslassen) - im Ruhezustand (kein Ziehen, fertig geladen)
          // rendert der Canvas dann komplett gar nicht mehr.
          frameloop="demand"
          // [1, 2] statt fest 2 (abweichend von StartPresetThumbnail.tsx):
          // die Vorschau dort rendert einmalig auf eine feste kleine
          // Kachelgroesse, ein Embed kann in beliebiger iframe-Groesse
          // landen - responsive dpr passt sich dem an. Kein
          // preserveDrawingBuffer noetig (das war dort nur fuer den
          // einmaligen toDataURL()-Schnappschuss, hier laeuft die Szene live
          // weiter).
          dpr={[1, 2]}
          camera={{ position: [cameraDistance, cameraDistance * 0.55, cameraDistance], fov: 40 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[6, 8, 4]} intensity={1.4} />
          {/* Gegenlicht wie in StartPresetThumbnail.tsx - bewusst KEIN
              HDRI/Environment (siehe dortiger Kommentar): eine Farbstudie
              mit zwei Richtungslichtern statt einer echten Umgebungskarte
              umgeht damit automatisch das root-absolute Pfadproblem der
              /hdri/*.hdr-Dateien (die wuerden sich, cross-origin auf einer
              fremden Webseite eingebettet, gegen deren eigene Domain
              aufloesen statt gegen hayse.de). */}
          <directionalLight position={[-5, 3, -6]} intensity={0.4} />
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
                    onReady={() => setReady(true)}
                  />
                </group>
              </SectionPlaneProvider>
            </DisplaySettingsProvider>
          </GeometryCacheScopeContext.Provider>
          {/* Jonas' Fehlerbericht 2026-08-19 (per Screenshot): "der
              Container ist auf vertikaler Ebene nicht mittig" - Ursache:
              die <group> oben verschiebt den Container bereits um
              -heightM/2 nach unten (uebernommen von
              StartPresetThumbnail.tsx, wo das den Container auf den
              Welt-Ursprung zentriert), das target hier war aber
              faelschlich von Scene.tsx uebernommen, wo der Container OHNE
              diese Verschiebung direkt bei lokal y=0..height steht - dort
              ist heightM/2 korrekt die Mitte, hier (bereits verschoben)
              liegt heightM/2 stattdessen auf Dachhoehe, das Ziel zielte
              dadurch auf das Dach statt die Mitte. Nach der Verschiebung
              liegt die echte Mitte bei Welt-y=0. */}
          <OrbitControls target={[0, 0, 0]} minDistance={2} maxDistance={40} enableDamping />
        </Canvas>

        {!ready && <LoadingOverlay />}

        {/* Jonas' Vorgabe 2026-08-25: Versionsnummer unten rechts, dezent
            grau, auf JEDER sichtbaren Seite inkl. dieses eingebetteten
            Widgets. Reines Inline-Styling statt Tailwind-Klassen (siehe
            viewer.html-Kommentar, gilt fuer diese ganze Datei). */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 6,
            fontSize: 10,
            color: "#9ca3af",
            pointerEvents: "none",
          }}
        >
          {APP_VERSION}
        </div>

        {/* Linker Rand, vertikal mittig: Standardfarbe grau (oben) -
            Farbrad fuer Sonderfarben (Mitte) - Standardfarbe gruen (unten).
            Jonas' Vorgabe 2026-08-19 (nach anfaenglich "3 Punkte unten",
            dann korrigiert): "Standardfarben bleiben, aber alles an den
            linken Rand, in der Mitte die Sonderfarbe, grau dann oben".
            Jonas' Fehlerbericht 2026-08-19 (nach dem Farbrad-Live-Test):
            zunaechst versucht, mehr Abstand ueber einen groesseren
            Stack-Gap (14->70) zu schaffen - Jonas' Korrektur direkt danach:
            "nein, Punkte wieder zurueck" (sollen an ihrer urspruenglichen
            Position bleiben), stattdessen waechst nur noch der Ring selbst
            (siehe ColorWheelPicker.tsx) - eine gewisse Naehe/Ueberlappung
            des geoeffneten Bogens zu diesen beiden Punkten ist damit
            bewusst in Kauf genommen statt durch Verschieben der Punkte
            geloest. */}
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            // Skaliert relativ zur (bereits zentrierten) eigenen Mitte -
            // siehe colorControlsScale-Kommentar oben.
            transform: `translateY(-50%) scale(${colorControlsScale})`,
            transformOrigin: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            pointerEvents: "none",
          }}
        >
          <div style={{ pointerEvents: "auto" }}>
            <ColorDot color={grau.hex} active={outsideColor === grau.hex} onClick={() => setOutsideColor(grau.hex)} title={`${grau.code} – ${grau.name}`} />
          </div>
          <ColorWheelPicker value={outsideColor} onChange={setOutsideColor} />
          <div style={{ pointerEvents: "auto" }}>
            <ColorDot color={gruen.hex} active={outsideColor === gruen.hex} onClick={() => setOutsideColor(gruen.hex)} title={`${gruen.code} – ${gruen.name}`} />
          </div>
        </div>

        {/* Oben rechts: Preset-Auswahl - native <select> statt eines
            eigenen Dropdowns, damit dieses kleine, eigenstaendige Embed
            keine zusaetzliche Dropdown-Logik/Klick-ausserhalb-Behandlung
            braucht. */}
        <select
          value={presetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          aria-label="Preset wählen"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            // Skaliert von der oberen rechten Ecke aus (transformOrigin),
            // damit die Ecke selbst beim Skalieren an Ort und Stelle bleibt
            // statt sich vom Rand wegzubewegen - siehe topControlsScale-
            // Kommentar oben.
            transform: `scale(${topControlsScale})`,
            transformOrigin: "top right",
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "#fff",
            color: "#1e293b",
            fontFamily: "sans-serif",
            fontSize: 12,
            padding: "0 8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            cursor: "pointer",
          }}
        >
          {SORTED_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Unten rechts: Personalisieren-Button (verlinkt ins volle Studio). */}
        <div
          style={{
            position: "absolute",
            right: 14,
            bottom: 14,
            transform: `scale(${topControlsScale})`,
            transformOrigin: "bottom right",
          }}
        >
          <PersonalizeButton href={personalizeHref} />
        </div>
      </div>
    </ViewerErrorBoundary>
  );
}

createRoot(document.getElementById("viewer-root")!).render(
  <StrictMode>
    <ViewerRoot />
  </StrictMode>,
);
