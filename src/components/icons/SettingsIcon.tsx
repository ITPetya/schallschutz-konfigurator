import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SettingsIconProps {
  size?: number;
  className?: string;
}

// Lucide "sliders-horizontal" (drei vertikale Regler) statt eines Zahnrads -
// die drei Griffe gleiten beim Hover leicht versetzt zur Mitte, wie ein
// "Regler verstellen"-Effekt. Fuer den Einstellungen-Umschalter im
// Messen-Panel (Jonas' Vorgabe 2026-08-10).
const handle1: Variants = {
  initial: { y1: 14, y2: 14 },
  animate: { y1: 11, y2: 11, transition: { duration: 0.3, ease: "easeInOut" } },
};
const handle2: Variants = {
  initial: { y1: 8, y2: 8 },
  animate: { y1: 11, y2: 11, transition: { duration: 0.3, ease: "easeInOut", delay: 0.05 } },
};
const handle3: Variants = {
  initial: { y1: 16, y2: 16 },
  animate: { y1: 11, y2: 11, transition: { duration: 0.3, ease: "easeInOut", delay: 0.1 } },
};

export function SettingsIcon({ size = 15, className }: SettingsIconProps) {
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
      <line x1={4} y1={21} x2={4} y2={14} />
      <line x1={4} y1={10} x2={4} y2={3} />
      <line x1={12} y1={21} x2={12} y2={12} />
      <line x1={12} y1={8} x2={12} y2={3} />
      <line x1={20} y1={21} x2={20} y2={16} />
      <line x1={20} y1={12} x2={20} y2={3} />
      <motion.line x1={1} x2={7} variants={handle1} initial="initial" animate={target} />
      <motion.line x1={9} x2={15} variants={handle2} initial="initial" animate={target} />
      <motion.line x1={17} x2={23} variants={handle3} initial="initial" animate={target} />
    </motion.svg>
  );
}
