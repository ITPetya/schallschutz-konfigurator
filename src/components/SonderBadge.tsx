import { AnimatedButton } from "./AnimatedButton";
import { CircleAlertIcon } from "./icons/CircleAlertIcon";
import { Popover, PopoverContent, PopoverTrigger } from "./primitives/Popover";

interface SonderBadgeProps {
  // Kurzer Aufpreis-/Sonderausstattungs-Hinweistext, erscheint im Popover
  // nach Klick auf den Kreis (Jonas' Vorgabe 2026-08-10: "wenn man da drauf
  // klick kommt dann daraus ein fenster in dem der text zum aufpreis etc.
  // steht").
  text: string;
  className?: string;
}

// Kleiner oranger Kreis mit Ausrufezeichen, markiert ueberall im
// Konfigurator eine gewaehlte Sonderausstattung/Sondermass (Jonas' Vorgabe
// 2026-08-10: "wie eine notification, in orange"). Erscheint neben der
// jeweils AKTUELLEN Auswahl/Eingabe (nicht pro Zeile in nativen
// <select>-Listen, da dort keine klickbaren Icons moeglich sind - Ausnahme
// RAL-Sonderfarben, die eine eigene Liste bekommen haben, siehe
// DisplaySettingsPanel.tsx).
export function SonderBadge({ text, className }: SonderBadgeProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <AnimatedButton
          type="button"
          aria-label="Sonderausstattung – Hinweis anzeigen"
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 ${className ?? ""}`}
        >
          <CircleAlertIcon size={16} />
        </AnimatedButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="z-50 w-56 rounded-lg border border-orange-200 bg-white p-2.5 text-xs text-orange-800 shadow-lg dark:border-orange-900 dark:bg-slate-800 dark:text-orange-200"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
