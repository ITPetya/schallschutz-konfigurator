import { useState, type ReactNode, type Ref } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { IconHoverContext } from "./icons/IconHoverContext";

// Baut auf dem Button-Primitive von animate-ui.com auf (Jonas' Vorgabe: die
// Bausteine von derselben Seite uebernehmen, von der auch die Icons kommen,
// siehe https://animate-ui.com/docs/components/buttons/button) - motion.button
// mit whileHover/whileTap skaliert den ganzen Button leicht (dieselben
// Standardwerte wie im Original-Primitive). ZUSAETZLICH dazu bleibt das
// bisherige Hover-Tracking fuer die Icon-Kinder bestehen (Jonas'
// Fehlerbericht 2026-07-25: "Icons sollen animieren, wenn man über den
// GANZEN Button hovert, nicht nur über das Icon") - Motion/Reacts eigenes
// whileHover propagiert naemlich NICHT automatisch an Kind-Komponenten,
// deshalb reicht dieser Wrapper den Hover-Zustand weiterhin per
// IconHoverContext durch (siehe dort).
interface AnimatedButtonOwnProps {
  // Wie im Original-Primitive ueberschreibbar (Standard 1.05/0.95) - auf 1
  // gesetzt fuer Buttons, bei denen eine unabhaengige Skalierung optisch
  // bricht: z. B. zwei nahtlos aneinanderliegende Haelften eines
  // zusammengesetzten Buttons (StartPage.tsx: "Projekt laden" + Pfeil) oder
  // volle Breite einnehmende Umschalt-Leisten in einem eigenen Rahmen
  // (SectionAndViewPanel.tsx: "Schnitt"/"Ansicht"), wo ein hochskalierter
  // Button ueber den Rahmen des umgebenden Containers hinausragen wuerde.
  hoverScale?: number;
  tapScale?: number;
}

export function AnimatedButton({
  children,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  hoverScale = 1.05,
  tapScale = 0.95,
  ref,
  ...rest
}: Omit<HTMLMotionProps<"button">, "children"> & {
  children?: ReactNode;
  // React 19 erlaubt "ref" als normale Prop (kein forwardRef mehr noetig) -
  // wichtig, damit AnimatedButton als "asChild"-Kind eines Radix-Triggers
  // (DropdownMenuTrigger/DialogTrigger/PopoverTrigger, siehe
  // components/primitives/*) funktioniert: Radix braucht dafuer einen echten
  // Ref auf das zugrundeliegende DOM-Element.
  ref?: Ref<HTMLButtonElement>;
} & AnimatedButtonOwnProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      {...rest}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      onPointerDown={(e) => {
        setHovered(true);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setHovered(false);
        onPointerUp?.(e);
      }}
    >
      <IconHoverContext.Provider value={hovered}>{children}</IconHoverContext.Provider>
    </motion.button>
  );
}
