import { useState } from "react";
import { loadViewPreferences, saveViewPreferences, type ViewPreferences } from "../config/viewPreferencesStore";

// Jonas' Vorgabe 2026-08-14: Ansicht-Stil/Hintergrund/Schatten/Gelände-
// Detailstufe sind reine Browser-Praeferenz statt Teil der gespeicherten
// Konfiguration (siehe viewPreferencesStore.ts) - Scene.tsx/ProjectScene3D.tsx
// rufen das jeweils selbst auf (nie gleichzeitig gemountet, siehe
// useUnitPreferences.ts fuer dasselbe Muster) und reichen prefs/updatePrefs
// direkt an ViewerToolbar bzw. DisplaySettingsProvider weiter.
export function useViewPreferences() {
  const [prefs, setPrefsState] = useState<ViewPreferences>(() => loadViewPreferences());

  function updatePrefs(patch: Partial<ViewPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefsState(next);
    saveViewPreferences(next);
  }

  return { prefs, updatePrefs };
}
