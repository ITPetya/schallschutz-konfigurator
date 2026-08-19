import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSectionPlane } from "../context/SectionPlaneContext";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { useCachedGeometry } from "../utils/geometryCache";

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

// Jonas' CAD-Referenz 2026-08-19: 6 DXF-Massskizzen des echten Eckbeschlags
// (Links/Oben/Vorne-Ansicht je fuer obere und untere Ecke, da rechts jeweils
// spiegelgleich zu links ist). Ausgewertet per Bulge-Geometrie (DXF-
// Kreisbogen-Segmente, siehe polylineOutline unten) statt wie zuvor per
// Websuche geschaetzt (124,5x63,5mm-Kapsel auf allen drei Flaechen gleich -
// das war FALSCH, siehe die drei folgenden Kommentarbloecke):
//
// 1) Twistlock-Langloch oben/unten (Oben_Oben.dxf/Unten_Unten.dxf): Masse
//    ~124x63,5mm stimmten grob, ABER die Enden sind KEINE Halbkreise
//    (bulge=1), sondern deutlich flachere Boegen (bulge~0,2755, Pfeilhoehe
//    nur ~8,7mm statt 31,75mm bei einer echten Kapsel).
// 2) Seitliches Langloch links/rechts (Links_Oben.dxf/Links_Unten.dxf):
//    VIEL kleiner als angenommen (79,5x51mm statt 124,5x63,5mm) UND
//    HOCHKANT (lange Achse auf der Hoehe), nicht laengs wie zuvor gebaut -
//    echte Kapselform (bulge=1).
// 3) Stirnseiten-Langloch vorne/hinten (Vorne_oben.dxf/Vorne_Unten.dxf):
//    unterscheidet sich zwischen oberer und unterer Ecke - die OBERE Ecke
//    hat ein asymmetrisches "Schluesselloch" (ein Ende voll rund r=31,75mm,
//    das andere flach bulge~0,349 - die Fortsetzung der Twistlock-Kontur
//    von der oberen Flaeche her), die UNTERE Ecke hat dagegen dieselbe
//    einfache Kapsel wie das seitliche Langloch.
//
// Kleine (< 2mm) Rest-Zentrierungsabweichungen aus den Skizzen wurden
// bewusst NICHT uebernommen, weil sich ihre Spiegelrichtung ohne
// Orientierungsmarker in reinen 2D-Ansichten nicht zuverlaessig bestimmen
// liess (ein falsches Vorzeichen waere schlechter als centered) - einzige
// Ausnahme: der Hoehen-Versatz Richtung aussen (siehe SIDE_SLOT_Y_OFFSET_MM),
// der sich ueber outwardY in beiden Referenzdateien je Ecke gegenpruefen liess.
const SLOT_DEPTH_MM = 20;

type Axis = "x" | "y" | "z";

interface SlotVertex {
  u: number;
  v: number;
  bulge?: number; // DXF-Bulge zum NAECHSTEN Vertex (0/undefined = Gerade)
}

// Twistlock-Langloch (obere/untere Stirnflaeche) - Sehne (Breite) auf u,
// gerader Mittelteil (Laenge) auf v, mittig auf der Flaeche.
const TOP_SLOT_VERTICES: SlotVertex[] = [
  { u: 31.75, v: -53.25 },
  { u: 31.75, v: 53.25, bulge: 0.2755 },
  { u: -31.75, v: 53.25 },
  { u: -31.75, v: -53.25, bulge: 0.2755 },
];

// Seitliches Lashing-Langloch (links/rechts, und Stirnseite der unteren
// Ecke) - echte Kapsel (bulge=1), hochkant: Sehne auf u, Laenge auf v.
const SIDE_SLOT_VERTICES: SlotVertex[] = [
  { u: 25.5, v: -14.25 },
  { u: 25.5, v: 14.25, bulge: 1 },
  { u: -25.5, v: 14.25 },
  { u: -25.5, v: -14.25, bulge: 1 },
];
// Sitzt nicht exakt mittig auf der Flaeche, sondern ca. 8,8mm Richtung
// aussen (zur Ober-/Unterkante) verschoben (Mittel aus Links_Oben +8,75mm
// und Links_Unten -9mm - beide unabhaengig ueber outwardY gegenpruefbar).
const SIDE_SLOT_Y_OFFSET_MM = 8.8;

