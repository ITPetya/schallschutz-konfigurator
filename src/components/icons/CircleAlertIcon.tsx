import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface CircleAlertIconProps {
  size?: number;
  className?: string;
}

const mark: Variants = {
  initial: { scale: 1, transition: { duration: 0.4, ease: "easeInOut" } },
  animate: { scale: [1, 0.8, 1.15, 1], transition: { duration: 0.4, ease: "easeInOut" } },
};

// Lucide "circle-alert", animiert wie die uebrigen Icons (Jonas' Vorgabe:
// "alle Icons sollen immer von animate-ui.com/docs/icons.mdx sein"). Traeger
// des Sonder-/Aufpreis-Hinweises (siehe SonderBadge.tsx).
export function CircleAlertIcon({ size = 16, className }: CircleAlertIconProps) {
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
      <circle cx={12} cy={12} r={10} />
      <motion.g variants={mark} initial="initial" animate={hovered ? "animate" : "initial"}>
        <line x1={12} y1={8} x2={12} y2={12} />
        <line x1={12} y1={16} x2={12.01} y2={16} />
      </motion.g>
    </motion.svg>
  );
}
