import { createContext, useContext } from "react";
import * as THREE from "three";

// Stellt die aktuelle Schnittebene (Section-View-Werkzeug, Jonas' Vorgabe
// 2026-07-22) per Context bereit, statt sie durch jede Komponentenebene
// (Container -> Wall -> DoorLeaf) durchzureichen. null = Schnittansicht aus.
const SectionPlaneContext = createContext<THREE.Plane | null>(null);

export const SectionPlaneProvider = SectionPlaneContext.Provider;

export function useSectionPlane(): THREE.Plane | null {
  return useContext(SectionPlaneContext);
}
