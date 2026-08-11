import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SpaceMouseIconProps {
  size?: number;
  className?: string;
}

// Mittlere Kappe wird beim Hover leicht groesser - deutet die 6
// Freiheitsgrade (druecken/ziehen/kippen) der echten SpaceMouse-Kappe an,
// gleiche Hover-Konvention wie die anderen Werkzeug-Icons hier.
const cap: Variants = {
  initial: { scale: 1 },
  animate: { scale: 1.2, transition: { duration: 0.3, ease: "easeInOut" } },
};

// Stilisierte SpaceMouse-Kappe (Kreis in der Mitte) mit acht Schubrichtungen
// ringsum, fuer den "SpaceMouse verbinden"-Umschalt-Button in
// ViewerToolbar.tsx (Jonas' Vorgabe 2026-08-11: 3Dconnexion-Eingabegeraet
// als zusaetzliche Kamerasteuerung).
export function SpaceMouseIcon({ size = 15, className }: SpaceMouseIconProps) {
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
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="m19.1 4.9-2.1 2.1" />
      <path d="m7 17-2.1 2.1" />
      <motion.circle cx="12" cy="12" r="4" variants={cap} initial="initial" animate={hovered ? "animate" : "initial"} />
    </motion.svg>
  );
}
