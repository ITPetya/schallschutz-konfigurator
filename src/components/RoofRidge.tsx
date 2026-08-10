import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { Opening, OpeningTypeDef } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { useSectionPlane } from "../context/SectionPlaneContext";

interface RoofRidgeProps {
  lengthM: number;
  widthM: number; // Basis-Breite (Kante zu Kante, dort Zusatzhoehe = 0)
  baseY: number; // Welt-Y der Dach-Aussenflaeche (Basis der Schraege)
  // Durchbrueche des Dach-Panels (wall-top in Container.tsx), bereits in
  // Metern/derselben lokalen u/v-Konvention wie dort - siehe evaluator-
  // Block unten fuer die Koordinatenumrechnung.
  openings: Opening[];
}

const evaluator = new Evaluator();
// Siehe Wall.tsx: kein CSG-Gruppen-Tracking noetig, hier nur ein einziges
// Material (outsideColor) - reine Mehrarbeit ohne Nutzen.
evaluator.useGroups = false;

// Jonas' Vorgabe 2026-07-29: das Dach bekommt aussen eine leichte First-
// Schraege wie ein Hausdach - je 1° Neigung von der Mitte (First, laengs)
// zu beiden Laengsseiten hin, macht am First zusammen 2° ("durch die
// Addition der beiden 1° rechts und links ergeben sich in der Mitte 2°").
// Additiv/dekorativ (die Innenseite, also Decke samt Dach-Schienen/
// Streckgitter aus InteriorCladding.tsx, bleibt unveraendert flach auf Hoehe
// H): diese duenne Keil-Kappe sitzt OBEN AUF der bestehenden flachen
// Dachflaeche (wall-top in Container.tsx), reicht dadurch bewusst ein paar
// mm ueber die konfigurierte Containerhoehe hinaus ("nicht schlimm", Jonas'
// Vorgabe). Durchbrueche im Dach-Panel (z.B. Rohrdurchfuehrungen) wurden
// hier bisher NICHT nachvollzogen - Jonas' Fehlerbericht 2026-08-10: "die
// Durchbrueche werden in der Decke vom Schraegdach verdeckt, sollen aber
// dadurch gehen". Fix: dieselben Ausschnitte per CSG auch aus dieser Kappe
// entfernen (analog Wall.tsx), sonst blieben sie unter der First-Schraege
// blickdicht verschlossen.
//
// Jonas' Fehlerbericht 2026-08-10 (Folgefehler des CSG-Fixes oben):
// "Spinnenweben"-Linien kreuzen zufaellig durchs Dach, wenn Durchbrueche
// vorhanden sind. Exakt dasselbe, bereits in Wall.tsx dokumentierte Problem
// (siehe dortiger Kommentar zu buildOpeningRimEdges): <Edges>/EdgesGeometry
// hasht Kanten nur ueber Vertex-POSITION - three-bvh-csg's eigene
// Triangulierung der CSG-Restflaeche erzeugt dabei echte, einzelne innere
// Kanten, die dann als zufaellige Diagonalen mitgezeichnet werden. Fix:
// wie in Wall.tsx KEINE Kantenlinien mehr aus der CSG-Geometrie ableiten,
// sondern von Hand aus der bekannten, exakten Aussenkontur des Keil-Prismas
// (9 feste Kanten, siehe buildWedgeContourEdges) plus einer Umrandung je
// Durchbruch (buildRidgeOpeningRimEdges) zusammensetzen.
const SLOPE_DEG = 1;

// Hoehe der First-Schraegen-Oberflaeche an gegebener Breiten-Position z
// (0 am Rand, peak in der Mitte, linear dazwischen - deckt sich mit der
// Dreieck-Querschnittsflaeche unten).
function surfaceHeightAt(z: number, halfW: number, peak: number): number {
  const clampedHalfW = Math.max(halfW, 1e-6);
  return peak * (1 - Math.min(Math.abs(z), clampedHalfW) / clampedHalfW);
}

