interface MoonIconProps {
  size?: number;
  className?: string;
}

// Von animate-ui.com/pqoqubbw/icons uebernommen (vereinfacht: ohne die
// dortige eigene Hover-Trigger-Logik, siehe SunIcon.tsx fuer die
// Begruendung).
export function MoonIcon({ size = 16, className }: MoonIconProps) {
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
