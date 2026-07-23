import type { ContainerConfig } from "./types";
import { DEFAULT_CONTAINER_SIZE, DEFAULT_WALL_THICKNESS } from "../constants/containerSizes";
import { RAL_STANDARD_COLORS } from "../constants/ralColors";

// Ausgelagert aus KonfiguratorPage.tsx (Baugruppen-Nacht-Session
// 2026-07-23): ProjectPage.tsx braucht dieselbe Default-Konfiguration fuer
// neu angelegte Container-Instanzen, darf dafuer aber NICHT aus
// KonfiguratorPage.tsx importieren - das wuerde dessen komplette
// three.js/r3f/drei-Importkette (Scene, OpeningsPanel, ...) mit in
// ProjectPages eigentlich leichten Chunk ziehen und die Route-Splitting-
// Arbeit von vorhin unterlaufen. Diese Datei hat bewusst KEINE 3D-Importe.
export function defaultConfig(): ContainerConfig {
  return {
    size: DEFAULT_CONTAINER_SIZE,
    wallThickness: DEFAULT_WALL_THICKNESS,
    openings: [],
    viewStyle: "realistic",
    background: "studio",
    // RAL 7004 Signalgrau.
    insideColor: RAL_STANDARD_COLORS[1].hex,
    outsideColor: RAL_STANDARD_COLORS[1].hex,
    shadowsEnabled: true,
    terrainDetail: "low",
    insideUnpainted: false,
    outsideNotes: "",
    insideNotes: "",
  };
}
