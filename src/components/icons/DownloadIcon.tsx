import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface DownloadIconProps {
  size?: number;
  className?: string;
}

const group: Variants = {
  initial: { y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  animate: { y: 2, transition: { duration: 0.3, ease: "easeInOut" } },
};

// Lucide "download", animiert mit Motion (Jonas' Vorgabe 2026-07-24) - fuer
// den "Speichern"-Button (KonfiguratorPage.tsx: laedt die Konfiguration als
// Datei herunter). Kein eigener Hover/Tap-Trigger mehr (siehe PlusIcon.tsx) -
// useIconHover() liest den Zustand des umgebenden AnimatedButton-Wrappers.
export function DownloadIcon({ size = 20, className }: DownloadIconProps) {
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
        <path d="M12 15V3" />
        <path d="m7 10 5 5 5-5" />
      </motion.g>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </motion.svg>
  );
}
