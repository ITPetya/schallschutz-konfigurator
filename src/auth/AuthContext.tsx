import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "./types";
import * as store from "./mockAuthStore";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (email: string, name: string, password: string) => string | null; // Fehlermeldung oder null bei Erfolg
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => store.currentSessionUser());

  function login(email: string, password: string) {
    const result = store.login(email, password);
    if (result) {
      setUser(result);
      return true;
    }
    return false;
  }

  function logout() {
    store.logout();
    setUser(null);
  }

  function register(email: string, name: string, password: string) {
    const result = store.register(email, name, password);
    if ("error" in result) return result.error;
    setUser(result);
    return null;
  }

  return <AuthContext.Provider value={{ user, login, logout, register }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
