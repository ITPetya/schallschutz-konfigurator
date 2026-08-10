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
    <Html position={mid} center>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onToggle}
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
