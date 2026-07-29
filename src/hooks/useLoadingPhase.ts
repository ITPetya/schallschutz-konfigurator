import { useEffect, useRef, useState } from "react";

// Jonas' Vorgabe 2026-07-29: EINHEITLICHE Regel fuer JEDE Stelle im Projekt,
// an der Ladezeit entstehen kann (nicht nur der Viewer) - drei Stufen:
// - bis 0,8s: gar kein Ladesymbol (vermeidet Aufblitzen bei schnellen Ladevorgaengen).
// - 0,8s bis 3s: normales Ladesymbol.
// - ab 3s: zusaetzlich eine Entschuldigung + laufend absteigende Restzeit-Schaetzung.
export type LoadingPhase = "idle" | "spinner" | "eta";

const SPINNER_AFTER_MS = 800;
const ETA_AFTER_MS = 3000;
// Rein heuristische Restzeit-Schaetzung - fuer echte Ladevorgaenge (Route-
// Chunks, CSG-Aufbau, Netzwerk-Ladezeiten von Assets) gibt es keinen
// tatsaechlichen Fortschrittswert. ASSUMED_TOTAL_MS ist die angenommene
// Gesamtdauer, ab der ab dem 3s-Punkt heruntergezaehlt wird - haelt bei
// max(1, ...) an, damit die Anzeige nie "in 0 Sekunden" oder negativ wird,
// waehrend der Ladevorgang tatsaechlich noch laeuft.
const ASSUMED_TOTAL_MS = 9000;

export interface LoadingPhaseState {
  phase: LoadingPhase;
  etaSeconds: number;
}

export function useLoadingPhase(active: boolean): LoadingPhaseState {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      setElapsedMs(0);
      return;
    }
    startRef.current = performance.now();
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - (startRef.current ?? performance.now()));
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active || elapsedMs < SPINNER_AFTER_MS) return { phase: "idle", etaSeconds: 0 };
  if (elapsedMs < ETA_AFTER_MS) return { phase: "spinner", etaSeconds: 0 };
  const etaSeconds = Math.max(1, Math.round((ASSUMED_TOTAL_MS - elapsedMs) / 1000));
  return { phase: "eta", etaSeconds };
}
