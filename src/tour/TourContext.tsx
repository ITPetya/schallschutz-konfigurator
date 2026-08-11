import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TOURS } from "./tourDefinitions";
import { markTourSeen } from "./tourStore";
import type { TourStep } from "./types";

interface TourContextValue {
  currentStep: TourStep | null;
  stepIndex: number;
  stepCount: number;
  start: (tourId: string) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  // Blendet die Tour voruebergehend aus, OHNE ihren Fortschritt zu verlieren
  // (Jonas' Fehlerbericht 2026-07-25: "das Tutorial kollidiert ein bisschen
  // mit dem [Grundeinstellungen-]Fenster ... wenn dann nachher das Tutorial
  // irgendwo aufgerufen wird, soll auch dort weitergemacht werden, nicht
  // einfach von vorne") - z. B. waehrend das Grundeinstellungen-Overlay
  // offen ist: die Tour bleibt auf demselben Schritt "pausiert" und zeigt
  // sich erst wieder, sobald setSuppressed(false) aufgerufen wird, statt
  // neu bei Schritt 1 zu beginnen.
  suppressed: boolean;
  setSuppressed: (v: boolean) => void;
  // Von der App aufgerufen, wenn eine konkrete Aktion tatsaechlich passiert
  // ist (z. B. "container-added") - geht nur dann automatisch zum naechsten
  // Schritt, wenn der AKTUELLE Schritt genau auf dieses Ereignis wartet
  // (siehe TourStep.waitForEvent), sonst passiert nichts.
  notifyEvent: (name: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

// Muss INNERHALB von <BrowserRouter> gerendert werden - braucht useNavigate,
// um bei Tour-Schritten mit route automatisch dorthin zu wechseln (Jonas'
// Vorgabe 2026-07-22: interaktive Tour ueber mehrere Seiten hinweg, z. B.
// Menü -> "Gespeicherte Projekte"-Seite).
export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [suppressed, setSuppressed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const tour = activeTourId ? TOURS[activeTourId] : null;
  // Jonas' Fehlerbericht 2026-08-11 (Tutorial-Ueberarbeitung, per Playwright
  // gefunden): der LOGISCHE aktuelle Schritt (activeStep, fuer notifyEvent())
  // muss UNABHAENGIG von suppressed weiterhin bekannt sein - suppressed
  // steuert NUR, ob TourOverlay gerade etwas ANZEIGT (siehe currentStep
  // unten), nicht, ob die Tour "weiss", bei welchem Schritt sie steht. Vorher
  // wurde waehrend der Unterdrueckung (z. B. solange das
  // Grundeinstellungen-Overlay offen ist) auch activeStep/currentStep
  // komplett auf null gesetzt - ausgerechnet der Klick, der DIESES Overlay
  // schliesst (Grundeinstellungen "Weiter", data-tour="grundeinstellungen-
  // submit"), loeste notifyEvent("project-created") GENAU WAEHREND die Tour
  // noch unterdrueckt war aus (die Suppression wird erst einen Render
  // SPAETER aufgehoben) - notifyEvent verglich also gegen "kein aktueller
  // Schritt" und verwarf das Ereignis stillschweigend, der Tour-Schritt
  // "Projekt benennen" blieb dadurch fuer immer haengen (nur der manuelle
  // "Weiter"-Knopf DER TOUR SELBST kam noch weiter). Betrifft grundsaetzlich
  // jeden Schritt mit einem Ziel INNERHALB eines Elements, das beim Klick
  // gleichzeitig auch die Suppression aufheben soll.
  const activeStep = tour ? tour.steps[stepIndex] ?? null : null;
  const currentStep = suppressed ? null : activeStep;

  // Navigiert automatisch zur Seite des aktuellen Schritts, falls dieser
  // eine "route" vorgibt und wir gerade woanders sind.
  useEffect(() => {
    if (currentStep?.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  function start(tourId: string) {
    setActiveTourId(tourId);
    setStepIndex(0);
    setSuppressed(false);
  }

  function next() {
    if (!tour) return;
    if (stepIndex + 1 >= tour.steps.length) {
      stop();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function prev() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function stop() {
    if (activeTourId) markTourSeen(activeTourId);
    setActiveTourId(null);
    setStepIndex(0);
    setSuppressed(false);
  }

  function notifyEvent(name: string) {
    if (activeStep?.waitForEvent === name) next();
  }

  return (
    <TourContext.Provider
      value={{
        currentStep,
        stepIndex,
        stepCount: tour?.steps.length ?? 0,
        start,
        next,
        prev,
        stop,
        suppressed,
        setSuppressed,
        notifyEvent,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour muss innerhalb von TourProvider verwendet werden");
  return ctx;
}
