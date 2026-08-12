import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface AlignIconProps {
  size?: number;
  className?: string;
}

// Jonas' Skizze 2026-08-12: zwei Pfeile, die von einer doppelten Mittellinie
// (der gemeinsamen Ausrichtungs-Ebene) weg nach aussen zeigen - fuer den
// neuen "Ausrichten"-Werkzeugbutton (ersetzt die alte Dropdown-basierte
// Sektion, siehe AlignmentResultPanel.tsx/alignmentDependencies.ts). Beim
// Hover gehen beide Pfeile weiter auseinander - gleiche "zwei Haelften
// trennen sich"-Konvention wie SectionIcon.tsx, hier auf der X- statt der
// Diagonalachse, die Mittellinie selbst bleibt fix (sie ist die Referenz,
// zu der ausgerichtet wird).
const leftArrow: Variants = {
  initial: { x: 0 },
  animate: { x: -1.5, transition: { duration: 0.3, ease: "easeInOut" } },
};
const rightArrow: Variants = {
  initial: { x: 0 },
  animate: { x: 1.5, transition: { duration: 0.3, ease: "easeInOut" } },
};

export function AlignIcon({ size = 16, className }: AlignIconProps) {
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
      {/* Doppelte Mittellinie - die gemeinsame Ebene, zu der ausgerichtet wird. */}
      <path d="M10.5 4v16M13.5 4v16" />
      <motion.path d="M9 12H3M6 8 3 12l3 4" variants={leftArrow} initial="initial" animate={target} />
      <motion.path d="M15 12h6M18 8l3 4-3 4" variants={rightArrow} initial="initial" animate={target} />
    </motion.svg>
  );
}
