import { motion, useAnimation, type Variants } from "motion/react";

interface CheckIconProps {
  size?: number;
  className?: string;
}

const path: Variants = {
  initial: { pathLength: 1, opacity: 1, scale: 1 },
  animate: { pathLength: [0, 1], opacity: [0, 1], scale: [1, 1.1, 1], transition: { duration: 0.6, ease: "easeInOut" } },
};

// Lucide "check", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - fuer
// "Ja, zurücksetzen" im Bestaetigungs-Dialog (KonfiguratorPage.tsx).
export function CheckIcon({ size = 20, className }: CheckIconProps) {
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
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("initial")}
      onPointerDown={() => controls.start("animate")}
      onPointerUp={() => controls.start("initial")}
    >
      <motion.path d="m4 12 5 5L20 6" variants={path} initial="initial" animate={controls} />
    </motion.svg>
  );
}
