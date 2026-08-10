import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface ViewIconProps {
  size?: number;
  className?: string;
}

// Lucide "eye", animiert mit Motion (gleiche Konvention wie die anderen
// Icons hier) - die Pupille zieht sich beim Hover leicht zusammen, wie ein
// Fokussieren. Fuer den "Ansicht"-Werkzeugbutton (Jonas' Vorgabe
// 2026-08-10: eigenes animiertes Icon, "genauso wie Messen").
const pupil: Variants = {
  initial: { scale: 1 },
  animate: { scale: 0.7, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function ViewIcon({ size = 16, className }: ViewIconProps) {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <motion.circle cx={12} cy={12} r={3} variants={pupil} initial="initial" animate={hovered ? "animate" : "initial"} />
    </motion.svg>
  );
}
