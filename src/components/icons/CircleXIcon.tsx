import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface CircleXIconProps {
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

// Lucide "circle-x", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - fuer
// "Nein" im Bestaetigungs-Dialog (KonfiguratorPage.tsx). Kein eigener
// Hover/Tap-Trigger mehr (siehe PlusIcon.tsx) - useIconHover() liest den
// Zustand des umgebenden AnimatedButton-Wrappers.
export function CircleXIcon({ size = 20, className }: CircleXIconProps) {
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
      <circle cx={12} cy={12} r={10} />
      <motion.line x1={9} y1={15} x2={15} y2={9} variants={line1} initial="initial" animate={target} />
      <motion.line x1={9} y1={9} x2={15} y2={15} variants={line2} initial="initial" animate={target} />
    </motion.svg>
  );
}
