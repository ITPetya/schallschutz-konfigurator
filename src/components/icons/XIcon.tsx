import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface XIconProps {
  size?: number;
  className?: string;
}

const line1: Variants = {
  initial: { rotate: 0, transition: { ease: "easeInOut", duration: 0.4 } },
  animate: { rotate: 90, transition: { ease: "easeInOut", duration: 0.4 } },
};
const line2: Variants = {
  initial: { rotate: 0, transition: { ease: "easeInOut", duration: 0.4, delay: 0.1 } },
  animate: { rotate: 90, transition: { ease: "easeInOut", duration: 0.4, delay: 0.1 } },
};

// Lucide "x", animiert mit Motion (Jonas' Vorgabe 2026-07-24, siehe
// PlusIcon.tsx fuer die Begruendung des vereinfachten Trigger-Mechanismus).
// Kein eigener Hover/Tap-Trigger mehr (Jonas' Fehlerbericht 2026-07-25) -
// useIconHover() liest den Zustand des umgebenden AnimatedButton-Wrappers.
export function XIcon({ size = 20, className }: XIconProps) {
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
      <motion.line x1={6} y1={18} x2={18} y2={6} variants={line1} initial="initial" animate={target} />
      <motion.line x1={6} y1={6} x2={18} y2={18} variants={line2} initial="initial" animate={target} />
    </motion.svg>
  );
}
