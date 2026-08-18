import { useEffect, useRef, useState } from "react";

// Jonas' Vorgabe 2026-07-29: EINHEITLICHE Regel fuer JEDE Stelle im Projekt,
// an der Ladezeit entstehen kann (nicht nur der Viewer) - drei Stufen:
// - bis 0,8s: gar kein Ladesymbol (vermeidet Aufblitzen bei schnellen Ladevorgaengen).
// - 0,8s bis 3s: normales Ladesymbol.
// - ab 3s: zusaetzlich eine Entschuldigung + laufend absteigende Restzeit-Schaetzung.
export type LoadingPhase = "idle" | "spinner" | "eta";

const SPINNER_AFTER_MS = 800;
const ETA_AFTER_MS = 3000;

// Jonas' Fehlerbericht 2026-08-11: die Restzeit-Schaetzung war "regelmaessig
// weit daneben (ca. 2 Sekunden angezeigt, real 5-8 Sekunden gebraucht)" - der
// alte, ueberall gleiche ASSUMED_TOTAL_MS=9000-Fixwert war fuer kurze
// Ladevorgaenge (Route-Chunks) zu hoch und fuer schwere CSG-Aufbauten oft zu
// niedrig, wodurch die heruntergezaehlte Restzeit gegen Ende schneller Richtung
// 0 lief, als der Ladevorgang tatsaechlich fertig wurde. Statt einer einzigen
// geratenen Konstante fuer ALLE Ladearten jetzt ein gemessener gleitender
// Mittelwert PRO Ladeart (loadType), der ueber localStorage die Sitzung
// uebersteht - je oefter z.B. ein CSG-Aufbau tatsaechlich beobachtet wurde,
// desto genauer die naechste Schaetzung fuer genau diese Ladeart. Bewusst
// simpel gehalten (kein Tracking-Backend, kein Perzentil, nur ein
// exponentiell gleitender Mittelwert) - siehe recordDuration().
const STORAGE_KEY_PREFIX = "ssk_load_duration_avg_";
// Startwert, bis genug echte Messungen fuer eine Ladeart vorliegen - identisch
// zum alten Fixwert, damit sich am Verhalten beim allerersten Laden (noch
// keine localStorage-Historie) nichts aendert.
const DEFAULT_ASSUMED_MS = 9000;
// Gewicht der jeweils neuesten Messung im gleitenden Mittelwert - 30% laesst
// die Schaetzung sich innerhalb weniger Ladevorgaenge an die reale Dauer
// angleichen, ohne dass ein einzelner Ausreisser (z.B. kurzer
// Netzwerk-Haenger) die Schaetzung sofort verzerrt.
const EMA_WEIGHT = 0.3;

function loadAverageMs(loadType: string): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + loadType);
    const v = raw ? Number(raw) : NaN;
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    // localStorage kann in privaten/eingebetteten Kontexten fehlen - dann
    // bleibt es einfach beim Startwert, kein Fehlerzustand.
  }
  return DEFAULT_ASSUMED_MS;
}

function recordDurationMs(loadType: string, durationMs: number) {
  try {
    const prev = loadAverageMs(loadType);
    const next = Math.round(prev * (1 - EMA_WEIGHT) + durationMs * EMA_WEIGHT);
    window.localStorage.setItem(STORAGE_KEY_PREFIX + loadType, String(next));
  } catch {
    // Messung geht verloren, aber die Anzeige selbst faellt einfach auf den
    // Startwert zurueck - kein harter Fehler.
  }
}

export interface LoadingPhaseState {
  phase: LoadingPhase;
  etaSeconds: number;
}

// loadType gruppiert die Messungen (z.B. "route" fuer Seiten-Chunks, "viewer"
// fuer den 3D-Aufbau/Terrain-/Hintergrundwechsel, "saving" fuer den
// Speichervorgang) - unterschiedliche Ladearten dauern grundsaetzlich
// unterschiedlich lange, ein gemeinsamer Mittelwert waere fuer keine von
// ihnen richtig gewesen.
// Jonas' Vorgabe 2026-08-18: die 0,8s-Verzoegerung oben ist fuer Ladearten
// gedacht, die MEISTENS schnell sind (ein aufblitzendes Symbol bei einem
// 100ms-Route-Chunk waere stoerender als hilfreich) - fuer Ladearten, bei
// denen "eigentlich immer eine hohe Ladezeit entsteht" (3D-Viewer-/CSG-Aufbau:
// Wechsel zwischen Baugruppen-Uebersicht und Container-Detailbearbeitung,
// Laden einer gespeicherten Baugruppe), soll das Ladesymbol dagegen SOFORT
// erscheinen statt eine Verzoegerung abzuwarten, die bei diesen Ladearten
// ohnehin fast nie greift, bevor es tatsaechlich lange dauert. `immediate`
// ueberspringt deshalb gezielt nur die "idle"-Stufe (kein Symbol) - die
// 3s-Schwelle fuer die Entschuldigung+Restzeit-Anzeige bleibt unveraendert,
// die betrifft eine andere Frage (ab wann sich eine Wartezeit entschuldigen
// laesst, nicht ab wann ueberhaupt ein Symbol erscheint).
export function useLoadingPhase(active: boolean, loadType: string = "generic", immediate: boolean = false): LoadingPhaseState {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);
  const assumedTotalRef = useRef(DEFAULT_ASSUMED_MS);

  useEffect(() => {
    if (!active) {
      // Effekt laeuft neu, WEIL active gerade von true auf false gewechselt
      // ist - startRef.current traegt noch den Startzeitpunkt aus dem
      // vorherigen Durchlauf (Refs ueberleben Re-Renders), also laesst sich
      // hier die tatsaechliche Gesamtdauer dieses (abgeschlossenen)
      // Ladevorgangs bestimmen und in den Mittelwert einrechnen. Bei einem
      // Unmount waehrend eines laufenden Ladevorgangs (active bleibt true)
      // laeuft dieser Zweig nicht - abgebrochene/unvollstaendige Ladevorgaenge
      // verfaelschen den Mittelwert dadurch bewusst nicht.
      if (startRef.current !== null) {
        recordDurationMs(loadType, performance.now() - startRef.current);
      }
      startRef.current = null;
      setElapsedMs(0);
      return;
    }
    startRef.current = performance.now();
    assumedTotalRef.current = loadAverageMs(loadType);
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - (startRef.current ?? performance.now()));
    }, 250);
    return () => window.clearInterval(id);
  }, [active, loadType]);

  if (!active || (!immediate && elapsedMs < SPINNER_AFTER_MS)) return { phase: "idle", etaSeconds: 0 };
  if (elapsedMs < ETA_AFTER_MS) return { phase: "spinner", etaSeconds: 0 };
  const etaSeconds = Math.max(1, Math.round((assumedTotalRef.current - elapsedMs) / 1000));
  return { phase: "eta", etaSeconds };
}
