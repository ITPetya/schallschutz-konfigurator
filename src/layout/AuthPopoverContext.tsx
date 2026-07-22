import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthPopoverContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const AuthPopoverContext = createContext<AuthPopoverContextValue | null>(null);

// Erlaubt jeder Seite (nicht nur dem Profil-Icon oben rechts), das Login-/
// Registrieren-Fenster zu oeffnen - z. B. der "Anmelden"-Button auf der
// Startseite oder der "registrieren oder anmelden"-Link auf der
// Projekte-Seite (Jonas' Vorgabe 2026-07-22).
export function AuthPopoverProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AuthPopoverContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </AuthPopoverContext.Provider>
  );
}

export function useAuthPopover(): AuthPopoverContextValue {
  const ctx = useContext(AuthPopoverContext);
  if (!ctx) throw new Error("useAuthPopover muss innerhalb von AuthPopoverProvider verwendet werden");
  return ctx;
}
