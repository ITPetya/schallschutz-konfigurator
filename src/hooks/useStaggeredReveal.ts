import { useEffect, useState } from "react";

// Jonas' Fehlerbericht 2026-07-29: bei einer Baugruppe mit mehreren
// Containern (ProjectScene3D.tsx) blockiert der CSG-Aufbau ALLER Instanzen
// in EINEM synchronen Commit den Haupt-Thread so lange, dass selbst ein
// Milchglas-Overlay (siehe ViewerLoadingOverlay.tsx) nicht dazwischen
// aktualisiert werden kann, wenn man einfach nur das MOUNTEN um einen Tick
// verzoegert (wie hooks/useDeferredMount.ts das fuer einen einzelnen
// Container tut). Fix: Container werden STUECKWEISE freigegeben, eine
// Instanz pro Animationsframe - der Browser bekommt dadurch zwischen jeder
// einzelnen (deutlich guenstigeren) Container-CSG-Berechnung eine echte
// Chance zu zeichnen, wodurch das Lade-Overlay waehrend eines langsamen
// Ladevorgangs auch tatsaechlich sichtbar bleibt/aktualisiert.
export function useStaggeredReveal(total: number): number {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    if (total <= 0) return;
    let cancelled = false;
    let raf = 0;

    function step(count: number) {
      if (cancelled) return;
      setRevealed(count);
      if (count < total) raf = requestAnimationFrame(() => step(count + 1));
    }
    raf = requestAnimationFrame(() => step(1));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [total]);

  return revealed;
}
