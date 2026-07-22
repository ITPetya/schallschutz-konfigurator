import { createContext, useContext } from "react";

export type ViewStyle = "realistic" | "shaded_edges";
export type BackgroundStyle = "studio" | "terrain";

export interface DisplaySettings {
  viewStyle: ViewStyle;
  insideColor: string;
  outsideColor: string;
}

// Stellt Ansicht-Stil + Innen-/Aussenfarbe per Context bereit (Jonas'
// Vorgabe 2026-07-22), aus demselben Grund wie SectionPlaneContext: sonst
// muesste jede Ebene (Container -> Wall -> DoorLeaf) das durchreichen.
const DisplaySettingsContext = createContext<DisplaySettings>({
  viewStyle: "realistic",
  insideColor: "#d7dade",
  outsideColor: "#d7dade",
});

export const DisplaySettingsProvider = DisplaySettingsContext.Provider;

export function useDisplaySettings(): DisplaySettings {
  return useContext(DisplaySettingsContext);
}
