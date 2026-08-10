import { useProgress } from "@react-three/drei";

interface ViewerStatusBarProps {
  // Baufortschritt der aktuell aufgebauten Container (Container.tsx meldet
  // sich per onReady, sobald sein CSG-Aufbau fertig ist, siehe Scene.tsx/
  // ProjectScene3D.tsx) - im Einzelcontainer-Viewer immer {0|1, total:1}.
  buildProgress: { done: number; total: number };
  // Nur in der Baugruppen-Ansicht gesetzt (Scene.tsx hat immer genau einen
  // Container, dafuer lohnt sich der Warnhinweis nicht).
  containerCount?: number;
  // Fuehrungstext/-ergebnis des Messwerkzeugs (Jonas' Vorgabe 2026-08-10) -
  // hat Vorrang vor Lade-/Warnhinweisen, weil er direktes Ergebnis der
  // gerade laufenden Nutzeraktion ist.
  measureText?: string | null;
}

// Ab dieser Anzahl Container in EINER Baugruppe zeigt die Fussleiste einen
// Performance-Hinweis (Jonas' Vorgabe 2026-08-10: "Warnungen ... wenn man
// enorm viele Container in einer Baugruppe hat") - reiner Richtwert, kein
// hartes Limit: jeder Container zieht potenziell dutzende C-Schienen-/
// Streckgitter-Meshes nach sich (siehe Perf-Fixes vom selben Tag), die
// Darstellung wird ab einer gewissen Container-Anzahl spuerbar traeger.
const MANY_CONTAINERS_THRESHOLD = 15;

// Duenne Statuszeile am unteren Rand des 3D-Viewers (Jonas' Vorgabe
// 2026-08-10: "duenne Fussleiste fuer Infotexte, eine Zeile in kleiner
// Schrift") - zeigt IMMER (nicht erst nach der ueblichen 0,8s-Verzoegerung
// des Milchglas-Ladescreens, siehe useLoadingPhase.ts) an, ob und was gerade
// laedt, sowie einen Warnhinweis bei sehr vielen Containern in der
// Baugruppe. Bewusst KEIN eigener Ladespinner/-icon - nur Text, das
// eigentliche Ladesymbol bleibt dem Milchglas-Overlay (ViewerLoadingOverlay)
// vorbehalten.
export function ViewerStatusBar({ buildProgress, containerCount, measureText }: ViewerStatusBarProps) {
  const { active: assetsLoading, item, loaded, total } = useProgress();

  let text = "";
  if (measureText) {
    text = measureText;
  } else if (assetsLoading) {
    text = item ? `Lädt: ${item} (${loaded}/${total})` : `Lädt Umgebungstexturen… (${loaded}/${total})`;
  } else if (buildProgress.done < buildProgress.total) {
    text =
      buildProgress.total > 1
        ? `3D-Modell wird aufgebaut… (${buildProgress.done}/${buildProgress.total} Container)`
        : "3D-Modell wird aufgebaut…";
  } else if (containerCount !== undefined && containerCount > MANY_CONTAINERS_THRESHOLD) {
    text = `${containerCount} Container in dieser Baugruppe – die Darstellung kann dadurch langsamer werden.`;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-6 items-center overflow-hidden bg-white/90 px-3 backdrop-blur-sm dark:bg-slate-800/90">
      <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{text}</span>
    </div>
  );
}
