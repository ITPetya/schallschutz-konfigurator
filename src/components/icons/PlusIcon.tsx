import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface PlusIconProps {
  size?: number;
  className?: string;
}

const line1: Variants = {
  initial: { rotate: 0, transition: { ease: "easeInOut", duration: 0.4, delay: 0.1 } },
  animate: { rotate: 90, transition: { ease: "easeInOut", duration: 0.4, delay: 0.1 } },
};
const line2: Variants = {
  initial: { rotate: 0, transition: { ease: "easeInOut", duration: 0.4 } },
  animate: { rotate: 90, transition: { ease: "easeInOut", duration: 0.4 } },
};

// Lucide "plus", animiert mit Motion (Jonas' Vorgabe 2026-07-24: "nutze
// möglichst ausschließlich Icons von animate-ui.com/docs/icons.mdx") - Pfade
// und Keyframes 1:1 von dort uebernommen. Kein eigener Hover/Tap-Trigger mehr
// (Jonas' Fehlerbericht 2026-07-25: "Icons sollen animieren, wenn man ueber
// den GANZEN Button hovert, nicht nur ueber das Icon") - useIconHover() liest
// den Hover/Press-Zustand des umgebenden AnimatedButton-Wrappers (siehe
// IconHoverContext.tsx: Motion/Reacts whileHover propagiert NICHT automatisch
// an Kind-Komponenten, deshalb dieser Context statt Variant-Propagation).
export function PlusIcon({ size = 20, className }: PlusIconProps) {
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
      <motion.line x1={12} y1={19} x2={12} y2={5} variants={line1} initial="initial" animate={target} />
      <motion.line x1={5} y1={12} x2={19} y2={12} variants={line2} initial="initial" animate={target} />
    </motion.svg>
  );
}
