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
// Jonas' Korrektur 2026-08-12: "es soll immer so wie ich den Zusammenbau
// habe [im Ruhezustand]" - die Haken-Startpunkte des Sockels liegen jetzt
// EXAKT auf den unteren Kappen-Ecken (7,13)/(17,13) statt (wie in der
// ersten Version) 3px darueber schwebend, damit beide Pfade im
// Ruhezustand nahtlos ineinander uebergehen (kein sichtbarer Spalt). Beim
// Hover gehen beide Teile von diesem buendigen Zustand aus WEITER
// auseinander (Kappe hoch, Sockel runter, jetzt 3px statt 2px fuer einen
// deutlicheren Effekt) - dieselbe "zwei Haelften trennen sich"-Konvention
// wie SectionIcon.tsx.
const capPart: Variants = {
  initial: { y: 0 },
  animate: { y: -3, transition: { duration: 0.3, ease: "easeInOut" } },
};
const basePart: Variants = {
  initial: { y: 0 },
  animate: { y: 3, transition: { duration: 0.3, ease: "easeInOut" } },
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
      {/* Sockel (unterer Teil) - oben bewusst offen, nur zwei Eck-Haken.
          Haken setzen exakt an den unteren Kappen-Ecken (7,13)/(17,13) an. */}
      <motion.path d="M7 13 Q6 13 5 15 L5 21 L19 21 L19 15 Q18 13 17 13" variants={basePart} initial="initial" animate={target} />
    </motion.svg>
  );
}