// Jonas' Fehlerbericht 2026-08-10: die Linie im First-Knick war zwar korrekt
// positioniert, wurde aber von Durchbruechen nicht unterbrochen (lief einfach
// durch). Liefert die von einem Durchbruch blockierte X-Spanne AN GENAU DER
// Z-Position zLine - bei runden Durchbruechen ist das die Sehnenbreite an
// dieser Stelle (schmaler als der volle Durchmesser, ausser genau in der
// Mitte des Kreises), nicht der volle Durchmesser wie bei rechteckigen.
function blockedXAtZ(opening: Opening, typeDef: OpeningTypeDef, widthM: number, zLine: number): [number, number] | null {
  const cx = opening.u;
  const cz = widthM / 2 - opening.v;
  if (typeDef.shape === "round") {
    const r = opening.width / 2;
    const dz = zLine - cz;
    if (Math.abs(dz) >= r) return null;
    const dx = Math.sqrt(r * r - dz * dz);
    return [cx - dx, cx + dx];
  }
  const hh = opening.height / 2;
  if (Math.abs(zLine - cz) >= hh) return null;
  const hw = opening.width / 2;
  return [cx - hw, cx + hw];
}

// Analog railLayout.ts's freeSegments, nur auf einem beliebigen [xMin,xMax]-
// Bereich statt [0,total] (die First-Laengskanten sind nicht bei 0 zentriert).
function freeXSegments(blocked: [number, number][], xMin: number, xMax: number): [number, number][] {
  if (blocked.length === 0) return [[xMin, xMax]];
  const sorted = [...blocked].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [from, to] = sorted[i];
    if (from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  const free: [number, number][] = [];
  let cursor = xMin;
  for (const [from, to] of merged) {
    if (from > cursor) free.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < xMax) free.push([cursor, xMax]);
  return free.filter(([from, to]) => to - from > 1e-4);
}

// Feste Aussenkontur des Keil-Prismas (2x Dreieck-Umfang an den Stirnseiten
// + 3 Laengskanten, siehe surfaceHeightAt fuer die Herleitung der
// Querschnitts-Eckpunkte). Die Stirnseiten-Dreiecke bleiben durchgehend
// (Durchbrueche stehen praktisch nie exakt an der Containerkante), die 3
// LAENGS laufenden Kanten (First-Knick + beide Traufkanten) werden an jeder
// Stelle unterbrochen, an der sie tatsaechlich durch einen Durchbruch laufen.
function buildWedgeContourEdges(lengthM: number, halfW: number, peak: number, openings: Opening[], widthM: number): number[] {
  const x0 = -lengthM / 2;
  const x1 = lengthM / 2;
  // [z, y] Eckpunkte der Dreieck-Querschnittsflaeche.
  const cross: [number, number][] = [
    [-halfW, 0],
    [0, peak],
    [halfW, 0],
  ];
  const verts: number[] = [];
  for (const x of [x0, x1]) {
    for (let i = 0; i < 3; i++) {
      const [z0, y0] = cross[i];
      const [z1, y1] = cross[(i + 1) % 3];
      verts.push(x, y0, z0, x, y1, z1);
    }
  }
  for (const [z, y] of cross) {
    const blocked: [number, number][] = [];
    for (const opening of openings) {
      const span = blockedXAtZ(opening, OPENING_TYPES[opening.kind], widthM, z);
      if (span) blocked.push(span);
    }
    for (const [fromX, toX] of freeXSegments(blocked, x0, x1)) verts.push(fromX, y, z, toX, y, z);
  }
  return verts;
}

// Umrandung je Dach-Durchbruch, analog Wall.tsx's buildOpeningRimEdges -
// liegt auf der (leicht geneigten) Aussenflaeche der Kappe an der jeweiligen
// z-Position (surfaceHeightAt), nicht auf einer festen Ebene, da die First-
// Schraege selbst geneigt ist.
function buildRidgeOpeningRimEdges(opening: Opening, typeDef: OpeningTypeDef, widthM: number): number[] {
  const halfW = widthM / 2;
  const peak = halfW * Math.tan((SLOPE_DEG * Math.PI) / 180);
  const cx = opening.u;
  const cz = widthM / 2 - opening.v;
  const outline: [number, number][] = [];

  if (typeDef.shape === "round") {
    const segments = 32;
    const r = opening.width / 2;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      outline.push([cx + r * Math.cos(a0), cz + r * Math.sin(a0)]);
      outline.push([cx + r * Math.cos(a1), cz + r * Math.sin(a1)]);
    }
  } else {
    const hw = opening.width / 2;
    const hh = opening.height / 2;
    const corners: [number, number][] = [
      [cx - hw, cz - hh],
      [cx + hw, cz - hh],
      [cx + hw, cz + hh],
      [cx - hw, cz + hh],
    ];
    for (let i = 0; i < 4; i++) {
      outline.push(corners[i]);
      outline.push(corners[(i + 1) % 4]);
    }
  }

  const verts: number[] = [];
  for (const [x, z] of outline) verts.push(x, surfaceHeightAt(z, halfW, peak), z);
  return verts;
}

