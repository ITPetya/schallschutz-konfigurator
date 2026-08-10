import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSectionPlane } from "../context/SectionPlaneContext";
import { useDisplaySettings } from "../context/DisplaySettingsContext";

interface CornerCastingProps {
  position: [number, number, number];
  // +1/-1 je Achse, welche Richtung an dieser Ecke nach aussen zeigt - wie
  // outwardSign in Wall.tsx, nur fuer alle drei Achsen statt nur einer,
  // weil an einer Ecke gleich drei Aussenflaechen zusammentreffen.
  outwardX: 1 | -1;
  outwardY: 1 | -1;
  outwardZ: 1 | -1;
}

const MM_TO_M = 1 / 1000;

// Container-Eckbeschlag (ISO-1161-Eckbeschlag/"corner casting"). Masse von
// Jonas 2026-07-28 als die ECHTEN Normmasse vorgegeben (statt der zuvor
// geschaetzten 220x220x260): 178mm auf die Containerlaenge, 162mm auf die
// Containerbreite, 118mm Hoehe. Exportiert (statt nur lokal), damit
// Container.tsx daraus die Eckblock-Weltposition berechnen kann, ohne
// dieselben Zahlen ein zweites Mal zu pflegen.
export const CORNER_BLOCK_LENGTH_MM = 178; // X-Ausdehnung (Containerlaenge)
export const CORNER_BLOCK_WIDTH_MM = 162; // Z-Ausdehnung (Containerbreite)
export const CORNER_BLOCK_HEIGHT_MM = 118; // Y-Ausdehnung
// Jonas' Fehlerbericht 2026-07-28 ("Löcher nach der DIN korrigieren"): alle
// drei Aussparungen (oben/unten + beide Seiten) sind nach ISO 1161 GLEICH
// geformte und GLEICH grosse Langloecher/Kapseln - 124,5 x 63,5mm (4,9" x
// 2,5", die Standard-Twistlock-Aufnahme), NICHT die zuvor geschaetzten
// 150x55mm oben und schlicht RUNDE Loecher an den Seiten. Per Websuche
// gegengeprueft (mehrere unabhaengige Quellen decken sich auf diese Masse,
// u. a. https://hz-containers.com/en/glossary/iso-1161-standard/,
// https://chs-containergroup.com/us/iso-1161/).
const SLOT_LENGTH_MM = 124.5;
const SLOT_WIDTH_MM = 63.5;
// NICHT normiert (siehe urspruenglicher TOP_SLOT_DEPTH_MM=50/
// SIDE_HOLE_DEPTH_MM=50) - bewusst FLACHER als zuvor: bei 124,5x63,5mm auf
// allen drei Flaechen eines nur 178x162x118mm kleinen Blocks wuerden tiefere
// Bohrungen (z. B. die alten 50mm) sich gegenseitig raeumlich ueberschneiden
// (das obere Langloch reicht bei 50mm Tiefe bis y=59mm-50mm=9mm, klar
// innerhalb der Seitenloecher, die selbst bis Halbbreite 31,75mm um y=0
// reichen) - eine echte Drei-Koerper-CSG-Ueberschneidung, die three-bvh-csg
// nur mit kaputter Triangulierung aufloest (bereits einmal in genau dieser
// Form aufgetreten, siehe Git-Historie). Mit 20mm bleiben alle drei
// Bohrungen rechnerisch sauber getrennt (siehe Kommentar an den drei
// SUBTRACTION-Aufrufen unten).
const SLOT_DEPTH_MM = 20;
// Jonas' Fehlerbericht 2026-07-28 (erste Runde): Eckblock lag buendig mit
// der Wandflaeche -> exakt koplanare Flaechen mit der jeweiligen
// Wall-Aussenflaeche an dieser Ecke, dadurch Z-Fighting/"Ueberlagerung"
// genau im Bereich der Seitenloecher. Erster Fix (verworfen, siehe unten):
// der Block selbst wuchs 12mm ueber die Nennposition hinaus. Jonas'
// Fehlerbericht 2026-07-28 (zweite Runde): dadurch ueberschritten die
// Eckbloecke die konfigurierten Container-Aussenmasse (size.length/width/
// height) - der Eckbeschlag darf aber NICHT ueber die Aussenmasse hinausragen,
// er soll genau auf ihnen sitzen. Fix jetzt umgedreht: der Eckblock bleibt in
// seiner Nenngroesse (buendig mit den echten Aussenmassen, keine eigene
// Vergroesserung mehr), stattdessen weichen in Container.tsx die WAENDE ein
// Stueck (CORNER_WALL_RECESS_MM) nach INNEN zurueck - wie beim echten
// Container, wo das Wellblech zwischen den Eckpfosten leicht zurueckgesetzt
// ist. Loest dasselbe Koplanaritaets-/Z-Fighting-Problem, ohne dass der
// Eckbeschlag ueber die Aussenmasse hinaussteht.
export const CORNER_WALL_RECESS_MM = 12;

