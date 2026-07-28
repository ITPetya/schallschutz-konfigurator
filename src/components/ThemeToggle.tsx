import { useTheme } from "../context/ThemeContext";
import { Switch, SwitchThumb, SwitchIcon } from "./primitives/Switch";
import { SunIcon } from "./icons/SunIcon";
import { MoonIcon } from "./icons/MoonIcon";

// Hell/Dunkel-Umschalter (Jonas' Vorgabe: Switch-Bauteil von animate-ui.com,
// siehe https://animate-ui.com/docs/components/radix/switch) - sitzt im
// Header links neben dem "?"-Menü. Das Icon im Thumb zeigt immer den
// AKTUELLEN Modus (Sonne = hell, Mond = dunkel), unabhaengig von der
// Track-Position.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Switch
      checked={isDark}
      onCheckedChange={toggleTheme}
      aria-label={isDark ? "Zu hellem Modus wechseln" : "Zu dunklem Modus wechseln"}
      className="relative flex h-6 w-11 shrink-0 items-center justify-start rounded-full border border-slate-300 bg-slate-100 px-0.5 data-[state=checked]:justify-end data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-700 dark:border-slate-600 dark:bg-slate-700"
    >
      <SwitchThumb
        pressedAnimation={{ width: 20 }}
        className="z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-dark shadow"
      >
        <SwitchIcon position="thumb" className="flex items-center justify-center">
          {isDark ? <MoonIcon size={12} /> : <SunIcon size={12} />}
        </SwitchIcon>
      </SwitchThumb>
    </Switch>
  );
}
