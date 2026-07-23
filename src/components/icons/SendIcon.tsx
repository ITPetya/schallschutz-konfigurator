import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SendIconProps {
  size?: number;
  className?: string;
}

// Lucide "send", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - das
// Papierflieger-Symbol "fliegt" beim Hover einmal durchs Bild. Fuer den
// "Anfragen"-Button (KonfiguratorPage.tsx: oeffnet die E-Mail-Anfrage).
const group: Variants = {
  initial: { scale: 1, x: 0, y: 0 },
  animate: {
    scale: [1, 0.8, 1, 1, 1],
    x: [0, "-10%", "100%", "-125%", 0],
    y: [0, "10%", "-100%", "125%", 0],
    transition: {
      default: { ease: "easeInOut", duration: 1.2 },
      x: { ease: "easeInOut", duration: 1.2, times: [0, 0.25, 0.5, 0.5, 1] },
      y: { ease: "easeInOut", duration: 1.2, times: [0, 0.25, 0.5, 0.5, 1] },
    },
  },
};

// Kein eigener Hover/Tap-Trigger mehr (siehe PlusIcon.tsx) - useIconHover()
// liest den Zustand des umgebenden AnimatedButton-Wrappers.
export function SendIcon({ size = 20, className }: SendIconProps) {
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
        <path d="M14.5,21.7c.1.3.4.4.7.3.1,0,.2-.2.3-.3L22,2.7c0-.3,0-.5-.3-.6-.1,0-.2,0-.3,0L2.3,8.5c-.3,0-.4.4-.3.6,0,.1.2.2.3.3l7.9,3.2c.5.2.9.6,1.1,1.1l3.2,7.9Z" />
        <path d="M21.9,2.1l-10.9,10.9" />
      </motion.g>
    </motion.svg>
  );
}
