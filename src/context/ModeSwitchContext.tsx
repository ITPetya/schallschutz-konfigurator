import { createContext, useContext, useState, type ReactNode } from "react";

export type WorkspaceMode = "single" | "project";

interface WorkspaceModeAPI {
  mode: WorkspaceMode;
  requestModeChange: (mode: WorkspaceMode) => void;
}

interface ModeSwitchContextValue {
  workspace: WorkspaceModeAPI | null;
  registerWorkspace: (api: WorkspaceModeAPI | null) => void;
}

const ModeSwitchContext = createContext<ModeSwitchContextValue | null>(null);

// Jonas' Vorgabe 2026-07-25: der Baugruppen- und der Einzelcontainer-
// Konfigurator teilen sich jetzt EINE Seite (WorkspacePage.tsx) mit einem
// gemeinsamen 3D-Viewer - nur die Werkzeuge in der Seitenleiste wechseln.
// AppShell.tsx zeigt das Dropdown dafuer aber im GEMEINSAMEN Header, der
// unabhaengig von WorkspacePage gerendert wird - dieser Context ist die
// Bruecke dazwischen: WorkspacePage registriert bei jeder Aenderung ihren
// aktuellen Modus + eine Wechsel-Funktion (die selbst entscheidet, ob eine
// Speichern/Verwerfen-Erinnerung noetig ist, siehe dort), AppShell liest nur
// das aktuelle `workspace`-Objekt, um das Dropdown zu befuellen/zu steuern.
// Anders als der fruehere, rein Ref-basierte Guard (Navigation zwischen zwei
// Routen) MUSS das hier echter React-State sein, damit das Dropdown reaktiv
// den aktuell aktiven Modus anzeigt.
export function ModeSwitchProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceModeAPI | null>(null);
  return (
    <ModeSwitchContext.Provider value={{ workspace, registerWorkspace: setWorkspace }}>
      {children}
    </ModeSwitchContext.Provider>
  );
}

export function useModeSwitch(): ModeSwitchContextValue {
  const ctx = useContext(ModeSwitchContext);
  if (!ctx) throw new Error("useModeSwitch must be used within a ModeSwitchProvider");
  return ctx;
}
