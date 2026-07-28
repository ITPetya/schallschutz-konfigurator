interface SunIconProps {
  size?: number;
  className?: string;
}

// Von animate-ui.com/pqoqubbw/icons uebernommen (vereinfacht: ohne die
// dortige eigene Hover-Trigger-Logik, da dieses Icon im Darkmode-Switch
// sitzt und sein Erscheinen/Verschwinden schon von SwitchIcon gesteuert
// wird, siehe components/primitives/Switch.tsx).
export function SunIcon({ size = 16, className }: SunIconProps) {
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
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2" />
      <path d="m19.07 4.93-1.41 1.41" />
      <path d="M20 12h2" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M12 20v2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="M2 12h2" />
      <path d="m4.93 4.93 1.41 1.41" />
    </svg>
  );
}
