import { motion, useAnimation, type Variants } from "motion/react";

interface ArrowLeftIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { x: 0, transition: { ease: "easeInOut", duration: 0.3 } },
  animate: { x: "-25%", transition: { ease: "easeInOut", duration: 0.3 } },
};

// Lucide "arrow-left", animiert mit Motion, gespiegelt von ArrowRightIcon -
// fuer "Zurück zum Projekt" (KonfiguratorPage.tsx, Baugruppen-Feature).
export function ArrowLeftIcon({ size = 20, className }: ArrowLeftIconProps) {
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
      <motion.g variants={group} initial="initial" animate={controls}>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </motion.g>
    </motion.svg>
  );
}
