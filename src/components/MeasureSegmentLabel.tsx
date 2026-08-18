import { useState } from "react";
import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import { CopyButton } from "./CopyButton";
import { formatLength, type LengthUnit } from "../utils/lengthUnits";

interface MeasureSegmentLabelProps {
  from: [number, number, number];
  to: [number, number, number];
  meters: number;
  // "X"/"Y"/"Z" im XYZ-Modus, fehlt im Direkt-Modus (eine einzelne Diagonale
  // ohne Achsen-Kennzeichnung).
  prefix?: string;
  unit: LengthUnit;
  // Klick auf das Maß selbst (nicht den Copy-Button, siehe CopyButton.tsx's
  // stopPropagation) wechselt Direkt<->XYZ - siehe MeasureDimensions.tsx,
  // das ALLEN Labels denselben Umschalter gibt, damit ein Klick auf
  // irgendeines der (bis zu 3) XYZ-Masse gleichermassen zurueck zu Direkt
  // fuehrt.
  onToggle: () => void;
}

// Schwebt als echtes DOM-Element (drei's <Html>) am Mittelpunkt EINES
// Mess-Segments - bewusst IMMER oben sichtbar wie eine echte CAD-Bemaßung
// (anders als die rohen Messpunkte/-linien selbst, siehe MeasureMarkers.tsx,
// die weiterhin normal von Waenden verdeckt werden koennen).
export function MeasureSegmentLabel({ from, to, meters, prefix, unit, onToggle }: MeasureSegmentLabelProps) {
  const [hovered, setHovered] = useState(false);
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const text = formatLength(meters, unit);

  return (
    // zIndexRange (Jonas' Fehlerbericht 2026-08-11): drei setzt hier per
    // Default einen inline z-index bis 16.777.271 (siehe die zentrale
    // Z-Index-Skala in index.css), der jedes Vollbild-Popup (z-50, z.B.
    // "Anfrage pruefen") ueberdeckte. [45, 40] haelt die Stufe "viewer-
    // html-label" der Skala ein: naeher zur Kamera liegende Segmente
    // bleiben untereinander weiterhin korrekt vorne (relative Ordnung
    // bleibt erhalten), aber der ganze Bereich liegt sicher unter z-50.
    <Html position={mid} center zIndexRange={[45, 40]}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // Jonas' Fehlerbericht 2026-08-18 ("Direkt/XYZ-Umschalter geht
        // nicht mehr, Container werden dabei aus-/abgewaehlt"): drei's
        // <Html> haengt dieses <div> als ECHTES DOM-Geschwisterelement
        // neben den <canvas> (in denselben Wrapper, den r3f per
        // events.connect() fuer sein EIGENES natives Pointer-Event-System
        // benutzt - siehe react-three-fiber/dist/events-*.js: connect()
        // haengt die Listener an GENAU dieses Wrapper-Element, nicht an
        // den <canvas> selbst). Ein Klick HIER bubbelt deshalb ganz normal
        // (natives DOM-Bubbling) zu diesem Wrapper hoch und wird von r3f's
        // Listener MIT VERARBEITET, obwohl er gar nicht auf dem Canvas
        // stattfand - r3f berechnet die Klick-Position dabei ueber
        // event.offsetX/offsetY, die (per Browser-Spezifikation) relativ
        // zu event.target sind, hier also relativ zu DIESEM kleinen
        // Label statt zum Canvas - das ergibt voellig verzerrte
        // Bildschirmkoordinaten, mit denen r3f trotzdem einen echten
        // Raycast in die Szene schiesst. Landet der dabei zufaellig auf
        // NICHTS Sinnvollem (haeufigster Fall), feuert seit dem "Klick ins
        // Leere loescht Auswahl"-Feature (2026-08-17) Canvas'
        // onPointerMissed -> clearSelection() -> die gerade gewaehlten
        // Messpunkte verschwinden im selben Klick wieder, WAEHREND der
        // Umschalter selbst (das setMode() unten) tatsaechlich ganz normal
        // feuert - sieht dadurch aus wie "der Wechsel klappt nicht",
        // obwohl er kurz VOR dem Verschwinden der ganzen Bemassung
        // durchaus passiert. Landet der Geister-Raycast stattdessen auf
        // einem Baugruppen-Container, waehlt/entwaehlt er ihn - "Container
        // werden dabei ausgewaehlt, als wuerde man durchklicken". Fix:
        // stopPropagation auf JEDEM nativen Pointer-Event dieses Labels,
        // damit gar nichts mehr bis zu r3f's Listener hochblubbert - der
        // reine React-onClick-Handler (setMode) funktioniert davon
        // unabhaengig weiterhin normal (React ruft ihn synchron beim
        // Erreichen dieses Elements auf, nicht erst am Ende der nativen
        // Bubble-Kette).
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-brand bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-dark shadow-md dark:bg-slate-800/95 dark:text-brand-light"
      >
        {prefix && <span className="text-brand-light">{prefix}</span>}
        {text}
        <AnimatePresence>
          {hovered && (
            <motion.span
              key="copy"
              initial={{ opacity: 0, width: 0, scale: 0.5 }}
              animate={{ opacity: 1, width: "auto", scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.5 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex overflow-hidden"
            >
              <CopyButton value={text} label={prefix ? `${prefix}-Abstand kopieren` : "Abstand kopieren"} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Html>
  );
}
