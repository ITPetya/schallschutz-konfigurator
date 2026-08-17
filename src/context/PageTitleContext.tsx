import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageTitleContextValue {
  subtitle: string | null;
  setSubtitle: (subtitle: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

// Umschliesst AppShell.tsx's Kopfzeile UND <Outlet/> (Geschwister im selben
// Provider) - Seiten setzen den Unterbereich per usePageSubtitle() von innen,
// die Kopfzeile liest ihn per useContext von aussen, siehe ThemeContext.tsx
// fuer dasselbe Grundmuster.
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [subtitle, setSubtitle] = useState<string | null>(null);
  return <PageTitleContext.Provider value={{ subtitle, setSubtitle }}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleContext(): PageTitleContextValue {
  const ctx = useContext(PageTitleContext);
  if (!ctx) throw new Error("usePageTitleContext muss innerhalb von PageTitleProvider verwendet werden");
  return ctx;
}

// Jonas' Vorgabe 2026-08-17: "Container Studio" soll immer erkennen lassen,
// in welchem Bereich man sich befindet - Seiten rufen diesen Hook mit ihrem
// aktuellen Unterbereichs-Titel auf (z. B. "Baugruppen-Konfiguration"), der
// automatisch beim Unmount/Wechsel wieder zurueckgesetzt wird, damit eine
// verlassene Seite nicht den Titel einer anderen ueberschreibt.
export function usePageSubtitle(subtitle: string | null): void {
  const { setSubtitle } = usePageTitleContext();
  useEffect(() => {
    setSubtitle(subtitle);
    return () => setSubtitle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitle]);
}
