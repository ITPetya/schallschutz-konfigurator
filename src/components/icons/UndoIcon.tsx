import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface UndoIconProps {
  size?: number;
  className?: string;
}

const hook: Variants = {
  initial: { x: 0, transition: { ease: "easeInOut", duration: 0.3 } },
  animate: { x: -2, transition: { ease: "easeInOut", duration: 0.3 } },
};

// Lucide "undo", animiert nach dem gleichen Muster wie die anderen Icons
// hier (useIconHover statt eigenem Hover-Trigger) - fuer den
// Rueckgaengig-Button im Viewer (Jonas' Vorgabe 2026-07-25: "vor und zurück
// buttons ... für strg+z usw.").
export function UndoIcon({ size = 18, className }: UndoIconProps) {
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
      <motion.polyline points="9 14 4 9 9 4" variants={hook} initial="initial" animate={hovered ? "animate" : "initial"} />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </motion.svg>
  );
}
