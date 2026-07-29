import { useEffect, useState } from "react";

// Jonas' Fehlerbericht 2026-07-29: der Viewer blieb ein paar Sekunden weiss,
// OHNE dass in der Zeit ein Ladescreen zu sehen war. Root Cause: der
// Container-CSG-Aufbau (Wall.tsx/CornerCasting.tsx, three-bvh-csg) laeuft
// SYNCHRON in useMemo waehrend des ERSTEN Renderns - der Browser kann in
// dieser Zeit nichts zeichnen, auch keinen Ladescreen, weil beide im selben
// synchronen Render/Commit haengen wuerden, wenn man sie einfach bedingt
// nebeneinander rendert.
//
// Fix: von Scene.tsx/ProjectScene3D.tsx verwendet, um das MOUNTEN der
// schweren Container-Geometrie (nicht den ganzen Viewer/die Seite) um zwei
// requestAnimationFrame-Ticks zu verzoegern - gibt dem Browser garantiert
// die Chance, den bereits committeten (billigen) Zwischenzustand samt
// Lade-Overlay (siehe ViewerLoadingOverlay.tsx) tatsaechlich zu zeichnen,
// BEVOR die teure Berechnung angestossen wird. Macht die CSG-Berechnung
// selbst nicht schneller (die blockiert den Haupt-Thread weiterhin kurz),
// verhindert aber, dass der allererste Tick komplett uebersprungen wird.
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    // Zwei Frames statt einem, zur Sicherheit: manche Browser fassen den
    // ersten rAF-Callback noch mit demselben Paint zusammen wie das
    // committende Render, das ihn ausgeloest hat.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return ready;
}
