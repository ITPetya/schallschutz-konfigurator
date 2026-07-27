import { useState, type ReactNode } from "react";
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
export function AnimatedButton({
  children,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  ...rest
}: Omit<HTMLMotionProps<"button">, "children"> & { children?: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
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
