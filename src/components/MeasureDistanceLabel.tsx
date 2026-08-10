import { useState } from "react";
import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import { CopyButton } from "./CopyButton";

interface MeasureDistanceLabelProps {
  a: [number, number, number];
  b: [number, number, number];
}

// Jonas' Vorgabe 2026-08-10: "die Maße sollen auch im Viewer angezeigt
// werden", Copy-Symbol dort ERST beim Hover einblenden (anders als im
// MeasureResultPanel, wo es immer da ist). Schwebt als echtes DOM-Element
// (drei's <Html>) am Mittelpunkt der Messlinie - bewusst IMMER oben sichtbar
// wie eine echte CAD-Bemaßung (anders als die rohen Messpunkte/-linie
// selbst, siehe MeasureMarkers.tsx, die weiterhin normal von Waenden
// verdeckt werden koennen - das war Jonas' vorherige, separate Vorgabe).
export function MeasureDistanceLabel({ a, b }: MeasureDistanceLabelProps) {
  const [hovered, setHovered] = useState(false);
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const directMm = Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000);
  const text = `${directMm} mm`;

  return (
    <Html position={mid} center>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-brand bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-dark shadow-md dark:bg-slate-800/95 dark:text-brand-light"
      >
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
              <CopyButton value={text} label="Abstand kopieren" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Html>
  );
}
