import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface HomeIconProps {
  size?: number;
  className?: string;
}

const roof: Variants = {
  initial: { y: 0, transition: { ease: "easeInOut", duration: 0.3 } },
  animate: { y: -2, transition: { ease: "easeInOut", duration: 0.3 } },
};

// Lucide "house", animiert mit Motion (gleiche Konvention wie die anderen
// Icons hier) - fuer den Home/Ansicht-zuruecksetzen-Button neben dem
// ViewCube (Jonas' Vorgabe 2026-07-25: "wie bei Inventor").
export function HomeIcon({ size = 18, className }: HomeIconProps) {
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
      <motion.g variants={roof} initial="initial" animate={hovered ? "animate" : "initial"}>
        <path d="M3 11.5 12 4l9 7.5" />
      </motion.g>
      <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
    </motion.svg>
  );
}
