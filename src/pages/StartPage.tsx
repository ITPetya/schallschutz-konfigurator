import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeProject, PROJECT_FILE_EXTENSION } from "../config/projectFileCodec";
import { hasMeaningfulProjectDraft, loadProjectDraft } from "../config/projectDraftStore";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { UploadIcon } from "../components/icons/UploadIcon";
import { Chevron } from "../components/icons/Chevron";
import { AnimatedButton } from "../components/AnimatedButton";
import { useTour } from "../tour/TourContext";

// Zentrierter Startbildschirm: "Konfiguration starten" + "Projekt laden".
// Seit dem Zusammenlegen von Einzel-/Ensemble-Modus (siehe WorkspacePage.tsx)
// gibt es nur noch EINEN Einstieg - ein Projekt, in dem beliebig viele
// Container angelegt werden koennen - deshalb kein Umschalt-Button mehr.
export function StartPage() {
  const navigate = useNavigate();
  const { notifyEvent } = useTour();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const hasCache = hasMeaningfulProjectDraft();

  async function loadProjectFile(file: File) {
    try {
      const project = await decodeProject(file);
      setError(null);
      navigate("/projekt", { state: { project } });
    } catch {
      setError("Datei konnte nicht geladen werden – ist es eine gültige Projektdatei (.sszprojekt)?");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // erlaubt erneutes Auswaehlen derselben Datei
    if (!file) return;
    await loadProjectFile(file);
  }

  // Ohne Cache oeffnet "Projekt laden" direkt den Dateidialog - erst wenn
  // tatsaechlich ein Projekt im Cache liegt, gibt es ueberhaupt eine
  // Auswahl zwischen "Aus Cache laden" und "Aus Datei laden".
  function handleLoadButtonClick() {
    if (hasCache) {
      setShowLoadMenu((v) => !v);
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleLoadFromCache() {
    setShowLoadMenu(false);
    const cached = loadProjectDraft();
    if (!cached) return;
    navigate("/projekt", { state: { project: cached } });
  }

  function handleLoadFromFile() {
    setShowLoadMenu(false);
    fileInputRef.current?.click();
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
          data-tour="start-configuration"
          onClick={() => {
            notifyEvent("project-started");
            navigate("/projekt", { state: { fresh: true } });
          }}
          className="flex items-center justify-center gap-2 rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Konfiguration starten
          <ArrowRightIcon size={18} />
        </AnimatedButton>

        <div className="relative flex items-stretch">
          <AnimatedButton
            type="button"
            hoverScale={1}
            tapScale={1}
            onClick={handleLoadButtonClick}
            className={`flex items-center justify-center gap-2 border-2 border-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white ${
              hasCache ? "rounded-l-full" : "rounded-full"
            }`}
          >
            <UploadIcon size={18} />
            Projekt laden
          </AnimatedButton>
          {hasCache && (
            <AnimatedButton
              type="button"
              hoverScale={1}
              tapScale={1}
              onClick={handleLoadButtonClick}
              aria-label="Ladeoptionen anzeigen"
              className="flex items-center rounded-r-full border-2 border-l-0 border-brand px-3 py-3 text-brand hover:bg-brand hover:text-white"
            >
              <Chevron direction="down" />
            </AnimatedButton>
          )}
          {showLoadMenu && hasCache && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLoadMenu(false)} />
              <nav className="absolute left-0 top-full z-50 mt-2 w-56 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
                <button
                  type="button"
                  onClick={handleLoadFromCache}
                  className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
                >
                  Aus Cache laden
                </button>
                <button
                  type="button"
                  onClick={handleLoadFromFile}
                  className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
                >
                  Aus Datei laden
                </button>
              </nav>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={PROJECT_FILE_EXTENSION}
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
      {error && <p className="max-w-sm text-sm text-red-600">{error}</p>}
    </div>
  );
}
