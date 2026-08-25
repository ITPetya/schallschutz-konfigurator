import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { isStorageAllowed } from "../config/storageConsent";
import { safeGetItem, safeSetItem } from "../utils/safeLocalStorage";

export type Theme = "light" | "dark";

// Exportiert (statt modulintern), damit "Meine Daten löschen"
// (projectHistoryStore.ts) diesen Key mit entfernen kann.
export const THEME_KEY = "ssk_theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadStoredTheme(): Theme | null {
  const raw = safeGetItem(THEME_KEY);
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
    // Nur bei erteilter Speicher-Einwilligung schreiben (Jonas' Vorgabe
    // 2026-07-29: ein "Nein" im StorageConsentBanner muss WIRKLICH jede
    // weitere Speicherung verhindern, nicht nur die Projekt-Historie).
    if (isStorageAllowed()) safeSetItem(THEME_KEY, theme);
  }, [theme]);

  // "Swoosh"-Animation beim Umschalten (Jonas' Vorgabe 2026-07-28, siehe
  // @keyframes theme-swoosh in index.css) ueber die View-Transitions-API -
  // in Browsern ohne Unterstuetzung (Firefox/Safari) bleibt es beim
  // normalen, sofortigen Wechsel, reine Progressive Enhancement. flushSync
  // erzwingt den State-Update synchron ins DOM, weil die API den "Nachher"-
  // Schnappschuss direkt nach Ablauf des uebergebenen Callbacks aufnimmt und
  // React-Updates sonst asynchron/gebatcht erst spaeter anwenden wuerde.
  function toggleTheme() {
    const applyNext = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(() => flushSync(applyNext));
    } else {
      applyNext();
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme muss innerhalb von ThemeProvider verwendet werden");
  return ctx;
}
