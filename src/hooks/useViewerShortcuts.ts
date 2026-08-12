import { useEffect } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

// Zeitfenster zwischen zwei Mausrad-Klicks, damit sie noch als "Doppelklick"
// zaehlen (analog zur ueblichen Doppelklick-Geschwindigkeit).
const MIDDLE_DOUBLE_CLICK_MS = 400;

interface UseViewerShortcutsOptions {
  // Das umschliessende "position: relative"-Element (Scene.tsx/
  // ProjectScene3D.tsx: dieselbe "relative min-h-0 flex-1"-Huelle, die auch
  // useToolbarVerticalOffset.ts nutzt) - hier verwendet, um Mausrad-Klicks
  // abzufangen, OHNE in three.js/OrbitControls' eigene Event-Behandlung auf
  // dem Canvas selbst eingreifen zu muessen.
  containerRef: React.RefObject<HTMLElement | null>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onToggleMeasure: () => void;
}

// Jonas' Vorgabe 2026-08-12: zwei zusaetzliche, rein additive Bedienwege -
// Mausrad-Taste doppelt klicken = wie der Home-Button ("Ansicht
// zuruecksetzen"), "M" druecken = wie der Messen-Button (Messwerkzeug
// umschalten, "als wuerde man das Menü oeffnen"). Ersetzen nichts
// Bestehendes (Mausrad-Klick+Ziehen bleibt weiterhin Pan ueber
// OrbitControls' mouseButtons-Konfiguration), sind nur zusaetzliche
// Abkuerzungen. Gemeinsam in Scene.tsx UND ProjectScene3D.tsx verwendet
// (beide haben ihre eigene controlsRef/handleToggleMeasure), deshalb hier
// ausgelagert statt doppelt zu implementieren.
export function useViewerShortcuts({ containerRef, controlsRef, onToggleMeasure }: UseViewerShortcutsOptions) {
  // "M" -> Messen umschalten. Gleiche Editierbar-Feld-Ausnahme wie
  // WorkspacePage.tsx's Strg+Z/Strg+Y-Handler (Jonas' Vorgabe 2026-07-xx),
  // damit z. B. das Tippen von "Musterbezeichnung" nicht versehentlich das
  // Messwerkzeug umschaltet.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "m" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      onToggleMeasure();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Absichtlich [] statt [onToggleMeasure]: onToggleMeasure ist in
    // Scene.tsx/ProjectScene3D.tsx eine bei jedem Rendern neu erzeugte
    // Funktion, die aber nur ueber setState-Updater-Formen ("(v) => !v")
    // wirkt - unabhaengig davon, welche Render-Version des Closures hier
    // haengen bleibt, ist das Verhalten identisch, ein Neu-Registrieren bei
    // jedem Rendern waere unnoetig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mausrad-Taste (button===1) doppelt klicken -> Ansicht zuruecksetzen.
  // Manuelle Zeitmessung statt des nativen "dblclick"-Events, weil dessen
  // Unterstuetzung fuer andere Tasten als die linke browserabhaengig
  // uneinheitlich ist. Capture-Phase, damit der Listener den Klick sicher
  // sieht, selbst falls OrbitControls' eigene Handler auf dem Canvas
  // (Kind-Element) die Propagation stoppen sollten.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastMiddleClickAt = 0;
    function handleMouseDown(e: MouseEvent) {
      if (e.button !== 1) return;
      const now = performance.now();
      if (now - lastMiddleClickAt < MIDDLE_DOUBLE_CLICK_MS) {
        controlsRef.current?.reset();
        lastMiddleClickAt = 0;
      } else {
        lastMiddleClickAt = now;
      }
    }
    container.addEventListener("mousedown", handleMouseDown, { capture: true });
    return () => container.removeEventListener("mousedown", handleMouseDown, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
