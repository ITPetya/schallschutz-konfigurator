import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface ArrowLeftIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { x: 0, transition: { ease: "easeInOut", duration: 0.3 } },
  animate: { x: "-25%", transition: { ease: "easeInOut", duration: 0.3 } },
};

// Lucide "arrow-left", animiert mit Motion, gespiegelt von ArrowRightIcon -
// fuer "Zurück zum Projekt" (KonfiguratorPage.tsx, Baugruppen-Feature). Kein
// eigener Hover/Tap-Trigger mehr (siehe PlusIcon.tsx) - useIconHover() liest
// den Zustand des umgebenden AnimatedButton-Wrappers.
export function ArrowLeftIcon({ size = 20, className }: ArrowLeftIconProps) {
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
      <motion.g variants={group} initial="initial" animate={hovered ? "animate" : "initial"}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </motion.g>
    </motion.svg>
  );
}
