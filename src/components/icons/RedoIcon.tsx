import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface RedoIconProps {
  size?: number;
  className?: string;
}

const hook: Variants = {
  initial: { x: 0, transition: { ease: "easeInOut", duration: 0.3 } },
  animate: { x: 2, transition: { ease: "easeInOut", duration: 0.3 } },
};

// Lucide "redo" - horizontal gespiegeltes Pendant zu UndoIcon.tsx.
export function RedoIcon({ size = 18, className }: RedoIconProps) {
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
      <motion.polyline points="15 14 20 9 15 4" variants={hook} initial="initial" animate={hovered ? "animate" : "initial"} />
      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </motion.svg>
  );
}
