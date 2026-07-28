import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface CircleHelpIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { rotate: 0, transition: { duration: 0.5, ease: "easeInOut" } },
  animate: { rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5, ease: "easeInOut" } },
};

// Lucide "circle-help", animiert mit Motion (Jonas' Vorgabe: "alle Icons
// sollen immer von animate-ui.com/docs/icons.mdx sein") - ersetzt das reine
// "?"-Textzeichen im Hilfe-Menü-Button (AppShell.tsx). Kein eigener
// Hover/Tap-Trigger (siehe PlusIcon.tsx) - useIconHover() liest den Zustand
// des umgebenden AnimatedButton-Wrappers.
export function CircleHelpIcon({ size = 20, className }: CircleHelpIconProps) {
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
      <motion.g variants={group} initial="initial" animate={hovered ? "animate" : "initial"}>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </motion.g>
    </motion.svg>
  );
}
