import { motion, type Variants } from "motion/react";
import { useIconHover } from "./IconHoverContext";

interface SpaceMouseIconProps {
  size?: number;
  className?: string;
}

// Jonas' Skizze 2026-08-12 (drei Bilder: Kappe allein, Sockel allein mit den
// offenen Eck-"Haeckchen" oben, dann zusammengesetzt) - ersetzt die
// vorherige, zu rund geratene Version. Kappe: flacher Deckel mit
// eingezogener Taille (Bezier-Kurven an den Seiten, Ober-/Unterkante
// gerade). Sockel: KEIN geschlossenes Rechteck - die obere Kante fehlt
// bewusst, nur zwei kleine, nicht verbundene Haken an den oberen Ecken
// (dort, wo die Kappe eingesteckt sitzt), Seiten gerade, unten
// geschlossen. Alle rechtwinkligen Ecken werden allein durch
// strokeLinejoin="round" abgerundet, keine eigenen Eckenkurven noetig.
//
// Beim Hover gehen beide Teile auseinander (Kappe nach oben, Sockel nach
// unten) - dieselbe "zwei Haelften trennen sich"-Konvention wie
// SectionIcon.tsx. Im getrennten Zustand ist der Sockel exakt Jonas'
// zweite Skizze (die leeren Haken werden sichtbar, weil die Kappe nicht
// mehr darauf sitzt) - im Ruhezustand ergibt sich exakt die dritte Skizze.
const capPart: Variants = {
  initial: { y: 0 },
  animate: { y: -2, transition: { duration: 0.3, ease: "easeInOut" } },
};
const basePart: Variants = {
  initial: { y: 0 },
  animate: { y: 2, transition: { duration: 0.3, ease: "easeInOut" } },
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
      {/* Kappe (oberer Teil) - gerade Ober-/Unterkante, eingezogene Taille. */}
      <motion.path d="M7 3 L17 3 C13 5 13 11 17 13 L7 13 C11 11 11 5 7 3 Z" variants={capPart} initial="initial" animate={target} />
      {/* Sockel (unterer Teil) - oben bewusst offen, nur zwei Eck-Haken. */}
      <motion.path d="M7 10 Q6 10 5 12 L5 20 L19 20 L19 12 Q18 10 17 10" variants={basePart} initial="initial" animate={target} />
    </motion.svg>
  );
}
