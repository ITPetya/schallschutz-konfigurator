import { motion, useAnimation, type Variants } from "motion/react";

interface RotateCcwIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { rotate: 0, transition: { type: "spring", stiffness: 150, damping: 25 } },
  animate: { rotate: -45, transition: { type: "spring", stiffness: 150, damping: 25 } },
};

// Lucide "rotate-ccw", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - fuer
// den "Zurücksetzen"-Button (KonfiguratorPage.tsx), passendes Undo-Symbol.
export function RotateCcwIcon({ size = 20, className }: RotateCcwIconProps) {
  const controls = useAnimation();
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
      variants={group}
      initial="initial"
      animate={controls}
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("initial")}
      onPointerDown={() => controls.start("animate")}
      onPointerUp={() => controls.start("initial")}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </motion.svg>
  );
}
