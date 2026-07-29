import { useEffect, useRef, useState } from "react";

// Jonas' Fehlerbericht 2026-07-29 (zweite Runde): der erste Versuch (eine
// Instanz PRO Animationsframe, feste Rate) hatte zwei echte Probleme statt
// eins geloest:
// 1. Trotz "Mounten verzoegern" flippte der Bereitschafts-Zustand IM
//    SELBEN synchronen Commit wie die teure CSG-Berechnung selbst um -
//    der Browser konnte zwischen "noch nicht bereit" und "fertig" nie
//    zeichnen, das Lade-Overlay ist deshalb faktisch nie sichtbar geworden.
// 2. Eine feste "1 Element pro Frame"-Rate erzwingt IMMER mindestens
//    (Elementanzahl) Frames Wartezeit, selbst wenn jedes Element in
//    Wirklichkeit in Bruchteilen einer Millisekunde fertig waere - das hat
//    das Laden bei schnellen Faellen tatsaechlich langsamer gemacht statt
//    schneller.
//
// Fix: ADAPTIVE Batch-Groesse statt fester Rate ("TCP Slow-Start"-Prinzip).
// Start vorsichtig bei 1 Element; nach jedem Frame wird gemessen, wie lange
// der letzte Schritt gedauert hat (echte Wanduhrzeit zwischen zwei
// requestAnimationFrame-Zeitstempeln) - war er schnell (< FRAME_BUDGET_MS),
// verdoppelt sich die Batch-Groesse fuer den naechsten Schritt (schneller
// Fall: alles ist nach 3-4 Frames sichtbar, kaum spuerbarer Overhead). War
// er langsam, halbiert sich die Batch-Groesse (nie unter 1) - der Browser
// bekommt dadurch bei echter Ueberlastung nach JEDEM einzelnen teuren
// Element eine Chance zu zeichnen, wodurch das Lade-Overlay ueberhaupt erst
// sichtbar werden kann.
const FRAME_BUDGET_MS = 24;

export function useChunkedReveal(total: number): number {
  const [revealed, setRevealed] = useState(0);
  // Nur zum Vergleichen zwischen Frames - loest KEIN Rerendering aus, muss
  // deshalb kein State sein.
  const lastTimeRef = useRef(0);

  useEffect(() => {
    setRevealed(0);
    if (total <= 0) return;
    let cancelled = false;
    let raf = 0;
    let batchSize = 1;
    lastTimeRef.current = performance.now();

    function step(count: number) {
      if (cancelled || count >= total) return;
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        const now = performance.now();
        const elapsed = now - lastTimeRef.current;
        lastTimeRef.current = now;
        batchSize = elapsed < FRAME_BUDGET_MS ? Math.min(total, batchSize * 2) : Math.max(1, Math.floor(batchSize / 2));
        const next = Math.min(total, count + batchSize);
        setRevealed(next);
        step(next);
      });
    }
    raf = requestAnimationFrame(() => step(0));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [total]);

  return revealed;
}
