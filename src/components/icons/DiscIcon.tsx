interface DiscIconProps {
  size?: number;
  className?: string;
}

// Lucide "disc-3" (Jonas' Vorgabe 2026-07-29: fuer Speichern-Vorgaenge statt
// eines Ladebalkens - eine Prozentzahl laesst sich fuer die Speicher-Kodierung
// nicht zuverlaessig vorhersagen). Dreht sich dauerhaft, solange es gemountet
// ist - kein Hover-Trigger noetig, da es nur waehrend eines echten
// Ladezustands angezeigt wird (siehe LoadingIcon.tsx/LoadingIndicator.tsx).
// Jonas' Fehlerbericht 2026-08-11: urspruenglich per motion/react (JS-
// getrieben) animiert, was waehrend schwerer Haupt-Thread-Last (z.B.
// gleichzeitiger CSG-Aufbau) sichtbar stottern konnte - jetzt eine reine
// CSS-@keyframes-Animation (.ssk-spin, siehe index.css), Compositor-Thread,
// unberuehrt von JS-Blockaden.
export function DiscIcon({ size = 20, className }: DiscIconProps) {
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
      className={`ssk-spin ${className ?? ""}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M6 12c0-1.7.7-3.2 1.8-4.2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M18 12c0 1.7-.7 3.2-1.8 4.2" />
    </svg>
  );
}
