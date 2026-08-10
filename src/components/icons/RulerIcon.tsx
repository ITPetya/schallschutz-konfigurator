import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface RulerIconProps {
  size?: number;
  className?: string;
}

// Ticks gleiten beim Hover ein Stueck die Lineal-Diagonale entlang (statt
// nur leicht heller zu werden) - deutlicher als vorher erkennbare
// "Mess"-Bewegung, Jonas' Fehlerbericht 2026-08-10 ("soll auch animiert
// sein").
const ticks: Variants = {
  initial: { x: 0, y: 0 },
  animate: { x: 1.5, y: -1.5, transition: { duration: 0.3, ease: "easeInOut" } },
};

// Lucide "ruler", animiert mit Motion (gleiche Konvention wie die anderen
// Icons hier) - fuer den "Messen"-Umschalt-Button (Jonas' Vorgabe
// 2026-08-10, ViewerToolbar.tsx).
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
      <path d="M21.3 8.7 8.7 21.3c-1 1-2.6 1-3.5 0l-2.5-2.5c-1-1-1-2.6 0-3.5L15.3 2.7c1-1 2.6-1 3.5 0l2.5 2.5c1 1 1 2.6 0 3.5Z" />
      <motion.g variants={ticks} initial="initial" animate={hovered ? "animate" : "initial"}>
        <path d="m14.5 12.5 2-2" />
        <path d="m11.5 9.5 2-2" />
        <path d="m8.5 6.5 2-2" />
        <path d="m17.5 15.5 2-2" />
      </motion.g>
    </motion.svg>
  );
}
