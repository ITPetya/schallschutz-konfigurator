import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SpaceMouseIconProps {
  size?: number;
  className?: string;
}

// Jonas' Fehlerbericht 2026-08-12: das vorherige Icon (Kreis + acht Strahlen
// ringsum) sah "wie eine Sonne" aus statt wie eine SpaceMouse - jetzt eine
// stilisierte SpaceMouse Compact von der Seite: flacher, trapezfoermiger
// Sockel (housing) mit den zwei Fronttasten unten, darauf die Kappe (Cap)
// als Kuppel. Beim Hover kippt die Kappe hin und her (originX/originY statt
// CSS transformOrigin, weil motion/react bei SVG-Elementen den Pivot darueber
// relativ zur eigenen BBox erwartet) - deutet die tatsaechliche Kipp-
// Bewegung der echten Kappe an, gleiche Hover-Konvention wie die anderen
// Werkzeug-Icons hier (SectionIcon.tsx/RulerIcon.tsx).
const cap: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: [0, -9, 9, 0], transition: { duration: 0.6, ease: "easeInOut" } },
};

export function SpaceMouseIcon({ size = 15, className }: SpaceMouseIconProps) {
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
      {/* Sockel (housing), von der Seite - trapezfoermig, unten breiter. */}
      <path d="M4 20h16l-2-5H6Z" />
      {/* Kappe (Cap) - kippt beim Hover um ihren Kontaktpunkt mit dem Sockel. */}
      <motion.path
        d="M6 15c0-4 2.5-6 6-6s6 2 6 6Z"
        variants={cap}
        initial="initial"
        animate={target}
        style={{ originX: 0.5, originY: 1 }}
      />
      {/* Zwei Fronttasten am Sockel. */}
      <path d="M9.5 20v-2" strokeWidth={1.5} />
      <path d="M14.5 20v-2" strokeWidth={1.5} />
    </motion.svg>
  );
}
