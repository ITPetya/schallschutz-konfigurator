import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "ssk_theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadStoredTheme(): Theme | null {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : null;
}

// Hell/Dunkel-Umschalter (Jonas' Vorgabe: Switch-Bauteil von animate-ui.com,
// siehe https://animate-ui.com/docs/components/radix/switch, oben rechts im
// Header). Ohne gespeicherte Praeferenz startet die App IMMER im Hellmodus
// (Jonas' Vorgabe: bewusst NICHT die System-Einstellung uebernehmen) -
// Tailwind v4 braucht fuer den manuellen Umschalter die "@custom-variant
// dark"-Definition in index.css, die die "dark:"-Variante an eine echte
// CSS-Klasse statt an prefers-color-scheme bindet.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => loadStoredTheme() ?? "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme muss innerhalb von ThemeProvider verwendet werden");
  return ctx;
}
