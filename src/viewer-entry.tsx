import { Component, StrictMode, useId, useMemo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Container } from "./components/Container";
import { DisplaySettingsProvider } from "./context/DisplaySettingsContext";
import { SectionPlaneProvider } from "./context/SectionPlaneContext";
import { GeometryCacheScopeContext } from "./utils/geometryCache";
import { START_PRESETS } from "./constants/startPresets";
import { findRalColorByCode } from "./constants/ralColors";
import type { ContainerConfig } from "./config/types";

// Jonas' Vorgabe 2026-08-19: der 3D-Viewer soll eigenstaendig (z.B. per
// <iframe>) in eine fremde Webseite einbettbar sein, um dort einen einzelnen
// voreingestellten, drehbaren Container zu zeigen - ohne die volle
// Bearbeitungs-UI. Eigener Vite-Build-Eintrag (siehe vite.config.ts,
// viewer.html) statt einer Route in der Haupt-App: dadurch zieht dieses
// Bundle NICHTS von react-router-dom/radix-ui/motion/den ~55
// Bearbeitungs-Panels aus src/components/ mit, nur die bereits von Haus aus
// entkoppelte Render-Kette (Container.tsx und alles darunter haengt schon
// jetzt an keinerlei App-/Routing-/Layout-Code, siehe deren eigene
// Importe) plus react-three-fiber/drei/three-bvh-csg selbst.
// Vorlage/Muster fast 1:1 von StartPresetThumbnail.tsx uebernommen (dort
// bereits als Canvas+Container+dieselben zwei Context-Provider erprobt,
// dort aber nur fuer einen einmaligen Snapshot statt live/interaktiv).

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
  return { config: preset.config, outsideColor: preset.config.outsideColor };
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

function ViewerRoot() {
  const geometryScope = useId();
  const { config, outsideColor } = useMemo(resolveConfig, []);

  const lengthM = config.size.length * MM_TO_M;
  const widthM = config.size.width * MM_TO_M;
  const heightM = config.size.height * MM_TO_M;
  const cameraDistance = VIEWER_DISTANCE_BASE + VIEWER_DISTANCE_SLOPE * Math.max(lengthM, widthM);

  return (
    <ViewerErrorBoundary>
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
            HDRI/Environment (siehe dortiger Kommentar): eine Farbstudie mit
            zwei Richtungslichtern statt einer echten Umgebungskarte
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
        <OrbitControls target={[0, heightM / 2, 0]} minDistance={2} maxDistance={40} enableDamping />
      </Canvas>
    </ViewerErrorBoundary>
  );
}

createRoot(document.getElementById("viewer-root")!).render(
  <StrictMode>
    <ViewerRoot />
  </StrictMode>,
);
