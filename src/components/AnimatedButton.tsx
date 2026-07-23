import { useState, type ButtonHTMLAttributes } from "react";
import { IconHoverContext } from "./icons/IconHoverContext";

// Drop-in-Ersatz fuer <button> ueberall dort, wo eines der animierten Icons
// (components/icons/*) drinsitzt (Jonas' Fehlerbericht 2026-07-25: "Icons
// sollen immer animieren, wenn man über den GANZEN Button hovert, nicht nur
// über das Icon") - trackt Hover/Press selbst und reicht das per Context an
// die Icon-Kinder weiter (siehe IconHoverContext.tsx fuer die Begruendung,
// warum das nicht einfach ueber Motion/Reacts eigene Variant-Propagation
// laeuft).
export function AnimatedButton({ children, onMouseEnter, onMouseLeave, onPointerDown, onPointerUp, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
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
    </button>
  );
}
