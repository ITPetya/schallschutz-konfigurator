import { AnimatedButton } from "./AnimatedButton";
import { CircleAlertIcon } from "./icons/CircleAlertIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/Popover";

interface InfoBadgeProps {
  text: string;
  className?: string;
}

// Neutrale Info-Variante von SonderBadge.tsx (Jonas' Vorgabe 2026-08-25:
// "wie das orangene Ausrufezeichen für Sonderheiten, nur in grau") - fuer
// erklaerenden Hinweistext ohne Aufpreis-/Warnbedeutung, z.B. "wofuer ist
// dieses Format gut" im Herunterladen-Dialog (siehe DownloadDialog.tsx).
// Gleiches Klick-Verhalten/Popover-Aufbau, nur Farbe + aria-label angepasst.
export function InfoBadge({ text, className }: InfoBadgeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <AnimatedButton
          type="button"
          aria-label="Hinweis anzeigen"
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 ${className ?? ""}`}
        >
          <CircleAlertIcon size={16} />
        </AnimatedButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="z-50 w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
