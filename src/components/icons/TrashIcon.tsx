import { motion, useAnimation, type Variants } from "motion/react";

interface TrashIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { y: 0 },
  animate: { y: -1, transition: { duration: 0.3, ease: "easeInOut" } },
};
const lid: Variants = {
  initial: { y: 0, d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" },
  animate: { y: 1, d: "M19 8v12c0 1-1 2-2 2H7c-1 0-2-1-2-2V8", transition: { duration: 0.3, ease: "easeInOut" } },
};
const bar: Variants = {
  initial: { y: 0 },
  animate: { y: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};

// Lucide "trash-2", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - der
// Deckel hebt sich beim Hover leicht an. Ersetzt das reine "✕" beim
// Entfernen eines platzierten Durchbruchs (OpeningsPanel.tsx), passt
// semantisch besser zu "loeschen" als ein generisches Schliessen-Kreuz.
export function TrashIcon({ size = 20, className }: TrashIconProps) {
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
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <path d="M3 6h18" />
      </motion.g>
      <motion.path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" variants={lid} initial="initial" animate={controls} />
      <motion.line x1={10} x2={10} y1={11} y2={17} variants={bar} initial="initial" animate={controls} />
      <motion.line x1={14} x2={14} y1={11} y2={17} variants={bar} initial="initial" animate={controls} />
    </motion.svg>
  );
}
