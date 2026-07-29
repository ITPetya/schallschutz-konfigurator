import { useEffect, useState } from "react";
import { useLoadingPhase } from "../hooks/useLoadingPhase";
import { Progress, ProgressIndicator } from "./primitives/Progress";

interface LoadingIndicatorProps {
  // Ob gerade tatsaechlich geladen wird - steuert die Drei-Stufen-Logik aus
  // useLoadingPhase.ts. Default true, weil der haeufigste Fall (Route-
  // Suspense-Fallback) per Konstruktion nur waehrend des Ladens ueberhaupt
  // gemountet ist.
  active?: boolean;
  // true: schwebt als halbtransparente "Milchglas"-Flaeche UEBER dem
  // Elternelement (z. B. dem 3D-Viewer, der darunter schon bereitsteht) -
  // false: fuellt den Elterncontainer normal aus (z. B. Ganzseiten-
  // Ladezustand beim Routenwechsel).
  overlay?: boolean;
}

// Einheitliches Lade-UI fuer JEDE Stelle im Projekt, an der Ladezeit
// entstehen kann (Jonas' Vorgabe 2026-07-29) - Route-Wechsel (App.tsx),
// Viewer-Aufbau (Scene.tsx/ProjectScene3D.tsx via ViewerLoadingOverlay) etc.
// Zeigt je nach Dauer (siehe useLoadingPhase.ts) nichts, ein einfaches
// Ladesymbol, oder zusaetzlich eine Entschuldigung mit absteigender
// Restzeit-Schaetzung.
export function LoadingIndicator({ active = true, overlay = false }: LoadingIndicatorProps) {
  const { phase, etaSeconds } = useLoadingPhase(active);
  // Kein echter Fortschrittswert bekannt (weder fuer einen Route-Chunk noch
  // fuer CSG-Aufbau/Asset-Ladezeit) - naehert sich asymptotisch 90% an
  // (haelt dort, bis der eigentliche Inhalt fertig ist und dieser Fallback
  // verschwindet), dasselbe Prinzip wie z. B. YouTubes/NProgress' Ladebalken.
  const [value, setValue] = useState(15);
  useEffect(() => {
    if (phase === "idle") {
      setValue(15);
      return;
    }
    const id = window.setInterval(() => setValue((v) => v + (90 - v) * 0.1), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  if (phase === "idle") return null;

  const content = (
    <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-slate-400 dark:text-slate-500">
      {/* Groesse/Farben 1:1 wie animate-ui.com's Standard-"Progress"-Komponente
          (bg-primary/20 + bg-primary, h-2, rounded-full auf Track UND
          Indikator, siehe apps/www/registry/components/radix/progress) -
          vorher ein eigener, kleinerer Stil (h-1.5, w-40), der deshalb nicht
          wie das bekannte animate-ui-Element aussah. */}
      <Progress value={value} className="h-2 w-56 overflow-hidden rounded-full bg-brand/20">
        <ProgressIndicator className="h-full w-full rounded-full bg-brand" />
      </Progress>
      <span>Lädt…</span>
      {phase === "eta" && (
        <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
          Wir möchten uns für die lange Wartezeit entschuldigen, der Ladevorgang ist voraussichtlich in{" "}
          {etaSeconds} {etaSeconds === 1 ? "Sekunde" : "Sekunden"} abgeschlossen.
        </p>
      )}
    </div>
  );

  if (!overlay) {
    return <div className="flex h-full flex-col items-center justify-center">{content}</div>;
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
      {content}
    </div>
  );
}
