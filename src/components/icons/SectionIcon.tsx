import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SectionIconProps {
  size?: number;
  className?: string;
}

// Quadrat entlang der Diagonale in zwei Dreieckshaelften geteilt, die beim
// Hover auseinandergleiten - visualisiert eine Schnittebene, die das
// Bauteil aufteilt. Fuer den "Schnitt"-Werkzeugbutton (Jonas' Vorgabe
// 2026-08-10: eigenes animiertes Icon, "genauso wie Messen").
const topRight: Variants = {
  initial: { x: 0, y: 0 },
  animate: { x: 1.5, y: -1.5, transition: { duration: 0.3, ease: "easeInOut" } },
};
const bottomLeft: Variants = {
  initial: { x: 0, y: 0 },
  animate: { x: -1.5, y: 1.5, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function SectionIcon({ size = 16, className }: SectionIconProps) {
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
      <motion.path d="M4 4 20 4 20 20Z" variants={topRight} initial="initial" animate={target} />
      <motion.path d="M4 4 4 20 20 20Z" variants={bottomLeft} initial="initial" animate={target} />
    </motion.svg>
  );
}
