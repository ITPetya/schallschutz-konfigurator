import type { ContainerSize } from "../constants/containerSizes";
import type { PanelId } from "../types/openings";
import { CORNER_WALL_RECESS_MM } from "../components/CornerCasting";

const MM_TO_M = 1 / 1000;

// Kleiner Versatz nach aussen entlang der Flaechen-Normalen, damit die
// Klick-/Markierungs-Ebenen nicht exakt in der Wandoberflaeche liegen
// (Z-Fighting) - identisch zu AlignmentFaceMarkers.tsx's OUTWARD_OFFSET_M,
// dieselbe Groessenordnung hat sich dort schon bewaehrt.
const OUTWARD_OFFSET_M = 0.01;

// Jonas' Fehlerbericht 2026-08-13: die Dach-Markierung sass exakt auf der
// FLACHEN Dachflaeche (wall-top in Container.tsx) und wurde dadurch von der
// First-Schraege (RoofRidge.tsx, additiv obendrauf) optisch angeschnitten -
// die Kappe reicht in der Mitte (First) bis zu "peak" ueber die flache
// Dachflaeche hinaus, mehr als der normale OUTWARD_OFFSET_M. Statt zweier
// schraeger Teilflaechen (Jonas' erste Alternativ-Idee) einfach die GESAMTE
// Dach-Markierung so weit anheben, dass sie ueberall oberhalb des Firsts
// schwebt - SLOPE_DEG muss mit RoofRidge.tsx's SLOPE_DEG uebereinstimmen.
const RIDGE_SLOPE_DEG = 1;
const RIDGE_CLEARANCE_MARGIN_M = 0.02;

export interface WallFace {
  panel: PanelId;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}

// Reine Geometriefunktion (kein React/Three-Import) fuer die 6 Aussenflaechen
// eines Einzelcontainers, als Grundlage fuer WallFaceMarkers.tsx (Klick-
// Auswahl der Wand im "Einbauten hinzufügen"-Assistenten, Jonas' Vorgabe
// 2026-08-13: "auch per klicken der Fläche, genau wie beim Ausrichten").
// Repliziert BEWUSST nur die Positions-/Rotations-/Spannweiten-Formeln aus
// Container.tsx (dort massgeblich fuer die echte CSG-Geometrie) als
// eigenstaendige, reine Funktion - analog zu panelGeometry.ts, das dieselbe
// Trennung fuer die u/v-Spannweiten schon vormacht. Container.tsx/Wall.tsx
// selbst bleiben unangetastet, damit an der bestehenden CSG-Geometrie kein
// Risiko entsteht.
export function computeWallFaces(size: ContainerSize, wallThickness: number, floorThickness: number): WallFace[] {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThickness * MM_TO_M;
  const floorT = floorThickness * MM_TO_M;
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;

  const effectiveL = L - 2 * wallRecess;
  const effectiveW = W - 2 * wallRecess;
  const effectiveH = H - 2 * wallRecess;
  const verticalWallHeight = Math.max(effectiveH - t - floorT, 0);
  const verticalWallPositionY = H / 2 + (floorT - t) / 2;
  const endWallWidth = Math.max(effectiveW - 2 * t, 0);
  const roofRidgePeakM = (effectiveW / 2) * Math.tan((RIDGE_SLOPE_DEG * Math.PI) / 180);

  return [
    {
      panel: "left",
      position: [0, verticalWallPositionY, W / 2 - wallRecess + OUTWARD_OFFSET_M],
      rotation: [0, 0, 0],
      width: effectiveL,
      height: verticalWallHeight,
    },
    {
      panel: "right",
      position: [0, verticalWallPositionY, -W / 2 + wallRecess - OUTWARD_OFFSET_M],
      rotation: [0, 0, 0],
      width: effectiveL,
      height: verticalWallHeight,
    },
    {
      panel: "back",
      position: [-L / 2 + wallRecess - OUTWARD_OFFSET_M, verticalWallPositionY, 0],
      rotation: [0, Math.PI / 2, 0],
      width: endWallWidth,
      height: verticalWallHeight,
    },
    {
      panel: "front",
      position: [L / 2 - wallRecess + OUTWARD_OFFSET_M, verticalWallPositionY, 0],
      rotation: [0, Math.PI / 2, 0],
      width: endWallWidth,
      height: verticalWallHeight,
    },
    {
      panel: "top",
      position: [0, H - wallRecess + roofRidgePeakM + RIDGE_CLEARANCE_MARGIN_M, 0],
      rotation: [-Math.PI / 2, 0, 0],
      width: effectiveL,
      height: effectiveW,
    },
    {
      panel: "bottom",
      position: [0, wallRecess - OUTWARD_OFFSET_M, 0],
      rotation: [Math.PI / 2, 0, 0],
      width: effectiveL,
      height: effectiveW,
    },
  ];
}
