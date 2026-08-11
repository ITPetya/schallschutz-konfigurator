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
//
// Jonas' Korrektur 2026-08-11 (floorThickness wieder frei einstellbar, siehe
// lcStandard.ts): floorThicknessMm zusaetzlich zu wallThicknessMm noetig,
// weil Container.tsx die Bodenplatte seit 52712bd mit einer EIGENEN Dicke
// (floorT) rechnet, nicht mehr mit t wie Wand/Dach - dadurch ist die Wand
// jetzt asymmetrisch um H/2 versetzt (verticalWallPositionY), sobald
// floorT !== t. Diese Funktion war zwischenzeitlich (52712bd) NICHT
// mitgezogen worden und lieferte seither bei jedem Standard-Container
// (floorT=120mm fix, wallThickness default 100mm) leicht falsche
// Messpunkte fuer Durchbrueche/Tueren an den vier Seitenwaenden - jetzt mit
// exakt denselben Formeln wie Container.tsx behoben.
function getPanelTransform(panel: PanelId, size: ContainerSize, wallThicknessMm: number, floorThicknessMm: number): PanelTransform {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThicknessMm * MM_TO_M;
  const floorT = floorThicknessMm * MM_TO_M;
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;
  const effectiveL = L - 2 * wallRecess;
  const effectiveW = W - 2 * wallRecess;
  const effectiveH = H - 2 * wallRecess;
  // Siehe Container.tsx: die Seitenwaende werden oben um t (Dach) UND unten
  // um floorT (Boden) gekuerzt statt symmetrisch um 2t - bei floorT===t
  // ergibt sich wieder exakt der fruehere symmetrische Fall.
  const verticalWallHeight = Math.max(effectiveH - t - floorT, 0);
  const verticalWallPositionY = H / 2 + (floorT - t) / 2;
  const endWallWidth = Math.max(effectiveW - 2 * t, 0);

  switch (panel) {
    case "left":
      return {
        position: [0, verticalWallPositionY, W / 2 - t / 2 - wallRecess],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: 1,
        rotate: rotateIdentity,
      };
    case "right":
      return {
        position: [0, verticalWallPositionY, -W / 2 + t / 2 + wallRecess],
        panelWidth: effectiveL,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateIdentity,
      };
    case "back":
      return {
        position: [-L / 2 + t / 2 + wallRecess, verticalWallPositionY, 0],
        panelWidth: endWallWidth,
        panelHeight: verticalWallHeight,
        outwardSign: -1,
        rotate: rotateY90,
      };
    case "front":
      return {
        position: [L / 2 - t / 2 - wallRecess, verticalWallPositionY, 0],
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
        position: [0, floorT / 2 + wallRecess, 0],
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
// Jonas' Korrektur 2026-08-11: der Boden hat seit 52712bd eine EIGENE Dicke
// (floorThickness), abweichend von Wand/Dach (wallThickness) - fuer die
// Aussenflaeche eines Bodendurchbruchs (panel "bottom") ist deshalb floorT/2
// der richtige Versatz, nicht t/2 wie bei allen anderen fuenf Panels (siehe
// Container.tsx: wall-bottom bekommt thickness={floorT}, alle anderen
// thickness={t}).
function panelThicknessMm(panel: PanelId, wallThicknessMm: number, floorThicknessMm: number): number {
  return panel === "bottom" ? floorThicknessMm : wallThicknessMm;
}

// Jonas' Vorgabe 2026-08-11 ("Innenmaße messen"): Durchbruch-/Tuer-
// Merkmalspunkte gab es bisher NUR auf der AUSSENFLAECHE der Wand (side=1,
// bisheriges Verhalten unveraendert) - fuer Innenmasse (z. B. Abstand
// zwischen zwei Durchbruechen von innen gemessen) braucht es dieselben
// Punkte zusaetzlich auf der INNENFLAECHE (side=-1, spiegelt einfach das
// Vorzeichen des outwardSign-Versatzes). Kein separates Occlusion-Konzept
// noetig: MeasureMarkers.tsx blendet Punkte bereits per normaler WebGL-
// Tiefenpruefung aus, wenn eine opake Wand davor liegt (Commit 4ec6f37) UND
// per Schnittebene, wenn sie im weggeschnittenen Bereich liegen (Commit
// e97b182) - ein Innenpunkt ist dadurch automatisch genau dann sichtbar/
// anklickbar, wenn er durch einen echten Durchbruch, eine Schnittansicht
// oder denselben Durchbruch selbst tatsaechlich einsehbar ist.
function openingPointToWorld(
  panel: PanelId,
  size: ContainerSize,
  wallThicknessMm: number,
  floorThicknessMm: number,
  localU: number,
  localVCenterM: number,
  side: 1 | -1 = 1,
): [number, number, number] {
  const t = panelThicknessMm(panel, wallThicknessMm, floorThicknessMm) * MM_TO_M;
  const transform = getPanelTransform(panel, size, wallThicknessMm, floorThicknessMm);
  const localY = localVCenterM - transform.panelHeight / 2;
  const localZ = side * transform.outwardSign * (t / 2);
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
export function computeMeasurePoints(
  size: ContainerSize,
  wallThicknessMm: number,
  floorThicknessMm: number,
  openings: Opening[],
): MeasurePoint[] {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThicknessMm * MM_TO_M;
  const floorT = floorThicknessMm * MM_TO_M;
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;
  const points: MeasurePoint[] = [];

  for (const x of [-L / 2, L / 2]) {
    for (const y of [0, H]) {
      for (const z of [-W / 2, W / 2]) {
        points.push({ id: `corner-${x}-${y}-${z}`, label: "Container-Ecke", position: [x, y, z] });
      }
    }
  }

  // Jonas' Vorgabe 2026-08-11 ("Innenmaße messen"): die 8 Innenecken des
  // Hohlraums - dieselbe Herleitung wie Container.tsx's effectiveL/W/H bzw.
  // verticalWallPositionY/-Height (front/back/links/rechts kuerzen um die
  // eigene Wandstaerke t, der Boden um seine eigene floorT statt t, siehe
  // dortiger Kommentar zur Wandkeil-Mitierung). Zuvor gab es UEBERHAUPT
  // KEINE Innenpunkte - das war der eigentliche Grund, warum sich bisher
  // keine Innenmasse messen liessen (nicht fehlende Kollisionsgeometrie: der
  // Messpunkt-Picker rastet ohnehin nie auf freie Mesh-Flaechen ein, siehe
  // MeasureMarkers.tsx, sondern ausschliesslich auf diese vorberechneten
  // Kandidatenpunkte).
  const interiorXHalf = Math.max(L / 2 - t - wallRecess, 0);
  const interiorZHalf = Math.max(W / 2 - t - wallRecess, 0);
  const interiorYBottom = floorT + wallRecess;
  const interiorYTop = Math.max(H - t - wallRecess, interiorYBottom);
  for (const x of [-interiorXHalf, interiorXHalf]) {
    for (const y of [interiorYBottom, interiorYTop]) {
      for (const z of [-interiorZHalf, interiorZHalf]) {
        points.push({ id: `inner-corner-${x}-${y}-${z}`, label: "Innenecke", position: [x, y, z] });
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
    // wallRecess+floorT nach unten korrigiert - Jonas' Korrektur
    // 2026-08-11: der Korrekturbetrag ist wallRecess+floorT, NICHT
    // wallRecess+t (siehe Container.tsx's verticalWallVOffset-Herleitung,
    // der Betrag haengt ausschliesslich von der Bodendicke ab, nicht von
    // der Wandstaerke - bei floorT===t ist das Ergebnis identisch zur
    // vorherigen Formel, keine Regression fuer den Altfall).
    let vCenterM = (typeDef.isDoor ? opening.v + opening.height / 2 : opening.v) * MM_TO_M;
    if (isVerticalWall(opening.panel)) {
      vCenterM -= CORNER_WALL_RECESS_MM * MM_TO_M + floorThicknessMm * MM_TO_M;
    }

    // Jonas' Vorgabe 2026-08-11 ("Innenmaße messen"): jeder Durchbruch-Punkt
    // existiert jetzt auf BEIDEN Seiten der Wand - side=1 (Aussenflaeche,
    // bisheriges Verhalten, ID/Label unveraendert, keine Regression fuer
    // bestehende Aussenmasse) UND zusaetzlich side=-1 (Innenflaeche, neue
    // ID mit "-inner"-Suffix und Label mit "(innen)", damit beide Varianten
    // in der Messwerkzeug-Anzeige unterscheidbar bleiben).
    for (const side of [1, -1] as const) {
      const idSuffix = side === 1 ? "" : "-inner";
      const labelSuffix = side === 1 ? "" : " (innen)";

      points.push({
        id: `${opening.id}-center${idSuffix}`,
        label: `${typeDef.label} – Mitte${labelSuffix}`,
        position: openingPointToWorld(opening.panel, size, wallThicknessMm, floorThicknessMm, uM, vCenterM, side),
      });

      if (typeDef.shape === "round") {
        const r = widthM / 2;
        for (const angle of ROUND_RIM_ANGLES) {
          points.push({
            id: `${opening.id}-rim-${angle}${idSuffix}`,
            label: `${typeDef.label} – Rand${labelSuffix}`,
            position: openingPointToWorld(
              opening.panel,
              size,
              wallThicknessMm,
              floorThicknessMm,
              uM + r * Math.cos(angle),
              vCenterM + r * Math.sin(angle),
              side,
            ),
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
            id: `${opening.id}-corner-${du}-${dv}${idSuffix}`,
            label: `${typeDef.label} – Ecke${labelSuffix}`,
            position: openingPointToWorld(opening.panel, size, wallThicknessMm, floorThicknessMm, uM + du, vCenterM + dv, side),
          });
        }
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
