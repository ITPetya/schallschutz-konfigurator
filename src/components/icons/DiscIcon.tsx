import { motion } from "motion/react";

interface DiscIconProps {
  size?: number;
  className?: string;
}

// Lucide "disc-3", animiert von https://animate-ui.com/docs/icons?icon=disc-3
// (Jonas' Vorgabe 2026-07-29: fuer Speichern-Vorgaenge statt eines
// Ladebalkens - eine Prozentzahl laesst sich fuer die Speicher-Kodierung
// nicht zuverlaessig vorhersagen). Anders als die Hover-Icons
// (ArrowRightIcon.tsx etc.) dreht sich dieses Icon dauerhaft, solange es
// gemountet ist - kein Hover-Trigger noetig, da es nur waehrend eines echten
// Ladezustands angezeigt wird (siehe LoadingIcon.tsx/LoadingIndicator.tsx).
export function DiscIcon({ size = 20, className }: DiscIconProps) {
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
      animate={{ rotate: 360 }}
      transition={{ duration: 1, ease: "linear", repeat: Infinity }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M6 12c0-1.7.7-3.2 1.8-4.2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M18 12c0 1.7-.7 3.2-1.8 4.2" />
    </motion.svg>
  );
}
