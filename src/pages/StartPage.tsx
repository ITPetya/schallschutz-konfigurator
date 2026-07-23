import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeConfig, CONFIG_FILE_EXTENSION } from "../config/configFileCodec";
import { decodeProject, PROJECT_FILE_EXTENSION } from "../config/projectFileCodec";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { AnimatedButton } from "../components/AnimatedButton";

type StartMode = "single" | "project";

// Zentrierter Startbildschirm: "Konfiguration starten" + "Konfiguration
// laden" (Jonas' Vorgabe 2026-07-23 - kein Login mehr, stattdessen laedt man
// eine zuvor heruntergeladene .sszkonfig-Datei direkt in den Konfigurator).
export function StartPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Jonas' Vorgabe 2026-07-25: kein eigener "Baugruppen-Projekt"-Link mehr
  // (seit dem Workspace-Merge sind Einzel/Ensemble nur noch der Startmodus
  // EINER Seite, siehe WorkspacePage.tsx) - stattdessen waehlt man den Modus
  // direkt am "Konfiguration starten"-Button ueber den kleinen runden
  // Umschalt-Button (gleiche Bildsprache wie "Richtung wechseln" bei
  // Schnitt, siehe Scene.tsx).
  const [startMode, setStartMode] = useState<StartMode>("single");

  // "Konfiguration laden" akzeptiert jetzt beide Dateiformate (Jonas'
  // Vorgabe 2026-07-25: "soll natürlich für einzelne Container als auch
  // Baugruppen gehen") - unterscheidet anhand der Dateiendung, welcher
  // Decoder und welche Route (Einzel-/Ensemble-Modus derselben
  // WorkspacePage) zum Einsatz kommt.
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // erlaubt erneutes Auswaehlen derselben Datei
    if (!file) return;
    const isProject = file.name.endsWith(PROJECT_FILE_EXTENSION);
    try {
      if (isProject) {
        const project = await decodeProject(file);
        setError(null);
        navigate("/projekt", { state: { project } });
      } else {
        const config = await decodeConfig(file);
        setError(null);
        navigate("/konfigurator", { state: { config } });
      }
    } catch {
      setError(
        isProject
          ? "Datei konnte nicht geladen werden – ist es eine gültige Projektdatei (.sszprojekt)?"
          : "Datei konnte nicht geladen werden – ist es eine gültige Konfigurationsdatei (.sszkonfig)?",
      );
    }
  }

  return (
    // z-0 (nicht nur "relative") ist noetig, damit dieses Element einen
    // EIGENEN Stacking-Context aufmacht - sonst "entkommen" die -z-10-Kinder
    // bis zum naechsten Vorfahren, der einen aufmacht, und werden dort HINTER
    // dessen normalem (nicht positioniertem) bg-white gemalt, das faelschlich
    // "spaeter" gezeichnet wird (Debugging-Fund 2026-07-22).
    <div className="relative z-0 flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center">
      {/* Platzhalter-Hintergrund (Jonas' Vorgabe 2026-07-22: "wie hinter
          Milchglas", nicht extrem - Bild wird spaeter ersetzt). scale-110
          verhindert, dass der Weichzeichner am Bildrand einen harten Rand
          durchscheinen laesst; das halbtransparente weisse Overlay erzeugt
          den Milchglas-Effekt und haelt den Text darueber lesbar. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: "url(/start-background.svg)" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-white/55" />

      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer
        </h1>
        <p className="mt-2 text-slate-500">3D-Konfigurator für individuelle Sondercontainer</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Zusammengesetzter Button: linker (groesserer) Teil startet direkt
            im aktuell gewaehlten Modus, der rechte runde Teil schaltet
            zwischen "Einzel" und "Ensemble" um (Jonas' Vorgabe 2026-07-25:
            "nicht so praegnant Einzel oder Ensemble ueber einen runden
            Button im Button mit einem Pfeil, wie bei Schnitt der Pfeil").
            Beide Haelften bilden zusammen EINE Kapselform ohne Luecke. */}
        <div className="flex items-stretch">
          <AnimatedButton
            type="button"
            onClick={() => navigate(startMode === "single" ? "/konfigurator" : "/projekt")}
            className="flex items-center justify-center gap-2 rounded-l-full bg-brand py-3 pl-8 pr-4 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            Konfiguration starten
            <ArrowRightIcon size={18} />
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={() => setStartMode((m) => (m === "single" ? "project" : "single"))}
            aria-label="Zwischen Einzel- und Ensemble-Start wechseln"
            className="flex items-center gap-1.5 rounded-r-full border-l border-white/25 bg-brand py-3 pl-3 pr-5 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            {startMode === "single" ? "Einzel" : "Ensemble"}
            <SwapIcon />
          </AnimatedButton>
        </div>
        <AnimatedButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-full border-2 border-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white"
        >
          <UploadIcon size={18} />
          Konfiguration laden
        </AnimatedButton>
        <input
          ref={fileInputRef}
          type="file"
          accept={`${CONFIG_FILE_EXTENSION},${PROJECT_FILE_EXTENSION}`}
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
      {error && <p className="max-w-sm text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Gleiches Icon wie "Richtung wechseln" bei Schnitt (Scene.tsx) - bewusst
// dieselbe Bildsprache fuer "hier kann man etwas umschalten".
function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M7 7h11l-3-3M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
