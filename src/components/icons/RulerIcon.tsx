import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface RulerIconProps {
  size?: number;
  className?: string;
}

// Jonas' Vorgabe 2026-08-12 (ersetzt die vorherige diagonale Lucide-"ruler"-
// Version): Doppelpfeil ueber einem geraden Lineal mit Skalenstrichen - der
// Pfeil-Abstand pulsiert beim Hover (kleiner, dann wieder groesser), statt
// nur die Skalenstriche entlangzugleiten. scaleX statt einer Pfad-
// Interpolation, weil Motion "d"-Morphing nicht zuverlaessig/performant
// unterstuetzt - eine um die eigene Mitte skalierende Gruppe (originX: 0.5)
// erzeugt optisch denselben "der Messabstand veraendert sich"-Effekt, ohne
// den Pfad selbst neu berechnen zu muessen.
const arrowSpan: Variants = {
  initial: { scaleX: 1 },
  animate: { scaleX: [1, 0.7, 1], transition: { duration: 0.6, ease: "easeInOut" } },
};

export function RulerIcon({ size = 15, className }: RulerIconProps) {
  const hovered = useIconHover();
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Doppelpfeil - Spannweite pulsiert beim Hover. */}
      <motion.g variants={arrowSpan} initial="initial" animate={hovered ? "animate" : "initial"} style={{ originX: 0.5, originY: 0.5 }}>
        <path d="M4 6h16" />
        <path d="M7 3 4 6l3 3" />
        <path d="m17 3 3 3-3 3" />
      </motion.g>
      {/* Lineal mit Skalenstrichen - bleibt in Ruhe/Groesse fix. */}
      <path d="M4 13h16v7H4Z" />
      <path d="M7 13v3M10 13v3M13 13v3M16 13v3" />
    </motion.svg>
  );
}
