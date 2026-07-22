import { motion, useAnimation, type Variants } from "motion/react";

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
// Datei herunter).
export function DownloadIcon({ size = 20, className }: DownloadIconProps) {
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
        <path d="M12 15V3" />
        <path d="m7 10 5 5 5-5" />
      </motion.g>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </motion.svg>
  );
}
