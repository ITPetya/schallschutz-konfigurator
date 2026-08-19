import { Component, StrictMode, useId, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Container } from "../components/Container";
import { DisplaySettingsProvider } from "../context/DisplaySettingsContext";
import { SectionPlaneProvider } from "../context/SectionPlaneContext";
import { GeometryCacheScopeContext } from "../utils/geometryCache";
import { START_PRESETS } from "../constants/startPresets";
import { RAL_STANDARD_COLORS, findRalColorByCode, findNearestRalColor, RAL_SPECIAL_COLORS } from "../constants/ralColors";
import { ColorWheelPicker } from "./ColorWheelPicker";
import { PersonalizeButton } from "./PersonalizeButton";
import type { ContainerConfig } from "../config/types";

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

// Jonas' Vorgabe 2026-08-19: "standardmaessig soll das helle Blau von der
// Webseite sein, das sieht dann cool aus" - --color-brand-light aus
// index.css. Der Konfigurator kennt aber nur echte RAL-Toene (siehe
// getRalNameForHex-Kommentar in ralColors.ts), deshalb auf den
// naechstliegenden RAL-Sonderton eingerastet statt den rohen Marken-Hex-Wert
// direkt als Aussenfarbe zu verwenden - dieselbe findNearestRalColor-Logik
// wie im Farbrad selbst.
const BRAND_LIGHT_BLUE = "#71c8dd";
const DEFAULT_ACCENT_COLOR = findNearestRalColor(BRAND_LIGHT_BLUE, RAL_SPECIAL_COLORS).hex;

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

function ViewerRoot() {
  const geometryScope = useId();
  const initial = useMemo(resolveConfig, []);
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

  return (
    <ViewerErrorBoundary>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Canvas
          gl={{ alpha: true }}
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

        {/* Linker Rand, vertikal mittig: Standardfarbe grau (oben) -
            Farbrad fuer Sonderfarben (Mitte) - Standardfarbe gruen (unten).
            Jonas' Vorgabe 2026-08-19 (nach anfaenglich "3 Punkte unten",
            dann korrigiert): "Standardfarben bleiben, aber alles an den
            linken Rand, in der Mitte die Sonderfarbe, grau dann oben". */}
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
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
          {START_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Unten rechts: Personalisieren-Button (verlinkt ins volle Studio). */}
        <div style={{ position: "absolute", right: 14, bottom: 14 }}>
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
