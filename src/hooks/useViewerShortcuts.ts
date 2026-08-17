import { useEffect, useRef } from "react";
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
  // Jonas' Vorgabe 2026-08-12: "A" = wie der Ausrichten-Button. Optional -
  // Scene.tsx (Einzelcontainer-Viewer) hat kein Ausrichten-Werkzeug (macht
  // erst ab zwei Containern Sinn), ProjectScene3D.tsx reicht es nur durch,
  // wenn ueberhaupt onCreateDependency vorhanden ist (schreibgeschuetzter
  // Viewer sonst).
  onToggleAlignment?: () => void;
  // Jonas' Vorgabe 2026-08-17: Escape soll ueberall hierarchisch wirken -
  // erst die aktuell aktive Auswahl loeschen, beim naechsten Druck (nichts
  // mehr ausgewaehlt) das aktive Werkzeug (Messen/Ausrichten/Schnitt)
  // beenden. Anders als onToggleMeasure/onToggleAlignment MUSS dieser
  // Callback aktuelle State-Werte LESEN (nicht nur eine setState-Updater-Form
  // aufrufen), um zu entscheiden, welche Ebene gerade dran ist - deshalb
  // ueber eine Ref immer auf dem neuesten Stand gehalten (siehe unten),
  // statt wie onToggleMeasure/onToggleAlignment auf den stale-closure-sicheren
  // Updater-Trick zu setzen.
  onEscape?: () => void;
}

// Jonas' Vorgabe 2026-08-12: mehrere zusaetzliche, rein additive Bedienwege -
// Mausrad-Taste doppelt klicken = wie der Home-Button ("Ansicht
// zuruecksetzen"), "M" druecken = wie der Messen-Button, "A" = wie der
// Ausrichten-Button (jeweils "als wuerde man das Menü oeffnen"). Ersetzen
// nichts Bestehendes (Mausrad-Klick+Ziehen bleibt weiterhin Pan ueber
// OrbitControls' mouseButtons-Konfiguration), sind nur zusaetzliche
// Abkuerzungen. Gemeinsam in Scene.tsx UND ProjectScene3D.tsx verwendet
// (beide haben ihre eigene controlsRef/handleToggleMeasure), deshalb hier
// ausgelagert statt doppelt zu implementieren.
export function useViewerShortcuts({ containerRef, controlsRef, onToggleMeasure, onToggleAlignment, onEscape }: UseViewerShortcutsOptions) {
  // Immer der neueste onEscape-Callback (siehe Begruendung am Prop) - reine
  // Zuweisung im Render-Koerper, kein Effekt noetig, wird vom unten einmalig
  // registrierten Listener bei JEDEM Tastendruck frisch gelesen.
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  // "M"/"A"/"Escape" -> Messen/Ausrichten umschalten bzw. Auswahl/Werkzeug
  // hierarchisch beenden. Gleiche Editierbar-Feld-Ausnahme wie
  // WorkspacePage.tsx's Strg+Z/Strg+Y-Handler (Jonas' Vorgabe 2026-07-xx),
  // damit z. B. das Tippen von "Musterbezeichnung" nicht versehentlich ein
  // Werkzeug umschaltet/eine Auswahl loescht.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      if (e.key === "Escape") {
        escapeRef.current?.();
        return;
      }
      const key = e.key.toLowerCase();
      if (key !== "m" && key !== "a") return;
      if (key === "m") onToggleMeasure();
      else onToggleAlignment?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Absichtlich [] statt [onToggleMeasure, onToggleAlignment]: beides sind
    // in Scene.tsx/ProjectScene3D.tsx bei jedem Rendern neu erzeugte
    // Funktionen, die aber nur ueber setState-Updater-Formen ("(v) => !v")
    // wirken - unabhaengig davon, welche Render-Version des Closures hier
    // haengen bleibt, ist das Verhalten identisch, ein Neu-Registrieren bei
    // jedem Rendern waere unnoetig. onEscape braucht dafuer die Ref oben,
    // weil es (anders als die beiden Toggles) tatsaechlich AKTUELLE
    // State-Werte lesen muss, um die richtige Hierarchie-Ebene zu waehlen.
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
