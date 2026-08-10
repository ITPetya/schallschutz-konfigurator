import { useState } from "react";
import { loadUnitPreferences, saveUnitPreferences, type UnitPreferences } from "../config/unitPreferencesStore";

// Jonas' Vorgabe 2026-08-10: Haupt-/Sekundäreinheit im Messwerkzeug,
// persistiert (siehe unitPreferencesStore.ts). Scene.tsx/ProjectScene3D.tsx
// rufen das jeweils selbst auf (nie gleichzeitig gemountet - Einzelcontainer-
// vs. Baugruppen-Ansicht) und reichen prefs/setPrefs an ViewerToolbar
// (Einstellungen) sowie MeasureMarkers (Anzeige) weiter.
export function useUnitPreferences() {
  const [prefs, setPrefsState] = useState<UnitPreferences>(() => loadUnitPreferences());

  function setPrefs(next: UnitPreferences) {
    setPrefsState(next);
    saveUnitPreferences(next);
  }

  return { prefs, setPrefs };
}
