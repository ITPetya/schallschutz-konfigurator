import type { ContainerSize } from "../constants/containerSizes";
import type { Opening, PanelId } from "../types/openings";
import { isVerticalWall } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { CORNER_WALL_RECESS_MM } from "../components/CornerCasting";
import { uExtent, vExtent } from "./panelGeometry";

const MM_TO_M = 1 / 1000;
// Gleicher Versatz-Betrag wie wallFaces.ts's OUTWARD_OFFSET_M - haelt die
// Klick-/Markierungs-Ebene knapp ausserhalb der echten Wandflaeche
// (Z-Fighting-Vermeidung), hier zusaetzlich zur halben Panel-Dicke (die
// Wandflaeche selbst liegt bei t/2 vom Panel-Mittelpunkt entfernt).
const OUTWARD_OFFSET_M = 0.01;

export interface OpeningFace {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}

function rotateIdentity(p: [number, number, number]): [number, number, number] {
  return p;
}
function rotateY90([x, y, z]: [number, number, number]): [number, number, number] {
  return [z, y, -x];
}
function rotateXNeg90([x, y, z]: [number, number, number]): [number, number, number] {
  return [x, z, -y];
}
function rotateXPos90([x, y, z]: [number, number, number]): [number, number, number] {
  return [x, -z, y];
}

interface PanelPlacement {
  position: [number, number, number];
  rotation: [number, number, number];
  panelWidth: number;
  panelHeight: number;
  outwardSign: 1 | -1;
  rotate: (p: [number, number, number]) => [number, number, number];
}

// Repliziert dieselben von Container.tsx hergeleiteten Formeln wie
// measurePoints.ts's getPanelTransform bzw. wallFaces.ts's computeWallFaces
// (siehe dort fuer die ausfuehrliche Begruendung jedes Werts) - als eigene
// reine Funktion statt eines Imports quer durch die utils-Dateien, demselben
// bewussten Muster folgend, das wallFaces.ts fuer sich selbst beschreibt.
function getPanelPlacement(panel: PanelId, size: ContainerSize, wallThicknessMm: number, floorThicknessMm: number): PanelPlacement {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThicknessMm * MM_TO_M;
  const floorT = floorThicknessMm * MM_TO_M;
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;
  const effectiveL = L - 2 * wallRecess;
  const effectiveW = W - 2 * wallRecess;
  const effectiveH = H - 2 * wallRecess;
  const verticalWallHeight = Math.max(effectiveH - t - floorT, 0);
  const verticalWallPositionY = H / 2 + (floorT - t) / 2;
  const endWallWidth = Math.max(effectiveW - 2 * t, 0);

  switch (panel) {
    case "left":
      return {
        position: [0, verticalWallPositionY, W / 2 - t / 2 - wallRecess],
        rotation: [0, 0, 0],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: 1,
        rotate: rotateIdentity,
      };
    case "right":
      return {
        position: [0, verticalWallPositionY, -W / 2 + t / 2 + wallRecess],
        rotation: [0, 0, 0],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateIdentity,
      };
    case "back":
      return {
        position: [-L / 2 + t / 2 + wallRecess, verticalWallPositionY, 0],
        rotation: [0, Math.PI / 2, 0],
        panelWidth: endWallWidth,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateY90,
      };
    case "front":
      return {
        position: [L / 2 - t / 2 - wallRecess, verticalWallPositionY, 0],
        rotation: [0, Math.PI / 2, 0],
        panelWidth: endWallWidth,
        panelHeight: verticalWallHeight,
        outwardSign: 1,
        rotate: rotateY90,
      };
    case "top":
      return {
        position: [0, H - t / 2 - wallRecess, 0],
        rotation: [-Math.PI / 2, 0, 0],
        panelWidth: effectiveL,
        panelHeight: effectiveW,
        outwardSign: 1,
        rotate: rotateXNeg90,
      };
    case "bottom":
    default:
      return {
        position: [0, floorT / 2 + wallRecess, 0],
        rotation: [Math.PI / 2, 0, 0],
        panelWidth: effectiveL,
        panelHeight: effectiveW,
        outwardSign: 1,
        rotate: rotateXPos90,
      };
  }
}

function addPoints(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function panelThicknessMm(panel: PanelId, wallThicknessMm: number, floorThicknessMm: number): number {
  return panel === "bottom" ? floorThicknessMm : wallThicknessMm;
}

// Welt-Rechtecke (Mittelpunkt + Rotation + Breite/Hoehe, Meter) fuer JEDE
// bereits platzierte Einbaute - Grundlage fuer SelectableFaceMarkers.tsx'
// Klick-/Hover-Ebenen (Jonas' Vorgabe 2026-08-17: "Einbauten in 3D
// auswaehlbar machen"). Position sitzt knapp ausserhalb der sichtbaren
// Aussenflaeche (gleiche Ableitung wie measurePoints.ts's
// openingPointToWorld, plus dem zusaetzlichen OUTWARD_OFFSET_M-Versatz aus
// wallFaces.ts), Rotation identisch zum jeweiligen Panel aus
// wallFaces.ts's computeWallFaces.
export function computeOpeningFaces(openings: Opening[], size: ContainerSize, wallThicknessMm: number, floorThicknessMm: number): OpeningFace[] {
  return openings.map((opening) => {
    const typeDef = OPENING_TYPES[opening.kind];
    const placement = getPanelPlacement(opening.panel, size, wallThicknessMm, floorThicknessMm);
    const uM = opening.u * MM_TO_M;
    // Siehe measurePoints.ts's computeMeasurePoints fuer dieselbe Tuer-
    // Unterkante-zu-Mitte-Umrechnung und den Seitenwand-Korrekturbetrag.
    let vCenterM = (typeDef.isDoor ? opening.v + opening.height / 2 : opening.v) * MM_TO_M;
    if (isVerticalWall(opening.panel)) {
      vCenterM -= CORNER_WALL_RECESS_MM * MM_TO_M + floorThicknessMm * MM_TO_M;
    }
    const t = panelThicknessMm(opening.panel, wallThicknessMm, floorThicknessMm) * MM_TO_M;
    const localY = vCenterM - placement.panelHeight / 2;
    const localZ = placement.outwardSign * (t / 2 + OUTWARD_OFFSET_M);
    const position = addPoints(placement.position, placement.rotate([uM, localY, localZ]));

    const width = typeDef.shape === "round" ? opening.width * MM_TO_M : (uExtent(opening, opening.panel) * MM_TO_M);
    const height = typeDef.shape === "round" ? opening.width * MM_TO_M : (vExtent(opening, opening.panel) * MM_TO_M);

    return { id: opening.id, position, rotation: placement.rotation, width, height };
  });
}
