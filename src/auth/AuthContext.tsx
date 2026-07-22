import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "./types";
import * as store from "./mockAuthStore";

interface AuthContextValue {
  user: User | null;
  // Gibt den eingeloggten User zurueck (statt nur true/false) - der Aufrufer
  // (AuthPopover) braucht die Rolle SOFORT, um die passende "erste Anmeldung"-
  // Tour zu starten, ohne auf den naechsten Render zu warten (Jonas' Vorgabe
  // 2026-07-22: Tutorials).
  login: (email: string, password: string) => User | null;
  logout: () => void;
  register: (email: string, name: string, password: string) => User | string; // User bei Erfolg, sonst Fehlermeldung
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => store.currentSessionUser());

  function login(email: string, password: string) {
    const result = store.login(email, password);
    if (result) setUser(result);
    return result;
  }

  function logout() {
    store.logout();
    setUser(null);
  }

  function register(email: string, name: string, password: string) {
    const result = store.register(email, name, password);
    if ("error" in result) return result.error;
    setUser(result);
    return result;
  }

  return <AuthContext.Provider value={{ user, login, logout, register }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
