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

// Container-Eckbeschlag (ISO-Eckbeschlag/"corner casting", Referenzfoto
// Jonas 2026-07-28): an allen 8 Container-Ecken statt einer schlichten
// Wandkante ein kleiner, ueber die Wandflaeche hinaus vorstehender
// Eckblock mit den charakteristischen Aussparungen - ein Langloch auf der
// oberen/unteren Stirnflaeche (fuer Twistlocks) plus je ein Rundloch auf
// den beiden aussenliegenden Seitenflaechen (fuer Verzurrung). Masse "in
// etwa" an echte ISO-1161-Eckbeschlaege angelehnt, bewusst kein
// massgetreues Fertigungsteil - siehe Container.tsx-Kommentar zu
// Wandflaechen fuer dieselbe Haltung im Rest des Projekts.
// Exportiert (statt nur lokal), damit Container.tsx daraus die
// Eckblock-Weltposition berechnen kann, ohne dieselben Zahlen ein zweites
// Mal zu pflegen.
export const CORNER_BLOCK_SIZE_MM = 220; // Grundriss (X- und Z-Ausdehnung)
export const CORNER_BLOCK_HEIGHT_MM = 260; // Y-Ausdehnung
const BLOCK_SIZE_MM = CORNER_BLOCK_SIZE_MM;
const BLOCK_HEIGHT_MM = CORNER_BLOCK_HEIGHT_MM;
const TOP_SLOT_LENGTH_MM = 150; // Langloch oben/unten, Gesamtlaenge inkl. Rundungen
const TOP_SLOT_WIDTH_MM = 60; // Langloch oben/unten, Breite (= Durchmesser der Rundungen)
const TOP_SLOT_DEPTH_MM = 70; // wie tief das Langloch einsinkt
const SIDE_HOLE_RADIUS_MM = 45;
const SIDE_HOLE_DEPTH_MM = 80;

const BLOCK_SIZE = BLOCK_SIZE_MM * MM_TO_M;
const BLOCK_HEIGHT = BLOCK_HEIGHT_MM * MM_TO_M;
const TOP_SLOT_LENGTH = TOP_SLOT_LENGTH_MM * MM_TO_M;
const TOP_SLOT_WIDTH = TOP_SLOT_WIDTH_MM * MM_TO_M;
const TOP_SLOT_DEPTH = TOP_SLOT_DEPTH_MM * MM_TO_M;
const SIDE_HOLE_RADIUS = SIDE_HOLE_RADIUS_MM * MM_TO_M;
const SIDE_HOLE_DEPTH = SIDE_HOLE_DEPTH_MM * MM_TO_M;

// Ein Evaluator reicht global, siehe Wall.tsx.
const evaluator = new Evaluator();

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

// Rendert einen einzelnen Eckblock als CSG-Ausschnitt: Quader minus Langloch
// (obere/untere Stirnflaeche) minus zwei Rundloecher (die beiden
// aussenliegenden Seitenflaechen). Komplett in LOKALEN Koordinaten der Ecke
// berechnet, Container.tsx uebergibt nur die fertige Weltposition.
export function CornerCasting({ position, outwardX, outwardY, outwardZ }: CornerCastingProps) {
  const { outsideColor, viewStyle } = useDisplaySettings();
  const sectionPlane = useSectionPlane();
  // IMMER ein konkretes Array, nie undefined - siehe Wall.tsx-Kommentar dazu.
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];

  const geometry = useMemo(() => {
    let result: Brush = new Brush(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_HEIGHT, BLOCK_SIZE));
    result.updateMatrixWorld();

    // Langloch auf der oberen (outwardY=+1) bzw. unteren (outwardY=-1) Stirnflaeche.
    const slotGeom = createSlotCutterGeometry(TOP_SLOT_LENGTH, TOP_SLOT_WIDTH, TOP_SLOT_DEPTH);
    slotGeom.rotateX(Math.PI / 2); // Bohrrichtung Z -> Y
    const slotBrush = new Brush(slotGeom);
    slotBrush.position.set(0, outwardY * (BLOCK_HEIGHT / 2 - TOP_SLOT_DEPTH / 2), 0);
    slotBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, slotBrush, SUBTRACTION);

    // Rundloch auf der aussenliegenden Laengsseite (Front/Back, Bohrrichtung X).
    const sideXGeom = new THREE.CylinderGeometry(SIDE_HOLE_RADIUS, SIDE_HOLE_RADIUS, SIDE_HOLE_DEPTH, 24);
    sideXGeom.rotateZ(Math.PI / 2); // Zylinderachse Y -> Bohrrichtung X
    const sideXBrush = new Brush(sideXGeom);
    sideXBrush.position.set(outwardX * (BLOCK_SIZE / 2 - SIDE_HOLE_DEPTH / 2), 0, 0);
    sideXBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideXBrush, SUBTRACTION);

    // Rundloch auf der aussenliegenden Breitseite (Links/Rechts, Bohrrichtung Z).
    const sideZGeom = new THREE.CylinderGeometry(SIDE_HOLE_RADIUS, SIDE_HOLE_RADIUS, SIDE_HOLE_DEPTH, 24);
    sideZGeom.rotateX(Math.PI / 2); // Zylinderachse Y -> Bohrrichtung Z
    const sideZBrush = new Brush(sideZGeom);
    sideZBrush.position.set(0, 0, outwardZ * (BLOCK_SIZE / 2 - SIDE_HOLE_DEPTH / 2));
    sideZBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideZBrush, SUBTRACTION);

    return mergeVertices(result.geometry);
  }, [outwardX, outwardY, outwardZ]);

  // Kein <Edges>-Overlay fuer "Schattiert mit Kanten": dieselbe
  // Triangulierungs-Eigenart von three-bvh-csg, die in Wall.tsx zu
  // scheinbaren Diagonallinien auf der Restflaeche fuehrte (siehe dortiger
  // Kommentar zu buildOpeningRimEdges), traefe hier genauso zu - der Block
  // hat wie die Wand echte CSG-Ausschnitte, keine reine Box wie z.B. der
  // Wetterschutzgitter-Rahmen. Fuer diesen Detailgrad bewusst nicht per Hand
  // nachgebaut.
  const materialProps = viewStyle === "shaded_edges" ? { roughness: 1, metalness: 0 } : { roughness: 0.6, metalness: 0.4 };

  return (
    <mesh position={position} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={outsideColor} clippingPlanes={clippingPlanes} {...materialProps} />
    </mesh>
  );
}
