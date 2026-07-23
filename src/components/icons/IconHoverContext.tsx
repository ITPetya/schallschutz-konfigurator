import { createContext, useContext } from "react";

// Motion/React's whileHover propagiert NICHT automatisch an Kind-
// Komponenten wie "animate" es via variants tut (empirisch mit Playwright
// geprueft, Nacht-Session 2026-07-25: der umgebende Button reagierte auf
// whileHover, das Icon-SVG aber nicht) - deshalb dieser Context: der
// AnimatedButton-Wrapper (siehe AnimatedButton.tsx) trackt Hover/Press
// selbst und reicht das Ergebnis hier durch, jedes Icon liest es per
// useIconHover() und steuert damit seinen eigenen "animate"-Zielzustand,
// OHNE dass sich an den Icon-Aufrufstellen selbst (<RotateCcwIcon .../>)
// irgendetwas aendern muss.
export const IconHoverContext = createContext(false);

export function useIconHover(): boolean {
  return useContext(IconHoverContext);
}