const LENGTH = CORNER_BLOCK_LENGTH_MM * MM_TO_M;
const WIDTH = CORNER_BLOCK_WIDTH_MM * MM_TO_M;
const HEIGHT = CORNER_BLOCK_HEIGHT_MM * MM_TO_M;
const HALF_X = LENGTH / 2;
const HALF_Y = HEIGHT / 2;
const HALF_Z = WIDTH / 2;
const SLOT_LENGTH = SLOT_LENGTH_MM * MM_TO_M;
const SLOT_WIDTH = SLOT_WIDTH_MM * MM_TO_M;
const SLOT_DEPTH = SLOT_DEPTH_MM * MM_TO_M;

// Ein Evaluator reicht global, siehe Wall.tsx.
const evaluator = new Evaluator();
// Siehe Wall.tsx: kein CSG-Gruppen-Tracking noetig, hier nur ein einziges
// Material - reine Mehrarbeit ohne Nutzen.
evaluator.useGroups = false;

// Langloch/Kapsel-Schneidgeometrie: Quader-Mittelteil + je ein Halbzylinder
// an beiden Enden, per ADDITION zu EINER zusammenhaengenden Brush verklebt,
// damit sie sich in einem einzigen SUBTRACTION-Schritt sauber ausschneiden
// laesst. Langloch-Achse liegt lokal auf X, Breite auf Y, Bohrrichtung
// (Tiefe) auf Z - wird am Einsatzort per rotate() in die tatsaechliche
// Bohrrichtung gedreht. Symmetrisch um den Ursprung in allen drei Achsen,
// das Vorzeichen der Bohrrichtung ist beim Einsatz deshalb egal (wie bei
// den runden Ausschnitten in Wall.tsx).
function createSlotCutterGeometry(length: number, width: number, depth: number): THREE.BufferGeometry {
  const straightLength = Math.max(length - width, width * 0.01);
  let result: Brush = new Brush(new THREE.BoxGeometry(straightLength, width, depth));
  result.updateMatrixWorld();

  for (const sign of [1, -1] as const) {
    const capGeom = new THREE.CylinderGeometry(width / 2, width / 2, depth, 24);
    capGeom.rotateX(Math.PI / 2); // Zylinderachse (Standard Y) -> Bohrrichtung Z
    const capBrush = new Brush(capGeom);
    capBrush.position.set((sign * straightLength) / 2, 0, 0);
    capBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, capBrush, ADDITION);
  }

  return result.geometry;
}

