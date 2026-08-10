import type { ContainerSize } from "../constants/containerSizes";
import type { Opening, PanelId } from "../types/openings";
import { isVerticalWall } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { CORNER_WALL_RECESS_MM } from "../components/CornerCasting";

const MM_TO_M = 1 / 1000;

export interface MeasurePoint {
  id: string;
  label: string;
  // Meter, CONTAINER-lokal (Ursprung = Container-Mittelpunkt am Boden,
  // unrotiert) - in der Baugruppen-Ansicht noch mit der Instanz-Position/
  // -Rotation zu transformieren, siehe measurePointsToWorld() unten.
  position: [number, number, number];
}

interface PanelTransform {
  position: [number, number, number];
  panelWidth: number;
  panelHeight: number;
  outwardSign: 1 | -1;
  rotate: (p: [number, number, number]) => [number, number, number];
}

function rotateIdentity(p: [number, number, number]): [number, number, number] {
  return p;
}
// Bildet exakt ab, was Three.js fuer eine Gruppe mit rotation=[0,PI/2,0] mit
// einem lokalen Punkt macht (Standard-Rotationsmatrix Ry(90°)) - siehe
// Wall.tsx/Container.tsx, wo Vorne/Hinten genau so rotiert werden.
function rotateY90([x, y, z]: [number, number, number]): [number, number, number] {
  return [z, y, -x];
}
// Ry(-90°) fuer das Dach (rotation=[-PI/2,0,0] in Container.tsx) - identische
// Herleitung wie in RoofRidge.tsx bereits verwendet/bestaetigt (Rx(-90°):
// y'=z, z'=-y).
function rotateXNeg90([x, y, z]: [number, number, number]): [number, number, number] {
  return [x, z, -y];
}
// Rx(+90°) fuer den Boden (rotation=[PI/2,0,0] in Container.tsx).
function rotateXPos90([x, y, z]: [number, number, number]): [number, number, number] {
  return [x, -z, y];
}

