import { motion, useAnimation, type Variants } from "motion/react";

interface ChevronProps {
  direction: "up" | "down" | "left" | "right";
  className?: string;
}

// Basis-Form (chevron-down, Rotation 0) zeigt nach unten; die anderen drei
// Richtungen sind reine CSS-Rotationen derselben Form (fuer die Auf-/
// Zuklapp-Richtung von Schnitt/Ansicht in Scene.tsx). Hergeleitet aus
// Lucides eigener Reihenfolge Nord->Ost->Sued->West im Uhrzeigersinn.
const ROTATION: Record<ChevronProps["direction"], number> = { down: 0, left: 90, up: 180, right: 270 };

const path: Variants = {
  initial: { y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  animate: { y: 4, transition: { duration: 0.3, ease: "easeInOut" } },
};

// Lucide "chevron-down", animiert mit Motion (Jonas' Vorgabe 2026-07-24:
// "nutze möglichst ausschließlich Icons von animate-ui.com/docs/icons.mdx") -
// der Y-Nudge bei Hover/Tap ist Lucides eigene chevron-down-Animation und
// wandert dank der CSS-Rotation immer in die aktuell angezeigte Pfeilrichtung
// (der Nudge liegt im lokalen, mitgedrehten Koordinatensystem des SVGs).
export function Chevron({ direction, className = "" }: ChevronProps) {
  const controls = useAnimation();
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: `rotate(${ROTATION[direction]}deg)`, transition: "transform 200ms ease" }}
      onMouseEnter={() => controls.start("animate")}
      onMouseLeave={() => controls.start("initial")}
      onPointerDown={() => controls.start("animate")}
      onPointerUp={() => controls.start("initial")}
    >
      <motion.path d="m6 9 6 6 6-6" variants={path} initial="initial" animate={controls} />
    </motion.svg>
  );
}
