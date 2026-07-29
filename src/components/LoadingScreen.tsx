import { useEffect, useState } from "react";
import { Progress, ProgressIndicator } from "./primitives/Progress";

// Baut auf animate-ui.com's Progress-Primitive auf (Jonas' Vorgabe, siehe
// https://animate-ui.com/docs/components/radix/progress) statt des reinen
// "Lädt…"-Textes. Ohne echten Fortschrittswert (weder fuer einen
// nachgeladenen Route-Chunk noch fuer die synchrone CSG-Berechnung beim
// Viewer-Aufbau bekannt) naehert sich der Balken asymptotisch 90% an (haelt
// dort, bis der eigentliche Inhalt fertig ist und dieser Fallback
// verschwindet) - dasselbe Prinzip wie z. B. YouTubes/NProgress' Ladebalken.
// Urspruenglich nur in App.tsx fuer den Route-Chunk-Suspense-Fallback
// (RouteLoadingFallback), hierher ausgelagert (Jonas' Vorgabe 2026-07-29:
// "ein Ladescreen wie zwischen Seitenwechsel", wenn ein Viewer ein Projekt
// laedt) - siehe hooks/useDeferredMount.ts fuer die zweite Verwendung.
export function LoadingScreen() {
  const [value, setValue] = useState(15);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => v + (90 - v) * 0.1);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400 dark:text-slate-500">
      <Progress value={value} className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <ProgressIndicator className="h-full w-full bg-brand" />
      </Progress>
      Lädt…
    </div>
  );
}