export function RoofRidge({ lengthM, widthM, baseY, openings }: RoofRidgeProps) {
  const { viewStyle, outsideColor } = useDisplaySettings();
  const sectionPlane = useSectionPlane();
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];
  const shaded = viewStyle === "shaded_edges";

  const geometry = useMemo(() => {
    const halfW = widthM / 2;
    const peak = halfW * Math.tan((SLOPE_DEG * Math.PI) / 180);

    // Dreieck-Querschnitt (Breite x Zusatzhoehe) - liegt zunaechst in lokaler
    // XY, Extrusion (ExtrudeGeometry) laeuft entlang lokal Z.
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(0, peak);
    shape.lineTo(halfW, 0);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: lengthM, bevelEnabled: false, steps: 1 });
    // First soll LAENGS laufen (Welt-X) statt der Standard-Extrusionsachse
    // (lokal Z) - rotateY(90°) bildet (x,y,z) -> (z,y,-x) ab, die
    // Extrusionslaenge (0..lengthM) landet damit auf X. Danach zentrieren
    // (0..lengthM -> -lengthM/2..+lengthM/2), damit die Kappe wie die
    // Dachflaeche selbst um den Weltursprung zentriert liegt.
    geom.rotateY(Math.PI / 2);
    geom.translate(-lengthM / 2, 0, 0);

    if (openings.length === 0) return geom;

    // Nach den obigen Transformationen deckt sich diese Geometrie bereits
    // 1:1 mit Welt-X (Laenge, = opening.u aus Wall.tsx/Container.tsx fuers
    // "top"-Panel) und Welt-Z (Breite, = panelHeight/2 - opening.v, da
    // Wall.tsx lokal-Y=opening.v-panelHeight/2 fuers "top"-Panel unter
    // dessen eigener Rotation auf Welt-Z=-lokal-Y abbildet) - der Mesh
    // selbst hat KEINE eigene Rotation mehr, nur die additive baseY-Position.
    // Cut-Hoehe grosszuegig ueber den First hinaus, damit der Ausschnitt die
    // duenne Kappe sicher komplett durchsticht.
    let result: Brush = new Brush(geom);
    result.updateMatrixWorld();
    const cutHeight = peak + 0.1;

    for (const opening of openings) {
      const typeDef = OPENING_TYPES[opening.kind];
      const localX = opening.u;
      const localZ = widthM / 2 - opening.v;

      const cutGeom =
        typeDef.shape === "round"
          ? new THREE.CylinderGeometry(opening.width / 2, opening.width / 2, cutHeight, 32)
          : new THREE.BoxGeometry(opening.width, cutHeight, opening.height);

      const cutBrush = new Brush(cutGeom);
      cutBrush.position.set(localX, cutHeight / 2 - 0.05, localZ);
      cutBrush.updateMatrixWorld();
      result = evaluator.evaluate(result, cutBrush, SUBTRACTION);
    }

    return result.geometry;
  }, [lengthM, widthM, openings]);

  const edgeGeometry = useMemo(() => {
    const halfW = widthM / 2;
    const peak = halfW * Math.tan((SLOPE_DEG * Math.PI) / 180);
    const positions = buildWedgeContourEdges(lengthM, halfW, peak, openings, widthM);
    for (const opening of openings) {
      positions.push(...buildRidgeOpeningRimEdges(opening, OPENING_TYPES[opening.kind], widthM));
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [lengthM, widthM, openings]);

  const materialProps = shaded ? { roughness: 1, metalness: 0 } : { roughness: 0.6, metalness: 0.4 };

  return (
    <mesh geometry={geometry} position={[0, baseY, 0]} castShadow>
      <meshStandardMaterial color={outsideColor} side={THREE.DoubleSide} clippingPlanes={clippingPlanes} {...materialProps} />
      {shaded && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color="#1e293b" clippingPlanes={clippingPlanes} />
        </lineSegments>
      )}
    </mesh>
  );
}
