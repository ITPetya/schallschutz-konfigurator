import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface CopyIconProps {
  size?: number;
  className?: string;
}

// Hintere Kachel rutscht beim Hover ein Stueck weiter heraus, wie ein
// "Blatt abheben"-Effekt.
const back: Variants = {
  initial: { x: 0, y: 0 },
  animate: { x: -1, y: 1, transition: { duration: 0.25, ease: "easeInOut" } },
};

// Lucide "copy", animiert mit Motion (gleiche Konvention wie die anderen
// Icons hier) - fuer CopyButton.tsx (Jonas' Vorgabe 2026-08-10: Messwerte
// kopierbar machen).
export function CopyIcon({ size = 14, className }: CopyIconProps) {
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
      <motion.rect
        x={9}
        y={9}
        width={13}
        height={13}
        rx={2}
        variants={back}
        initial="initial"
        animate={hovered ? "animate" : "initial"}
      />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </motion.svg>
  );
}
