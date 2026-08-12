import { useLayoutEffect, useState } from "react";

// Gleicher Abstand wie zwischen den Buttons in der Werkzeug-Spalte
// (ViewerToolbar.tsx: "flex ... gap-2").
const GAP_PX = 8;
// Vor/Zurueck-Buttons oben rechts (ViewerToolbar.tsx: "absolute right-4
// top-4", Buttonhoehe "h-9") - ihre Unterkante, ab der (plus GAP_PX) die
// Werkzeug-Spalte nicht mehr weiter nach oben ausweichen darf.
const UNDO_REDO_BOTTOM_PX = 16 + 36;
// Home-Button unten rechts (ViewerToolbar.tsx: "absolute bottom-[150px]
// right-[34px]", Buttonhoehe "h-9") - seine Oberkante, vor der (minus
// GAP_PX) die Werkzeug-Spalte auszuweichen versucht.
const HOME_BOTTOM_OFFSET_PX = 150;
const HOME_HEIGHT_PX = 36;

interface UseToolbarVerticalOffsetOptions {
  // Umschliessendes "position: relative"-Element, gegen dessen Hoehe
  // zentriert/ausgewichen wird (Scene.tsx/ProjectScene3D.tsx: die
  // "relative min-h-0 flex-1"-Huelle um Canvas + ViewerToolbar).
  containerRef: React.RefObject<HTMLElement | null>;
  // Die Werkzeug-Button-Spalte selbst - ihre tatsaechliche gerenderte Hoehe
  // (haengt von der Anzahl sichtbarer Buttons ab, z.B. ob SpaceMouse
  // unterstuetzt wird) entscheidet, ob eine Kollision mit dem Home-Button
  // droht.
  columnRef: React.RefObject<HTMLElement | null>;
  // Vor/Zurueck-Buttons existieren nicht im schreibgeschuetzten Viewer -
  // dann gibt es auch keine Obergrenze, ab der ausgewichen werden muesste.
  hasUndoRedo: boolean;
}

// Jonas' Vorgabe 2026-08-12: die rechte Werkzeug-Spalte (Schnitt/Ansicht/
// Messen/SpaceMouse, siehe ViewerToolbar.tsx) ist standardmaessig vertikal
// mittig zentriert (CSS "top-1/2 -translate-y-1/2"). Waechst sie durch mehr
// gleichzeitig sichtbare Buttons so weit, dass sie unten mit dem Home-Button
// kollidieren wuerde, soll sie stattdessen nach oben ausweichen - aber nur
// so weit, bis der Abstand zu den Vor/Zurueck-Buttons oben genauso gross ist
// wie der Abstand der Buttons zueinander (GAP_PX). Reicht das nicht aus
// (sehr niedriges Fenster mit vielen Buttons), darf sie mit dem Home-Button
// kollidieren - kein hartes Limit dagegen, die Spalte versucht nur VORHER
// immer, die Abstaende einzuhalten.
//
// Gibt undefined zurueck, solange keine Korrektur noetig ist (der weit
// ueberwiegende Normalfall) - dann greift weiterhin die reine CSS-
// Zentrierung als Sicherheitsnetz, statt bei jedem Rendern einen Pixelwert
// zu erzwingen.
export function useToolbarVerticalOffset({ containerRef, columnRef, hasUndoRedo }: UseToolbarVerticalOffsetOptions): number | undefined {
  const [top, setTop] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const column = columnRef.current;
    if (!container || !column) return;

    function recompute() {
      const containerHeight = container!.clientHeight;
      const columnHeight = column!.getBoundingClientRect().height;
      if (!containerHeight || !columnHeight) return;

      const naturalTop = (containerHeight - columnHeight) / 2;
      const homeTop = containerHeight - HOME_BOTTOM_OFFSET_PX - HOME_HEIGHT_PX;
      const maxBottom = homeTop - GAP_PX;
      const minTop = hasUndoRedo ? UNDO_REDO_BOTTOM_PX + GAP_PX : 0;

      let nextTop = naturalTop;
      if (naturalTop + columnHeight > maxBottom) {
        nextTop = Math.max(maxBottom - columnHeight, minTop);
      }
      nextTop = Math.max(nextTop, minTop);

      // Keine Korrektur noetig -> undefined, damit die CSS-Zentrierung
      // greift (siehe Kommentar oben).
      setTop(Math.abs(nextTop - naturalTop) < 0.5 ? undefined : nextTop);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    observer.observe(column);
    return () => observer.disconnect();
  }, [containerRef, columnRef, hasUndoRedo]);

  return top;
}
