import { useState } from "react";
import { loadSpaceMouseSensitivity, saveSpaceMouseSensitivity } from "../config/spaceMouseSettingsStore";

// Jonas' Vorgabe 2026-08-12: Empfindlichkeit der SpaceMouse einstellbar,
// persistiert (siehe spaceMouseSettingsStore.ts) - gleiche Konvention wie
// useUnitPreferences.ts. Scene.tsx/ProjectScene3D.tsx rufen das jeweils
// selbst auf (nie gleichzeitig gemountet) und reichen sensitivity/
// setSensitivity an SpaceMouseCameraRig (Anwendung) sowie ViewerToolbar
// (Einstellungen-Panel) weiter.
export function useSpaceMouseSensitivity() {
  const [sensitivity, setSensitivityState] = useState<number>(() => loadSpaceMouseSensitivity());

  function setSensitivity(next: number) {
    setSensitivityState(next);
    saveSpaceMouseSensitivity(next);
  }

  return { sensitivity, setSensitivity };
}
