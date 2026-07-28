import { createContext, useContext, type ReactNode } from "react";

// Von animate-ui.com uebernommenes Hilfsmuster (dort "@animate-ui/lib-get-strict-context")
// - Context + Provider + Hook in einem Aufruf, der wirft, wenn der Hook
// ausserhalb des Providers benutzt wird, statt still `undefined` zurueckzugeben.
export function getStrictContext<T>(name?: string) {
  const Context = createContext<T | undefined>(undefined);

  function Provider({ value, children }: { value: T; children?: ReactNode }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useSafeContext(): T {
    const ctx = useContext(Context);
    if (ctx === undefined) {
      throw new Error(`useContext must be used within ${name ?? "a Provider"}`);
    }
    return ctx;
  }

  return [Provider, useSafeContext] as const;
}
