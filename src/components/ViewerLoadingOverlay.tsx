import { useProgress } from "@react-three/drei";
import { LoadingIndicator } from "./LoadingIndicator";

interface ViewerLoadingOverlayProps {
  // Zusaetzlich zum Asset-Ladezustand (HDRI, ueber drei's useProgress global
  // getrackt via THREE.DefaultLoadingManager) aktiv, solange der schwere
  // CSG-Aufbau (Container.tsx) noch nicht gemountet ist, siehe
  // hooks/useDeferredMount.ts.
  contentNotReady: boolean;
}

// Schwebt als Milchglas-Flaeche UEBER dem 3D-Viewer (Scene.tsx/
// ProjectScene3D.tsx), waehrend entweder der CSG-Aufbau noch nicht gestartet
// ist ODER drei gerade HDRI-/Textur-Assets laedt - Jonas' Fehlerbericht
// 2026-07-29: "der Viewer ist weiss und leer, es soll stattdessen wie
// Milchglas ueber dem Viewer ein Ladescreen angezeigt werden" (die
// Seitenleiste daneben bleibt dabei sofort sichtbar/bedienbar, nur der
// Viewer selbst zeigt den Ladezustand).
export function ViewerLoadingOverlay({ contentNotReady }: ViewerLoadingOverlayProps) {
  const { active: assetsLoading } = useProgress();
  return <LoadingIndicator active={contentNotReady || assetsLoading} overlay loadType="viewer" />;
}
