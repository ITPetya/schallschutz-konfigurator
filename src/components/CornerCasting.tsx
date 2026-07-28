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
const TOP_SLOT_LENGTH_MM = 150; // Langloch oben/unten, Gesamtlaenge inkl. Rundungen (liegt auf X)
const TOP_SLOT_WIDTH_MM = 55; // Langloch oben/unten, Breite (= Durchmesser der Rundungen, liegt auf Z)
const TOP_SLOT_DEPTH_MM = 50; // wie tief das Langloch einsinkt
const SIDE_HOLE_RADIUS_MM = 35;
const SIDE_HOLE_DEPTH_MM = 50;
// Jonas' Fehlerbericht 2026-07-28: Eckblock lag buendig mit der Wandflaeche
// -> exakt koplanare Flaechen mit der jeweiligen Wall-Aussenflaeche an dieser
// Ecke, dadurch Z-Fighting/"Ueberlagerung" genau im Bereich der Seitenloecher
// (Wall.tsx rendert dort weiterhin die volle, ungeschnittene Wandflaeche,
// siehe Container.tsx/Wall.tsx - die Waende wissen nichts von den
// Eckbloecken). Fix: der Block steht auf allen drei Aussenflaechen ein Stueck
// ueber die Wandebene hinaus vor (wie beim echten ISO-Eckbeschlag, der auch
// sichtbar aus der Well-/Corrugated-Blechflaeche vorsteht) - dadurch sind die
// Flaechen nicht mehr koplanar, kein Z-Fighting mehr. Symmetrisch auf ALLE
// sechs Boxseiten angewendet (nicht nur die drei aussenliegenden): die drei
// "inneren" Seiten liegen ohnehin unsichtbar im Wandvolumen, ein paar mm mehr
// Ueberlappung dort macht keinen optischen Unterschied.
const PROTRUSION_MM = 12;

const LENGTH = CORNER_BLOCK_LENGTH_MM * MM_TO_M;
const WIDTH = CORNER_BLOCK_WIDTH_MM * MM_TO_M;
const HEIGHT = CORNER_BLOCK_HEIGHT_MM * MM_TO_M;
const PROTRUSION = PROTRUSION_MM * MM_TO_M;
const HALF_X = LENGTH / 2 + PROTRUSION;
const HALF_Y = HEIGHT / 2 + PROTRUSION;
const HALF_Z = WIDTH / 2 + PROTRUSION;
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

function circleOutline(radius: number, segments = 24): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return points;
}

// Kantenlinien fuer "Schattiert mit Kanten" werden - genau wie in Wall.tsx
// (siehe dortiger Kommentar zu buildOpeningRimEdges) - bewusst NICHT aus der
// CSG-Restgeometrie abgeleitet, sondern von Hand aus der bekannten, exakten
// Geometrie aufgebaut: die 12 Kanten des Aussenquaders (immer sauber, da
// ungeschnittene Boxform) plus je eine Umrandung fuer das Langloch und die
// beiden Rundloecher, exakt an deren echter Position/Groesse/Flaeche.
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

  // Langloch-Umrandung auf der oberen/unteren Flaeche (X-Z-Ebene bei y = ±HALF_Y).
  const slotY = outwardY * HALF_Y;
  const slot = stadiumOutline(TOP_SLOT_LENGTH, TOP_SLOT_WIDTH);
  for (let i = 0; i < slot.length; i++) {
    const [x0, z0] = slot[i];
    const [x1, z1] = slot[(i + 1) % slot.length];
    positions.push(x0, slotY, z0, x1, slotY, z1);
  }

  // Rundloch-Umrandung auf der aussenliegenden Laengsseite (Y-Z-Ebene bei x = ±HALF_X).
  const faceX = outwardX * HALF_X;
  const circleX = circleOutline(SIDE_HOLE_RADIUS);
  for (let i = 0; i < circleX.length; i++) {
    const [y0, z0] = circleX[i];
    const [y1, z1] = circleX[(i + 1) % circleX.length];
    positions.push(faceX, y0, z0, faceX, y1, z1);
  }

  // Rundloch-Umrandung auf der aussenliegenden Breitseite (X-Y-Ebene bei z = ±HALF_Z).
  const faceZ = outwardZ * HALF_Z;
  const circleZ = circleOutline(SIDE_HOLE_RADIUS);
  for (let i = 0; i < circleZ.length; i++) {
    const [x0, y0] = circleZ[i];
    const [x1, y1] = circleZ[(i + 1) % circleZ.length];
    positions.push(x0, y0, faceZ, x1, y1, faceZ);
  }

  return positions;
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
    let result: Brush = new Brush(new THREE.BoxGeometry(HALF_X * 2, HALF_Y * 2, HALF_Z * 2));
    result.updateMatrixWorld();

    // Langloch auf der oberen (outwardY=+1) bzw. unteren (outwardY=-1) Stirnflaeche.
    const slotGeom = createSlotCutterGeometry(TOP_SLOT_LENGTH, TOP_SLOT_WIDTH, TOP_SLOT_DEPTH);
    slotGeom.rotateX(Math.PI / 2); // Bohrrichtung Z -> Y
    const slotBrush = new Brush(slotGeom);
    slotBrush.position.set(0, outwardY * (HALF_Y - TOP_SLOT_DEPTH / 2), 0);
    slotBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, slotBrush, SUBTRACTION);

    // Rundloch auf der aussenliegenden Laengsseite (Front/Back, Bohrrichtung X).
    const sideXGeom = new THREE.CylinderGeometry(SIDE_HOLE_RADIUS, SIDE_HOLE_RADIUS, SIDE_HOLE_DEPTH, 24);
    sideXGeom.rotateZ(Math.PI / 2); // Zylinderachse Y -> Bohrrichtung X
    const sideXBrush = new Brush(sideXGeom);
    sideXBrush.position.set(outwardX * (HALF_X - SIDE_HOLE_DEPTH / 2), 0, 0);
    sideXBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideXBrush, SUBTRACTION);

    // Rundloch auf der aussenliegenden Breitseite (Links/Rechts, Bohrrichtung Z).
    const sideZGeom = new THREE.CylinderGeometry(SIDE_HOLE_RADIUS, SIDE_HOLE_RADIUS, SIDE_HOLE_DEPTH, 24);
    sideZGeom.rotateX(Math.PI / 2); // Zylinderachse Y -> Bohrrichtung Z
    const sideZBrush = new Brush(sideZGeom);
    sideZBrush.position.set(0, 0, outwardZ * (HALF_Z - SIDE_HOLE_DEPTH / 2));
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
