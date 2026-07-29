interface MenuIconProps {
  size?: number;
  className?: string;
}

// Lucide "menu" (3 waagerechte Striche) - fuer den Seitenleisten-Umschalter
// auf dem Handy (Jonas' Vorgabe 2026-07-29). Bewusst statisch/ohne eigenen
// Hover-Morph (anders als z. B. XIcon.tsx) - der umgebende AnimatedButton
// liefert bereits Skalier-Feedback beim Antippen, ein zusaetzlicher
// Linien-Morph waere fuer einen reinen Auf/Zu-Umschalter unnoetig.
export function MenuIcon({ size = 20, className }: MenuIconProps) {
  return (
    <svg
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
      <line x1={4} y1={6} x2={20} y2={6} />
      <line x1={4} y1={12} x2={20} y2={12} />
      <line x1={4} y1={18} x2={20} y2={18} />
    </svg>
  );
}