// Stirnseiten-"Schluesselloch" der OBEREN Ecke - asymmetrisch: rundes Ende
// (bulge=1, r=31,75mm) Richtung aussen (+v), flaches Ende (bulge~0,349,
// r~51mm) Richtung Blockmitte (-v) - dieselbe Sehnenbreite wie das
// Twistlock-Langloch (63,5mm), weil es dessen Fortsetzung ist.
const FRONT_SLOT_TOP_VERTICES: SlotVertex[] = [
  { u: 31.75, v: 15.1, bulge: 1 },
  { u: -31.75, v: 15.1 },
  { u: -31.75, v: -15.1, bulge: 0.349 },
  { u: 31.75, v: -15.1 },
];
// Stirnseiten-Langloch der UNTEREN Ecke - identisch zum seitlichen Langloch.
const FRONT_SLOT_BOTTOM_VERTICES = SIDE_SLOT_VERTICES;

const LENGTH = CORNER_BLOCK_LENGTH_MM * MM_TO_M;
const WIDTH = CORNER_BLOCK_WIDTH_MM * MM_TO_M;
const HEIGHT = CORNER_BLOCK_HEIGHT_MM * MM_TO_M;
const HALF_X = LENGTH / 2;
const HALF_Y = HEIGHT / 2;
const HALF_Z = WIDTH / 2;
const SLOT_DEPTH = SLOT_DEPTH_MM * MM_TO_M;

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

// Ein Evaluator reicht global, siehe Wall.tsx.
const evaluator = new Evaluator();
// Siehe Wall.tsx: kein CSG-Gruppen-Tracking noetig, hier nur ein einziges
// Material - reine Mehrarbeit ohne Nutzen.
evaluator.useGroups = false;

// Wandelt eine DXF-artige Vertexliste (Punkt + Bulge zum naechsten Punkt) in
// ein geschlossenes 2D-Polygon um - Bulge-Formel wie im DXF-Format: volle
// Bogenweite theta = 4*atan(bulge), Radius r = Sehne/(2*sin(theta/2)),
// Pfeilhoehe = r*(1-cos(theta/2)). Direkt aus Jonas' CAD-Referenzdateien
// abgeleitet (siehe Kommentarblock oben), statt wie zuvor eine feste
// Halbkreis-Kapselform anzunehmen - reduziert sich fuer bulge=1 exakt auf
// eine Kapsel (Halbkreis-Enden), ist aber genauso gueltig fuer die
// flacheren/asymmetrischen Formen der echten Ecke.
function polylineOutline(vertices: SlotVertex[], segments = 12): [number, number][] {
  const points: [number, number][] = [];
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % n];
    points.push([v0.u, v0.v]);
    if (v0.bulge) {
      const theta = 4 * Math.atan(v0.bulge);
      const dx = v1.u - v0.u;
      const dy = v1.v - v0.v;
      const chord = Math.hypot(dx, dy);
      const r = chord / (2 * Math.sin(theta / 2));
      const sagitta = r * (1 - Math.cos(theta / 2));
      const mx = (v0.u + v1.u) / 2;
      const my = (v0.v + v1.v) / 2;
      // Normale zeigt zur Bogenseite (positiver Bulge = Bogen links der
      // Laufrichtung v0->v1, siehe DXF-Spezifikation).
      const nx = dy / chord;
      const ny = -dx / chord;
      const cx = mx - nx * (r - sagitta);
      const cy = my - ny * (r - sagitta);
      const startAngle = Math.atan2(v0.v - cy, v0.u - cx);
      for (let s = 1; s < segments; s++) {
        const a = startAngle + (theta * s) / segments;
        points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    }
  }
  return points;
}

