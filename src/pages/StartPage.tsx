import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeConfig } from "../config/configFileCodec";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { AnimatedButton } from "../components/AnimatedButton";

// Zentrierter Startbildschirm: "Konfiguration starten" + "Konfiguration
// laden" (Jonas' Vorgabe 2026-07-23 - kein Login mehr, stattdessen laedt man
// eine zuvor heruntergeladene .sszkonfig-Datei direkt in den Konfigurator).
export function StartPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // erlaubt erneutes Auswaehlen derselben Datei
    if (!file) return;
    try {
      const config = await decodeConfig(file);
      setError(null);
      navigate("/konfigurator", { state: { config } });
    } catch {
      setError("Datei konnte nicht geladen werden – ist es eine gültige Konfigurationsdatei (.sszkonfig)?");
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
        <AnimatedButton
          type="button"
          onClick={() => navigate("/konfigurator")}
          className="flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Konfiguration starten
          <ArrowRightIcon size={18} />
        </AnimatedButton>
        <AnimatedButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-full border-2 border-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white"
        >
          <UploadIcon size={18} />
          Konfiguration laden
        </AnimatedButton>
        <input ref={fileInputRef} type="file" accept=".sszkonfig" onChange={handleFileSelected} className="hidden" />
      </div>
      {error && <p className="max-w-sm text-sm text-red-600">{error}</p>}

      {/* Baugruppen-Feature (Nacht-Session 2026-07-23): bewusst als
          unauffaelliger Textlink statt gleichwertiger dritter Haupt-Button -
          neu und noch nicht so ausgereift wie der Einzelcontainer-
          Konfigurator, soll den nicht optisch verdraengen. */}
      <button
        type="button"
        onClick={() => navigate("/projekt")}
        className="text-sm font-medium text-slate-500 underline decoration-slate-300 hover:text-brand"
      >
        Baugruppen-Projekt (mehrere Container) starten
      </button>
    </div>
  );
}
