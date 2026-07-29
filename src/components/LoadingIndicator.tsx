import { useLoadingPhase } from "../hooks/useLoadingPhase";
import { OrbitIcon } from "./icons/OrbitIcon";
import { DiscIcon } from "./icons/DiscIcon";

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
  // "saving": Speichern-Vorgaenge (disc-3-Icon) - "generic": alles andere
  // (orbit-Icon). Jonas' Vorgabe 2026-07-29: statt eines Ladebalkens (der
  // einen Fortschrittswert vorgaeuscht, den es fuer Route-Chunks/CSG-Aufbau/
  // Speicher-Kodierung nie wirklich gibt) ein generisches, dauerhaft
  // rotierendes Icon - kein Fortschritt zu berechnen, kein Aufwand.
  kind?: "generic" | "saving";
}

// Einheitliches Lade-UI fuer JEDE Stelle im Projekt, an der Ladezeit
// entstehen kann (Jonas' Vorgabe 2026-07-29) - Route-Wechsel (App.tsx),
// Viewer-Aufbau (Scene.tsx/ProjectScene3D.tsx via ViewerLoadingOverlay) etc.
// Zeigt je nach Dauer (siehe useLoadingPhase.ts) nichts, ein einfaches
// Ladesymbol, oder zusaetzlich eine Entschuldigung mit absteigender
// Restzeit-Schaetzung.
export function LoadingIndicator({ active = true, overlay = false, kind = "generic" }: LoadingIndicatorProps) {
  const { phase, etaSeconds } = useLoadingPhase(active);
  if (phase === "idle") return null;

  const Icon = kind === "saving" ? DiscIcon : OrbitIcon;

  const content = (
    <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-slate-400 dark:text-slate-500">
      <Icon size={32} className="text-brand" />
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
