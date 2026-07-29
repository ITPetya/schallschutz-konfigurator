import { useEffect, useState } from "react";

// Jonas' Fehlerbericht 2026-07-29: "der Viewer lädt bei mir immer noch ein
// paar Sekunden" OHNE dass in der Zeit ein Ladescreen zu sehen ist. Root
// Cause: der Container-CSG-Aufbau (Wall.tsx/CornerCasting.tsx, three-bvh-csg)
// laeuft SYNCHRON in useMemo waehrend des ERSTEN Renderns - React/der Browser
// koennen in dieser Zeit nichts zeichnen, auch keinen Ladescreen, weil der
// Ladescreen und der schwere Viewer im selben synchronen Render/Commit
// haengen wuerden, wenn man einfach beides gleichzeitig rendert.
//
// Fix: erst NUR den Ladescreen rendern (billig, wird sofort gemalt), danach
// per requestAnimationFrame einen Tick warten (gibt dem Browser garantiert
// die Chance, den bereits committeten Ladescreen tatsaechlich zu zeichnen,
// BEVOR die teure Berechnung angestossen wird) und erst DANACH auf "ready"
// umschalten, was den Aufrufer den eigentlichen (schweren) Inhalt rendern
// laesst. Macht die CSG-Berechnung selbst nicht schneller (die blockiert den
// Haupt-Thread weiterhin kurz), sorgt aber dafuer, dass der Nutzer in der
// Zwischenzeit denselben Ladescreen wie beim Seitenwechsel sieht statt eines
// eingefrorenen/leeren Bildschirms.
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
