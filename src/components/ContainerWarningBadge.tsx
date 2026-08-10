import { AnimatedButton } from "./AnimatedButton";
import { CircleAlertIcon } from "./icons/CircleAlertIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/Popover";
import type { ContainerWarning } from "../utils/containerWarnings";

interface ContainerWarningBadgeProps {
  warnings: ContainerWarning[];
  className?: string;
}

// Sammel-Variante von SonderBadge.tsx (Jonas' Vorgabe 2026-08-10: "wenn an
// einem Container etwas Orange oder rot ist, soll das auch in der Baugruppe
// übertragen werden ... ein kleines oranges/rotes Ausrufezeichen bei dem
// jeweiligen Container, wenn man dann da drauf geht soll detailliert
// beschrieben werden welche Sachen das verursachen") - rot, sobald
// MINDESTENS eine der Ursachen zwingend/rot ist, sonst orange; das
// Popover listet ALLE Ursachen einzeln mit ihrer eigenen Farbe auf. Texte
// kommen aus containerWarnings.ts, derselben Quelle wie die einzelnen
// Feld-Badges am Container selbst, damit hier nichts abweicht.
export function ContainerWarningBadge({ warnings, className }: ContainerWarningBadgeProps) {
  if (warnings.length === 0) return null;
  const hasRed = warnings.some((w) => w.severity === "red");
  const colorClass = hasRed
    ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
    : "text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <AnimatedButton
          type="button"
          aria-label="Sonderausstattung – Details anzeigen"
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${colorClass} ${className ?? ""}`}
        >
          <CircleAlertIcon size={16} />
        </AnimatedButton>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={6}
        className="z-50 w-64 space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        {warnings.map((w, i) => (
          <p
            key={i}
            className={`flex items-start gap-1.5 ${w.severity === "red" ? "text-red-700 dark:text-red-300" : "text-orange-800 dark:text-orange-200"}`}
          >
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${w.severity === "red" ? "bg-red-500" : "bg-orange-500"}`} />
            {w.text}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  );
}
