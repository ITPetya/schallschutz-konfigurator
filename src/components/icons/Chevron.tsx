interface ChevronProps {
  direction: "up" | "down" | "left" | "right";
  className?: string;
}

const ROTATION: Record<ChevronProps["direction"], number> = { up: 0, right: 90, down: 180, left: 270 };

// Eckiger Pfeil ohne Stiel (Jonas' Fehlerbericht 2026-07-23: "kein Dreieck,
// eher eine Ecke, wie ein umgedrehtes V") - zwei Linien, kein gefuelltes
// Dreieck/Polygon. Basis-Pfad zeigt bei direction="up" nach oben (Spitze
// oben, "∧" - das "umgedrehte V"); die anderen Richtungen sind reine
// CSS-Rotationen desselben Pfads, inklusive Transition fuer den
// Dreh-Effekt beim Auf-/Zuklappen.
export function Chevron({ direction, className = "" }: ChevronProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className={className}
      style={{ transform: `rotate(${ROTATION[direction]}deg)`, transition: "transform 200ms ease" }}
      aria-hidden
    >
      <path d="M2 9 L7 4 L12 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
