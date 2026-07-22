import { createContext, useContext } from "react";

export type ViewStyle = "realistic" | "shaded_edges";
export type BackgroundStyle = "studio" | "terrain";

export interface DisplaySettings {
  viewStyle: ViewStyle;
  insideColor: string;
  outsideColor: string;
  // Jonas' Vorgabe 2026-07-24: "innen unlackiert" als Alternative zur
  // Innenfarbe - wenn true, ignorieren Wall/DoorLeaf insideColor und nutzen
  // stattdessen das rohe Blech-Material (siehe constants/unpaintedMaterial.ts).
  insideUnpainted: boolean;
}

// Stellt Ansicht-Stil + Innen-/Aussenfarbe per Context bereit (Jonas'
// Vorgabe 2026-07-22), aus demselben Grund wie SectionPlaneContext: sonst
// muesste jede Ebene (Container -> Wall -> DoorLeaf) das durchreichen.
// shadowsEnabled (Jonas' Vorgabe 2026-07-24) laeuft NICHT ueber diesen
// Context, sondern als direkte Scene-Prop - nur Scene selbst braucht es,
// fuer <Canvas shadows={...}>, das den Shadow-Map-Pass global (de)aktiviert.
const DisplaySettingsContext = createContext<DisplaySettings>({
  viewStyle: "realistic",
  insideColor: "#d7dade",
  outsideColor: "#d7dade",
  insideUnpainted: false,
});

export const DisplaySettingsProvider = DisplaySettingsContext.Provider;

export function useDisplaySettings(): DisplaySettings {
  return useContext(DisplaySettingsContext);
}
