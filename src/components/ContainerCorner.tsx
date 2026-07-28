import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Edges } from "@react-three/drei";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { useSectionPlane } from "../context/SectionPlaneContext";

const evaluator = new Evaluator();

// Eckbeschlaege (ISO-Eckguesse) an allen 8 Container-Ecken (Jonas' Vorgabe
// 2026-07-28, nach Referenzfoto): ein kleiner Kasten mit laenglich-ovalem
// Langloch auf der Oben-/Unten-Flaeche (fuer Twistlocks beim Stapeln) und je
// einem runden Loch auf den beiden nach aussen zeigenden Seitenflaechen
// (fuer die Kranaufnahme/Verriegelung). Symbolisch nachgebildet (grobe reale
// Groessenordnung), keine exakte ISO-1161-Fertigungszeichnung - reicht fuer
// die visuelle Wiedererkennung, die hier gefragt war.
export const CORNER_LENGTH = 0.18;
export const CORNER_HEIGHT = 0.12;
export const CORNER_WIDTH = 0.16;

const TOP_HOLE_RX = 0.065;
const TOP_HOLE_RZ = 0.028;
const SIDE_HOLE_R = 0.026;
// Flach genug, dass sich die drei Bohrungen (oben + 2x seitlich) INNERHALB
// des kleinen Kastens nicht gegenseitig ueberschneiden - sonst entsteht eine
// echte Drei-Koerper-CSG-Ueberlappung nahe der Kastenecke, die three-bvh-csg
// nur noch mit kaputter Triangulierung/Schattierung aufloest (an drei sich
// durchdringenden Zylindern statt sauber getrennter Bohrungen erprobt).
const HOLE_DEPTH = 0.025;

interface ContainerCornerProps {
  position: [number, number, number];
  // +1/-1: an welcher der beiden Ecken auf der jeweiligen Achse dieser
  // Beschlag sitzt - bestimmt, auf welcher der beiden Kasten-Seiten
  // (Laengs-/Stirnseite) das jeweilige Seitenloch liegt, und ob das
  // Langloch oben (mirrorY=1) oder unten (mirrorY=-1) sitzt.
  mirrorX: 1 | -1;
  mirrorZ: 1 | -1;
  mirrorY: 1 | -1;
}

export function ContainerCorner({ position, mirrorX, mirrorZ, mirrorY }: ContainerCornerProps) {
  const { viewStyle, outsideColor } = useDisplaySettings();
  const sectionPlane = useSectionPlane();
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];
  const shaded = viewStyle === "shaded_edges";
  const materialProps = shaded ? { roughness: 1, metalness: 0 } : { roughness: 0.5, metalness: 0.6 };

  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(CORNER_LENGTH, CORNER_HEIGHT, CORNER_WIDTH);
    let result: Brush = new Brush(box);
    result.updateMatrixWorld();

    // Alle drei Loecher als "blinde" Bohrung (Zylinder doppelt so lang wie
    // HOLE_DEPTH, mittig auf der jeweiligen Aussenflaeche positioniert) -
    // die aeussere Haelfte liegt ausserhalb des Kastens (wirkt sich nicht
    // aus), die innere Haelfte schneidet HOLE_DEPTH tief ein, ohne dass sich
    // die drei Loecher im Inneren treffen muessten.
    const topHoleGeom = new THREE.CylinderGeometry(1, 1, HOLE_DEPTH * 2, 32);
    topHoleGeom.scale(TOP_HOLE_RX, 1, TOP_HOLE_RZ);
    const topHoleBrush = new Brush(topHoleGeom);
    topHoleBrush.position.set(0, mirrorY * (CORNER_HEIGHT / 2), 0);
    topHoleBrush.updateMatrixWorld();
    result = evaluator.evaluate(result, topHoleBrush, SUBTRACTION);

    const sideHoleGeomX = new THREE.CylinderGeometry(SIDE_HOLE_R, SIDE_HOLE_R, HOLE_DEPTH * 2, 24);
    sideHoleGeomX.rotateZ(Math.PI / 2);
    const sideHoleBrushX = new Brush(sideHoleGeomX);
    sideHoleBrushX.position.set(mirrorX * (CORNER_LENGTH / 2), 0, 0);
    sideHoleBrushX.updateMatrixWorld();
    result = evaluator.evaluate(result, sideHoleBrushX, SUBTRACTION);

    const sideHoleGeomZ = new THREE.CylinderGeometry(SIDE_HOLE_R, SIDE_HOLE_R, HOLE_DEPTH * 2, 24);
    sideHoleGeomZ.rotateX(Math.PI / 2);
    const sideHoleBrushZ = new Brush(sideHoleGeomZ);
    sideHoleBrushZ.position.set(0, 0, mirrorZ * (CORNER_WIDTH / 2));
    sideHoleBrushZ.updateMatrixWorld();
    result = evaluator.evaluate(result, sideHoleBrushZ, SUBTRACTION);

    // Glaettet die Normalen an den CSG-Nahtstellen (identisch zu Wall.tsx's
    // solider Wandflaeche) - ohne das wirken die Bohrungsraender fleckig/
    // facettiert statt wie eine saubere Rundung.
    return mergeVertices(result.geometry);
  }, [mirrorX, mirrorY, mirrorZ]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial color={outsideColor} clippingPlanes={clippingPlanes} {...materialProps} />
      {shaded && <Edges threshold={20} color="#1e293b" clippingPlanes={clippingPlanes} />}
    </mesh>
  );
}