// Geschlossene 2D-Umrisslinie einer Kapsel/eines Langlochs (Mittelteil +
// Halbkreis-Kappen), in der Ebene der beiden uebergebenen lokalen Achsen -
// fuer die Rim-Kantenlinie des Langlochs (siehe buildEdgePositions), NICHT
// fuer den CSG-Schnitt selbst (dafuer createSlotCutterGeometry oben).
function stadiumOutline(length: number, width: number, segments = 16): [number, number][] {
  const r = width / 2;
  const half = Math.max(length - width, 0) / 2;
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = -Math.PI / 2 + (i / segments) * Math.PI;
    points.push([half + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI / 2 + (i / segments) * Math.PI;
    points.push([-half + r * Math.cos(a), r * Math.sin(a)]);
  }
  return points;
}

// Kantenlinien fuer "Schattiert mit Kanten" werden - genau wie in Wall.tsx
// (siehe dortiger Kommentar zu buildOpeningRimEdges) - bewusst NICHT aus der
// CSG-Restgeometrie abgeleitet, sondern von Hand aus der bekannten, exakten
// Geometrie aufgebaut: die 12 Kanten des Aussenquaders (immer sauber, da
// ungeschnittene Boxform) plus je eine Umrandung fuer die drei gleich
// geformten Langloecher, exakt an deren echter Position/Groesse/Flaeche.
function buildEdgePositions(outwardX: 1 | -1, outwardY: 1 | -1, outwardZ: 1 | -1): number[] {
  const positions: number[] = [];

  const c: [number, number, number][] = [
    [-HALF_X, -HALF_Y, -HALF_Z],
    [HALF_X, -HALF_Y, -HALF_Z],
    [HALF_X, HALF_Y, -HALF_Z],
    [-HALF_X, HALF_Y, -HALF_Z],
    [-HALF_X, -HALF_Y, HALF_Z],
    [HALF_X, -HALF_Y, HALF_Z],
    [HALF_X, HALF_Y, HALF_Z],
    [-HALF_X, HALF_Y, HALF_Z],
  ];
  const boxEdges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  for (const [a, b] of boxEdges) positions.push(...c[a], ...c[b]);

  // Langloch-Umrandung auf der oberen/unteren Flaeche (X-Z-Ebene bei
  // y = ±HALF_Y) - Laenge liegt auf X, Breite auf Z (siehe CSG-Schnitt unten).
  const slotY = outwardY * HALF_Y;
  const topSlot = stadiumOutline(SLOT_LENGTH, SLOT_WIDTH);
  for (let i = 0; i < topSlot.length; i++) {
    const [x0, z0] = topSlot[i];
    const [x1, z1] = topSlot[(i + 1) % topSlot.length];
    positions.push(x0, slotY, z0, x1, slotY, z1);
  }

  // Langloch-Umrandung auf der aussenliegenden Laengsseite (Y-Z-Ebene bei
  // x = ±HALF_X) - Laenge liegt auf Z, Breite auf Y (siehe CSG-Schnitt unten).
  const faceX = outwardX * HALF_X;
  const sideXSlot = stadiumOutline(SLOT_LENGTH, SLOT_WIDTH);
  for (let i = 0; i < sideXSlot.length; i++) {
    const [z0, y0] = sideXSlot[i];
    const [z1, y1] = sideXSlot[(i + 1) % sideXSlot.length];
    positions.push(faceX, y0, z0, faceX, y1, z1);
  }

  // Langloch-Umrandung auf der aussenliegenden Breitseite (X-Y-Ebene bei
  // z = ±HALF_Z) - Standardausrichtung passt direkt (Laenge X, Breite Y).
  const faceZ = outwardZ * HALF_Z;
  const sideZSlot = stadiumOutline(SLOT_LENGTH, SLOT_WIDTH);
  for (let i = 0; i < sideZSlot.length; i++) {
    const [x0, y0] = sideZSlot[i];
    const [x1, y1] = sideZSlot[(i + 1) % sideZSlot.length];
    positions.push(x0, y0, faceZ, x1, y1, faceZ);
  }

  return positions;
}

// Rendert einen einzelnen Eckblock als CSG-Ausschnitt: Quader minus drei
// gleich geformte Langloecher (obere/untere Stirnflaeche + beide
// aussenliegenden Seitenflaechen, alle 124,5x63,5mm nach ISO 1161). Komplett
// in LOKALEN Koordinaten der Ecke berechnet, Container.tsx uebergibt nur die
// fertige Weltposition.
export function CornerCasting({ position, outwardX, outwardY, outwardZ }: CornerCastingProps) {
  const { outsideColor, viewStyle } = useDisplaySettings();
  const sectionPlane = useSectionPlane();
  // IMMER ein konkretes Array, nie undefined - siehe Wall.tsx-Kommentar dazu.
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];

  const geometry = useMemo(() => {
    let result: Brush = new Brush(new THREE.BoxGeometry(HALF_X * 2, HALF_Y * 2, HALF_Z * 2));
    result.updateMatrixWorld();

    // Langloch auf der oberen (outwardY=+1) bzw. unteren (outwardY=-1)
    // Stirnflaeche - Laenge bleibt nach der Drehung auf X (Containerlaenge-
    // Richtung), Breite auf Z.
    const topSlotGeom = createSlotCutterGeometry(SLOT_LENGTH, SLOT_WIDTH, SLOT_DEPTH);
    topSlotGeom.rotateX(Math.PI / 2); // Bohrrichtung Z -> Y
    const topSlotBrush = new Brush(topSlotGeom);
    topSlotBrush.position.set(0, outwardY * (HALF_Y - SLOT_DEPTH / 2), 0);
    topSlotBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, topSlotBrush, SUBTRACTION);

    // Langloch auf der aussenliegenden Laengsseite (Front/Back,
    // Bohrrichtung X) - Laenge liegt nach der Drehung auf Z, Breite auf Y.
    const sideXGeom = createSlotCutterGeometry(SLOT_LENGTH, SLOT_WIDTH, SLOT_DEPTH);
    sideXGeom.rotateY(Math.PI / 2); // Laenge X -> Z, Bohrrichtung Z -> X
    const sideXBrush = new Brush(sideXGeom);
    sideXBrush.position.set(outwardX * (HALF_X - SLOT_DEPTH / 2), 0, 0);
    sideXBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideXBrush, SUBTRACTION);

    // Langloch auf der aussenliegenden Breitseite (Links/Rechts,
    // Bohrrichtung Z) - Standardausrichtung der Schneidgeometrie passt
    // direkt (Laenge X, Breite Y, Bohrrichtung Z), keine Drehung noetig.
    const sideZGeom = createSlotCutterGeometry(SLOT_LENGTH, SLOT_WIDTH, SLOT_DEPTH);
    const sideZBrush = new Brush(sideZGeom);
    sideZBrush.position.set(0, 0, outwardZ * (HALF_Z - SLOT_DEPTH / 2));
    sideZBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideZBrush, SUBTRACTION);

    return mergeVertices(result.geometry);
  }, [outwardX, outwardY, outwardZ]);

  const edgeGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(buildEdgePositions(outwardX, outwardY, outwardZ), 3));
    return geom;
  }, [outwardX, outwardY, outwardZ]);

  const shaded = viewStyle === "shaded_edges";
  const materialProps = shaded ? { roughness: 1, metalness: 0 } : { roughness: 0.6, metalness: 0.4 };

  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={outsideColor} clippingPlanes={clippingPlanes} {...materialProps} />
      </mesh>
      {shaded && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color="#1e293b" clippingPlanes={clippingPlanes} />
        </lineSegments>
      )}
    </group>
  );
}