// Extrudiert ein 2D-Umriss-Polygon (in mm, lokale u/v-Ebene) zu einer 3D-
// Schneidgeometrie (in Metern), und ordnet u/v/Tiefe den tatsaechlichen
// Welt-Achsen zu (axisU/axisV/axisDepth) - ersetzt das fruehere Box+
// Halbzylinder-ADDITION-Verfahren, das nur echte Halbkreis-Enden abbilden
// konnte, durch einen einzigen Weg, der jede Bulge-Form direkt vom Umriss
// uebernimmt.
function extrudeOutline(
  outlineMm: [number, number][],
  depthMm: number,
  offsetVMm: number,
  axisU: Axis,
  axisV: Axis,
  axisDepth: Axis,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  outlineMm.forEach(([u, v], i) => {
    if (i === 0) shape.moveTo(u, v + offsetVMm);
    else shape.lineTo(u, v + offsetVMm);
  });
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, { depth: depthMm, bevelEnabled: false, curveSegments: 1 });
  geom.translate(0, 0, -depthMm / 2);
  geom.scale(MM_TO_M, MM_TO_M, MM_TO_M);

  const posAttr = geom.attributes.position as THREE.BufferAttribute;
  const arr = posAttr.array as Float32Array;
  const out: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < arr.length; i += 3) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out[axisU] = arr[i];
    out[axisV] = arr[i + 1];
    out[axisDepth] = arr[i + 2];
    arr[i] = out.x;
    arr[i + 1] = out.y;
    arr[i + 2] = out.z;
  }
  posAttr.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

// Kantenlinien fuer "Schattiert mit Kanten" werden - genau wie in Wall.tsx
// (siehe dortiger Kommentar zu buildOpeningRimEdges) - bewusst NICHT aus der
// CSG-Restgeometrie abgeleitet, sondern von Hand aus der bekannten, exakten
// Geometrie aufgebaut: die 12 Kanten des Aussenquaders (immer sauber, da
// ungeschnittene Boxform) plus je eine Umrandung fuer die drei Langloecher,
// exakt an deren echter Position/Groesse/Form (siehe Kommentarblock oben).
function pushOutlineEdges(
  positions: number[],
  outlineMm: [number, number][],
  offsetVMm: number,
  axisU: Axis,
  axisV: Axis,
  depthValue: number,
  axisDepth: Axis,
) {
  const n = outlineMm.length;
  const p0: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  const p1: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < n; i++) {
    const [u0, v0] = outlineMm[i];
    const [u1, v1] = outlineMm[(i + 1) % n];
    p0[axisU] = u0 * MM_TO_M;
    p0[axisV] = (v0 + offsetVMm) * MM_TO_M;
    p0[axisDepth] = depthValue;
    p1[axisU] = u1 * MM_TO_M;
    p1[axisV] = (v1 + offsetVMm) * MM_TO_M;
    p1[axisDepth] = depthValue;
    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  }
}

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

  // Twistlock-Langloch auf der oberen/unteren Flaeche - Sehne auf Z, Laenge
  // auf X, mittig.
  pushOutlineEdges(positions, polylineOutline(TOP_SLOT_VERTICES), 0, "z", "x", outwardY * HALF_Y, "y");

  // Seitliches Langloch auf der aussenliegenden Breitseite (Links/Rechts) -
  // Sehne auf X, Laenge auf Y (hochkant), Richtung aussen versetzt.
  pushOutlineEdges(
    positions,
    polylineOutline(SIDE_SLOT_VERTICES),
    outwardY * SIDE_SLOT_Y_OFFSET_MM,
    "x",
    "y",
    outwardZ * HALF_Z,
    "z",
  );

  // Stirnseiten-Langloch (Front/Back) - Form haengt davon ab, ob obere oder
  // untere Ecke (siehe Kommentarblock oben).
  const frontVertices = outwardY === 1 ? FRONT_SLOT_TOP_VERTICES : FRONT_SLOT_BOTTOM_VERTICES;
  const frontOffset = outwardY === 1 ? 0 : outwardY * SIDE_SLOT_Y_OFFSET_MM;
  pushOutlineEdges(positions, polylineOutline(frontVertices), frontOffset, "z", "y", outwardX * HALF_X, "x");

  return positions;
}

