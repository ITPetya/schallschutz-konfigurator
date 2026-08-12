import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SpaceMouseIconProps {
  size?: number;
  className?: string;
}

// Jonas' Skizze 2026-08-12 (ersetzt die vorherige gekippte-Kuppel-Version,
// die selbst schon ein Fix fuer das noch frueher "wie eine Sonne" aussehende
// Icon war): "Garnrollen"-Silhouette von der Seite - Kappe (oben) und Sockel
// (unten) treffen sich an einer schmalen Taille in der Mitte. Beim Hover
// gehen beide Haelften auseinander (Kappe nach oben, Sockel nach unten) -
// zeigt, dass die Kappe ein eigenstaendiges, bewegliches Teil ist, statt nur
// zu kippen. Gleiche "zwei Haelften trennen sich"-Konvention wie
// SectionIcon.tsx, hier entlang der Y- statt der Diagonalachse. Beide
// Haelften teilen sich in Ruhestellung exakt dieselbe Taillen-Kante (9,12)-
// (15,12), verschmelzen also optisch zu einer durchgezogenen Kontur, bis der
// Hover sie auseinanderzieht.
const capPart: Variants = {
  initial: { y: 0 },
  animate: { y: -2, transition: { duration: 0.3, ease: "easeInOut" } },
};
const basePart: Variants = {
  initial: { y: 0 },
  animate: { y: 2, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function SpaceMouseIcon({ size = 15, className }: SpaceMouseIconProps) {
  const hovered = useIconHover();
  const target = hovered ? "animate" : "initial";
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
      {/* Kappe (oberer Teil). */}
      <motion.path
        d="M5 5C5 9 7 11 9 12L15 12C17 11 19 9 19 5C19 2 15 2 12 2C9 2 5 2 5 5Z"
        variants={capPart}
        initial="initial"
        animate={target}
      />
      {/* Sockel (unterer Teil) samt Zierlinie fuer den Gehaeuse-Rand, wie in
          Jonas' Skizze. */}
      <motion.g variants={basePart} initial="initial" animate={target}>
        <path d="M5 19C5 15 7 13 9 12L15 12C17 13 19 15 19 19C19 22 15 22 12 22C9 22 5 22 5 19Z" />
        <path d="M7 19h10" />
      </motion.g>
    </motion.svg>
  );
}
