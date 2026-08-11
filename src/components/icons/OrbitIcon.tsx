interface OrbitIconProps {
  size?: number;
  className?: string;
}

// Lucide "orbit" - generisches Ladeicon fuer JEDEN Ladezustand ausser
// Speichern (siehe DiscIcon.tsx), Jonas' Vorgabe 2026-07-29: dreht sich
// dauerhaft, solange es gemountet ist. Jonas' Fehlerbericht 2026-08-11: die
// Drehung stotterte sichtbar genau dann, wenn im Hintergrund eine schwere
// CSG-Neuberechnung den Haupt-Thread blockierte (dieses Icon ist ja genau
// waehrend solcher Ladevorgaenge sichtbar) - urspruenglich per motion/react
// animiert (JS/requestAnimationFrame-getrieben), jetzt eine reine
// CSS-@keyframes-Animation (.ssk-spin-slow, siehe index.css), die auf dem
// Compositor-Thread laeuft und dadurch von Haupt-Thread-Last unberuehrt
// bleibt.
export function OrbitIcon({ size = 20, className }: OrbitIconProps) {
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
      className={`ssk-spin-slow ${className ?? ""}`}
    >
      <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85" />
      <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
    </svg>
  );
}