// Rendert einen einzelnen Eckblock als CSG-Ausschnitt: Quader minus drei
// Langloecher (obere/untere Stirnflaeche + beide aussenliegenden
// Seitenflaechen), Form/Groesse/Ausrichtung je Flaeche wie in Jonas' CAD-
// Referenz vermessen (siehe Kommentarblock oben) - NICHT mehr drei gleiche
// Kapseln wie zuvor angenommen. Komplett in LOKALEN Koordinaten der Ecke
// berechnet, Container.tsx uebergibt nur die fertige Weltposition.
export function CornerCasting({ position, outwardX, outwardY, outwardZ }: CornerCastingProps) {
  const { outsideColor, viewStyle } = useDisplaySettings();
  const sectionPlane = useSectionPlane();
  // IMMER ein konkretes Array, nie undefined - siehe Wall.tsx-Kommentar dazu.
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];

  // Jonas' Vorgabe 2026-08-18 ("Lags fixen, ohne Detailgrad zu verlieren"):
  // diese Geometrie haengt NUR von outwardX/Y/Z ab (siehe Props oben) - der
  // Eckbeschlag sieht an JEDER der 8 moeglichen Ecken-Ausrichtungen fuer
  // JEDEN Container identisch aus, unabhaengig von dessen Groesse. Es gibt
  // also app-weit nur 8 tatsaechlich unterschiedliche Eckbeschlag-Formen -
  // useCachedGeometry (siehe utils/geometryCache.ts) sorgt dafuer, dass die
  // teure CSG-Berechnung (3 SUBTRACTION-Aufrufe) pro Kombination nur EINMAL
  // insgesamt laeuft, nicht einmal pro Container x 8 Ecken.
  const geometry = useCachedGeometry(`corner:${outwardX},${outwardY},${outwardZ}`, () => {
    let result: Brush = new Brush(new THREE.BoxGeometry(HALF_X * 2, HALF_Y * 2, HALF_Z * 2));
    result.updateMatrixWorld();

    // Twistlock-Langloch auf der oberen (outwardY=+1) bzw. unteren
    // (outwardY=-1) Stirnflaeche - Sehne (Breite) auf Z, Laenge auf X,
    // Bohrrichtung Y.
    const topGeom = extrudeOutline(polylineOutline(TOP_SLOT_VERTICES), SLOT_DEPTH_MM, 0, "z", "x", "y");
    const topBrush = new Brush(topGeom);
    topBrush.position.set(0, outwardY * (HALF_Y - SLOT_DEPTH / 2), 0);
    topBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, topBrush, SUBTRACTION);

    // Seitliches Langloch auf der aussenliegenden Breitseite (Links/Rechts) -
    // Sehne auf X, Laenge auf Y (hochkant), Bohrrichtung Z, Richtung aussen
    // versetzt.
    const sideGeom = extrudeOutline(
      polylineOutline(SIDE_SLOT_VERTICES),
      SLOT_DEPTH_MM,
      outwardY * SIDE_SLOT_Y_OFFSET_MM,
      "x",
      "y",
      "z",
    );
    const sideBrush = new Brush(sideGeom);
    sideBrush.position.set(0, 0, outwardZ * (HALF_Z - SLOT_DEPTH / 2));
    sideBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, sideBrush, SUBTRACTION);

    // Stirnseiten-Langloch (Front/Back) - asymmetrisches Schluesselloch an
    // der oberen Ecke, einfache Kapsel an der unteren (siehe
    // Kommentarblock oben), Sehne auf Z, Laenge auf Y, Bohrrichtung X.
    const frontVertices = outwardY === 1 ? FRONT_SLOT_TOP_VERTICES : FRONT_SLOT_BOTTOM_VERTICES;
    const frontOffset = outwardY === 1 ? 0 : outwardY * SIDE_SLOT_Y_OFFSET_MM;
    const frontGeom = extrudeOutline(polylineOutline(frontVertices), SLOT_DEPTH_MM, frontOffset, "z", "y", "x");
    const frontBrush = new Brush(frontGeom);
    frontBrush.position.set(outwardX * (HALF_X - SLOT_DEPTH / 2), 0, 0);
    frontBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, frontBrush, SUBTRACTION);

    return mergeVertices(result.geometry);
  });

  const edgeGeometry = useCachedGeometry(`corner-edge:${outwardX},${outwardY},${outwardZ}`, () => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(buildEdgePositions(outwardX, outwardY, outwardZ), 3));
    return geom;
  });

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
