import { createContext, useContext, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type SwitchGuard = (targetPath: string) => void;

interface ModeSwitchContextValue {
  // Seiten mit eigenem, potenziell "nicht-leerem" Zustand (KonfiguratorPage,
  // ProjectPage) registrieren hier eine Guard-Funktion, die VOR dem
  // eigentlichen Navigieren entscheidet, ob eine Speichern/Verwerfen-
  // Erinnerung noetig ist (Jonas' Vorgabe 2026-07-25) - AppShell.tsx kennt
  // diese Zustaende nicht und ruft deshalb nie navigate() direkt auf,
  // sondern immer requestSwitch().
  registerGuard: (guard: SwitchGuard | null) => void;
  requestSwitch: (targetPath: string) => void;
}

const ModeSwitchContext = createContext<ModeSwitchContextValue | null>(null);

export function ModeSwitchProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const guardRef = useRef<SwitchGuard | null>(null);

  function registerGuard(guard: SwitchGuard | null) {
    guardRef.current = guard;
  }

  function requestSwitch(targetPath: string) {
    if (guardRef.current) {
      guardRef.current(targetPath);
    } else {
      navigate(targetPath);
    }
  }

  return (
    <ModeSwitchContext.Provider value={{ registerGuard, requestSwitch }}>{children}</ModeSwitchContext.Provider>
  );
}

export function useModeSwitch(): ModeSwitchContextValue {
  const ctx = useContext(ModeSwitchContext);
  if (!ctx) throw new Error("useModeSwitch must be used within a ModeSwitchProvider");
  return ctx;
}