// Spiegelt Container.tsx's Wandplatzierung 1:1 (siehe dort fuer die
// Herleitung jedes Werts - Wandkeil-Mitering, wallRecess etc.) - EINZIGE
// Quelle fuer "wo im Raum sitzt Panel X", damit Durchbruch-Koordinaten (nur
// lokal zu ihrem Panel bekannt) korrekt in echte 3D-Punkte umgerechnet
// werden koennen.
function getPanelTransform(panel: PanelId, size: ContainerSize, wallThicknessMm: number): PanelTransform {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThicknessMm * MM_TO_M;
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;
  const effectiveL = L - 2 * wallRecess;
  const effectiveW = W - 2 * wallRecess;
  const effectiveH = H - 2 * wallRecess;
  const verticalWallHeight = Math.max(effectiveH - 2 * t, 0);
  const endWallWidth = Math.max(effectiveW - 2 * t, 0);

  switch (panel) {
    case "left":
      return {
        position: [0, H / 2, W / 2 - t / 2 - wallRecess],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: 1,
        rotate: rotateIdentity,
      };
    case "right":
      return {
        position: [0, H / 2, -W / 2 + t / 2 + wallRecess],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateIdentity,
      };
    case "back":
      return {
        position: [-L / 2 + t / 2 + wallRecess, H / 2, 0],
        panelWidth: endWallWidth,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateY90,
      };
    case "front":
      return {
        position: [L / 2 - t / 2 - wallRecess, H / 2, 0],
        panelWidth: endWallWidth,
        panelHeight: verticalWallHeight,
        outwardSign: 1,
        rotate: rotateY90,
      };
    case "top":
      return {
        position: [0, H - t / 2 - wallRecess, 0],
        panelWidth: effectiveL,
        panelHeight: effectiveW,
        outwardSign: 1,
        rotate: rotateXNeg90,
      };
    case "bottom":
    default:
      return {
        position: [0, t / 2 + wallRecess, 0],
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

// Weltpunkt (container-lokal) fuer einen Durchbruch-Punkt bei lokalem
// (localU, localVCenterM) auf seinem Panel, auf der SICHTBAREN
// Aussenflaeche der Wand (Z = outwardSign*t/2) - dort, wo der Ausschnitt
// tatsaechlich als Kante auf dem Modell zu sehen ist (siehe
// buildOpeningRimEdges in Wall.tsx, das dieselben beiden Wandflaechen
// nutzt).
function openingPointToWorld(
  panel: PanelId,
  size: ContainerSize,
  wallThicknessMm: number,
  localU: number,
  localVCenterM: number,
): [number, number, number] {
  const t = wallThicknessMm * MM_TO_M;
  const transform = getPanelTransform(panel, size, wallThicknessMm);
  const localY = localVCenterM - transform.panelHeight / 2;
  const localZ = transform.outwardSign * (t / 2);
  return addPoints(transform.position, transform.rotate([localU, localY, localZ]));
}

// Rechts/Oben/Links/Unten auf der Panelflaeche (lokale u/v-Achsen) - bei
// runden Durchbruechen sind das die 4 Punkte, an denen der Rand die
// horizontale/vertikale Mittelachse schneidet. Gegenueberliegende Punkte
// (0°/180° bzw. 90°/270°) ergeben per einfacher Punkt-zu-Punkt-Distanz genau
// den Durchmesser, ohne einen eigenen "Durchmesser messen"-Modus zu
// brauchen.
const ROUND_RIM_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

// Berechnet alle "einrastbaren" Messpunkte fuer EINEN Container (Aussenecken
// + Durchbruch-/Tuer-Merkmalspunkte) in CONTAINER-lokalen Metern. Jonas'
// Vorgabe 2026-08-10: Container-Aussenmasse/-Abstaende (Ecken reichen dafuer)
// sowie Durchbruch-/Tuer-Position und -Groesse (Mitte + Eckpunkte/Randpunkte)
// messbar machen.
export function computeMeasurePoints(size: ContainerSize, wallThicknessMm: number, openings: Opening[]): MeasurePoint[] {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const points: MeasurePoint[] = [];

  for (const x of [-L / 2, L / 2]) {
    for (const y of [0, H]) {
      for (const z of [-W / 2, W / 2]) {
        points.push({ id: `corner-${x}-${y}-${z}`, label: "Container-Ecke", position: [x, y, z] });
      }
    }
  }

  for (const opening of openings) {
    const typeDef = OPENING_TYPES[opening.kind];
    const uM = opening.u * MM_TO_M;
    const widthM = opening.width * MM_TO_M;
    const heightM = opening.height * MM_TO_M;
    // Siehe Container.tsx's openingsM/openingsFor - exakt dieselbe
    // Umrechnung (Tuer-Unterkante -> Mitte, dann bei Seitenwaenden um
    // wallRecess+t nach unten korrigiert).
    let vCenterM = (typeDef.isDoor ? opening.v + opening.height / 2 : opening.v) * MM_TO_M;
    if (isVerticalWall(opening.panel)) {
      vCenterM -= CORNER_WALL_RECESS_MM * MM_TO_M + wallThicknessMm * MM_TO_M;
    }

    points.push({
      id: `${opening.id}-center`,
      label: `${typeDef.label} – Mitte`,
      position: openingPointToWorld(opening.panel, size, wallThicknessMm, uM, vCenterM),
    });

    if (typeDef.shape === "round") {
      const r = widthM / 2;
      for (const angle of ROUND_RIM_ANGLES) {
        points.push({
          id: `${opening.id}-rim-${angle}`,
          label: `${typeDef.label} – Rand`,
          position: openingPointToWorld(opening.panel, size, wallThicknessMm, uM + r * Math.cos(angle), vCenterM + r * Math.sin(angle)),
        });
      }
    } else {
      const hw = widthM / 2;
      const hh = heightM / 2;
      const corners: [number, number][] = [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ];
      for (const [du, dv] of corners) {
        points.push({
          id: `${opening.id}-corner-${du}-${dv}`,
          label: `${typeDef.label} – Ecke`,
          position: openingPointToWorld(opening.panel, size, wallThicknessMm, uM + du, vCenterM + dv),
        });
      }
    }
  }

  return points;
}

// Baugruppen-Ansicht: container-lokale Punkte um Instanz-Position (mm) und
// -Rotation (Grad, um Welt-Y) in Welt-Meter umrechnen - dieselbe Ry(θ)-
// Formel wie InstanceGroup in ProjectScene3D.tsx (rotation={[0, rotRad, 0]}).
export function measurePointsToWorld(
  points: MeasurePoint[],
  instancePositionMm: { x: number; z: number },
  rotationDeg: number,
): MeasurePoint[] {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const xOffset = instancePositionMm.x * MM_TO_M;
  const zOffset = instancePositionMm.z * MM_TO_M;
  return points.map((p) => {
    const [x, y, z] = p.position;
    return { ...p, position: [x * cos + z * sin + xOffset, y, -x * sin + z * cos + zOffset] };
  });
}
