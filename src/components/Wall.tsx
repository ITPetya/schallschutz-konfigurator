import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Edges } from "@react-three/drei";
import type { Opening } from "../types/openings";
import type { OpeningTypeDef } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { DoorLeaf } from "./DoorLeaf";
import { useSectionPlane } from "../context/SectionPlaneContext";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { UNPAINTED_INSIDE_COLOR, UNPAINTED_MATERIAL_PROPS } from "../constants/unpaintedMaterial";

interface WallProps {
  position: [number, number, number];
  rotation: [number, number, number];
  panelWidth: number;
  panelHeight: number;
  thickness: number;
  openings: Opening[];
  // +1, wenn die lokale +Z-Richtung dieser Wand (vor Rotation) nach AUSSEN
  // zeigt, -1, wenn lokal -Z nach aussen zeigt - haengt davon ab, wie die
  // Wand in Container.tsx positioniert/rotiert wurde. Wird sowohl fuer
  // Durchbrueche mit protrusionDepth (Wetterschutzgitter) als auch fuers
  // Aufteilen der Wandflaeche in Aussen-/Innenfarbe gebraucht.
  outwardSign: 1 | -1;
}

// Ein Evaluator reicht global - er haelt keinen Zustand zwischen Aufrufen,
// siehe three-bvh-csg-Doku.
const evaluator = new Evaluator();

// Jonas' Fehlerbericht 2026-07-25: Wetterschutzgitter "ca. 10m lang" statt
// 12mm. Root Cause: protrusionDepth in OPENING_TYPES ist wie ALLE Masse dort
// in MILLIMETERN definiert, aber o.width/o.height/thickness kommen hier
// bereits in METERN an (Container.tsx rechnet einmalig um, siehe dortiger
// Kommentar) - protrusionDepth wurde bisher OHNE diese Umrechnung direkt
// verwendet, also faktisch als 12 METER statt 0,012m behandelt.
const MM_TO_M = 1 / 1000;

// Jonas' Fehlerbericht 2026-07-25 (weiterhin nach dem mergeVertices-Versuch
// aus einer frueheren Runde): "komische Diagonallinien" bestehen weiter.
// Root Cause, per Analyse dieser Runde (Node-Script hat die tatsaechliche
// EdgesGeometry-Ausgabe der CSG-Restflaeche vermessen): THREE.EdgesGeometry
// hasht Kanten NUR ueber Vertex-POSITION (gerundet auf 4 Nachkommastellen) -
// mergeVertices (das zusaetzlich Normalen/UVs vergleicht) aendert daran
// nichts. Die echten Diagonalen sind KEINE knapp daneben liegenden
// Duplikat-Vertices, sondern echte, einzelne, nur von EINEM Dreieck
// genutzte innere Kanten aus three-bvh-csg's eigener Triangulierung der
// ringfoermigen Restflaeche (Wand minus Loch) - das Boolean-Werkzeug ist
// nicht darauf ausgelegt, dabei eine "saubere" 2D-Restflaeche zu erzeugen.
// Deshalb: Kantenlinien fuer die "Schattiert mit Kanten"-Ansicht NICHT mehr
// aus der CSG-Geometrie ableiten, sondern von Hand aus der bekannten,
// exakten Geometrie aufbauen - Aussenkontur der Wand (immer sauber, weil aus
// einer ungeschnittenen BoxGeometry) plus je eine Umrandung pro Durchbruch
// (Rechteck oder Kreis, exakt an dessen echter Position/Groesse).
function buildOpeningRimEdges(opening: Opening, typeDef: OpeningTypeDef, panelHeight: number, thickness: number): number[] {
  const cx = opening.u;
  const cy = opening.v - panelHeight / 2;
  const outline: [number, number][] = [];

  if (typeDef.shape === "round") {
    const segments = 32;
    const r = opening.width / 2;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      outline.push([cx + r * Math.cos(a0), cy + r * Math.sin(a0)]);
      outline.push([cx + r * Math.cos(a1), cy + r * Math.sin(a1)]);
    }
  } else {
    const hw = opening.width / 2;
    const hh = opening.height / 2;
    const corners: [number, number][] = [
      [cx - hw, cy - hh],
      [cx + hw, cy - hh],
      [cx + hw, cy + hh],
      [cx - hw, cy + hh],
    ];
    for (let i = 0; i < 4; i++) {
      outline.push(corners[i]);
      outline.push(corners[(i + 1) % 4]);
    }
  }

  const verts: number[] = [];
  for (const z of [thickness / 2, -thickness / 2]) {
    for (const [x, y] of outline) verts.push(x, y, z);
  }
  return verts;
}

// Teilt die fertige CSG-Geometrie in zwei Materialgruppen auf: Aussen-
// (outwardSign-Richtung) und Innenflaeche (Jonas' Vorgabe 2026-07-22:
// unterschiedliche RAL-Farben innen/aussen). Grobe, aber fuer duenne
// Wandpaneele treffsichere Naeherung: Dreiecke werden anhand ihrer
// gemittelten Normalen-Z-Komponente sortiert - Schnittflaechen an den
// Ausschnitt-Raendern (Normale ~senkrecht zu Z) fallen automatisch in eine
// der beiden Gruppen, nicht in eine dritte "Kante"-Gruppe (bewusste
// Vereinfachung, kein Konfigurator fuer Fertigungszeichnungen).
function splitByOutward(geometry: THREE.BufferGeometry, outwardSign: number): THREE.BufferGeometry {
  const index = geometry.index;
  const normal = geometry.attributes.normal;
  if (!index || !normal) return geometry;

  const outward: number[] = [];
  const inward: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    const nz = normal.getZ(a) + normal.getZ(b) + normal.getZ(c);
    if (nz * outwardSign >= 0) outward.push(a, b, c);
    else inward.push(a, b, c);
  }

  const split = geometry.clone();
  split.setIndex([...outward, ...inward]);
  split.clearGroups();
  split.addGroup(0, outward.length, 0);
  split.addGroup(outward.length, inward.length, 1);
  return split;
}

// Rendert eine einzelne Wand als CSG-Ausschnitt: Wand-Quader minus je einem
// Quader (rechteckige Durchbrueche) oder Zylinder (Rohrdurchführung, rund)
// pro platziertem Durchbruch dieser Wand. Die Ausschnitt-Geometrie wird in
// LOKALEN Koordinaten der Wand berechnet (bevor Position/Rotation der Wand
// selbst angewendet werden) - dadurch ist diese Komponente unabhaengig davon,
// an welcher Seite des Containers sie tatsaechlich sitzt. Durchbrueche mit
// protrusionDepth (aktuell nur das Wetterschutzgitter, "baut 12mm nach aussen
// auf") bekommen zusaetzlich einen kleinen, nicht ausgeschnittenen, sondern
// AUFGESETZTEN Block auf der Aussenseite.
export function Wall({ position, rotation, panelWidth, panelHeight, thickness, openings, outwardSign }: WallProps) {
  const { viewStyle, insideColor, outsideColor, insideUnpainted } = useDisplaySettings();

  const geometry = useMemo(() => {
    const wallGeom = new THREE.BoxGeometry(panelWidth, panelHeight, thickness);
    let result: Brush = new Brush(wallGeom);
    result.updateMatrixWorld();

    for (const opening of openings) {
      const typeDef = OPENING_TYPES[opening.kind];
      // Tiefer als die Wand selbst, damit der Ausschnitt sauber komplett
      // durchgeht (keine Rest-Flaechen durch Koplanaritaet an der Oberflaeche).
      const cutDepth = thickness * 4;

      const cutGeom =
        typeDef.shape === "round"
          ? new THREE.CylinderGeometry(opening.width / 2, opening.width / 2, cutDepth, 32)
          : new THREE.BoxGeometry(opening.width, opening.height, cutDepth);

      if (typeDef.shape === "round") {
        // Zylinder-Achse zeigt per Default entlang Y - fuer die Wanddicken-
        // richtung (lokales Z) um 90 Grad um X kippen.
        cutGeom.rotateX(Math.PI / 2);
      }

      const cutBrush = new Brush(cutGeom);
      cutBrush.position.set(opening.u, opening.v - panelHeight / 2, 0);
      cutBrush.updateMatrixWorld();

      result = evaluator.evaluate(result, cutBrush, SUBTRACTION);
    }

    // mergeVertices bleibt fuer die SOLIDE Flaeche sinnvoll (glattere
    // Normalen an eigentlich flachen Naehten), ist aber NICHT die Loesung
    // fuer die Diagonallinien im "Schattiert mit Kanten"-Modus - siehe
    // buildOpeningRimEdges oben fuer den echten Grund und Fix.
    return splitByOutward(mergeVertices(result.geometry), outwardSign);
  }, [panelWidth, panelHeight, thickness, openings, outwardSign]);

  // Kantenlinien fuer "Schattiert mit Kanten" werden bewusst NICHT mehr aus
  // der CSG-Restgeometrie abgeleitet (siehe buildOpeningRimEdges), sondern
  // von Hand aus der Aussenkontur der ungeschnittenen Wand plus einer
  // Umrandung je Durchbruch zusammengesetzt - dadurch koennen keine
  // Triangulierungs-Artefakte der Boolean-Bibliothek mehr als Linien
  // auftauchen.
  const edgeGeometry = useMemo(() => {
    const boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(panelWidth, panelHeight, thickness));
    const positions = Array.from(boxEdges.attributes.position.array as Float32Array);
    boxEdges.dispose();

    for (const opening of openings) {
      positions.push(...buildOpeningRimEdges(opening, OPENING_TYPES[opening.kind], panelHeight, thickness));
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [panelWidth, panelHeight, thickness, openings]);

  const protrusions = openings.filter((o) => OPENING_TYPES[o.kind].protrusionDepth);
  const doors = openings.filter((o) => OPENING_TYPES[o.kind].isDoor);
  const sectionPlane = useSectionPlane();
  // IMMER ein konkretes Array uebergeben, NIE undefined - r3f/three
  // uebernehmen eine leere Aenderung auf undefined sonst nicht zuverlaessig
  // (das Material behaelt die vorherigen clippingPlanes), wodurch das
  // Abschalten der Schnittansicht sichtbar nichts bewirkt hat (Jonas'
  // Fehlerbericht 2026-07-22).
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];

  // "Schattiert mit Kanten" (Inventor-Begriff, Jonas' Vorgabe 2026-07-22):
  // flacher, matter (kein Hochglanz/Spiegelung) + sichtbare Kantenlinien -
  // "Realistisch" behaelt die bisherige, etwas glaenzendere PBR-Optik.
  const shaded = viewStyle === "shaded_edges";
  const materialProps = shaded
    ? { roughness: 1, metalness: 0 }
    : { roughness: 0.6, metalness: 0.4 };

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          attach="material-0"
          color={outsideColor}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
          {...materialProps}
        />
        <meshStandardMaterial
          attach="material-1"
          color={insideUnpainted ? UNPAINTED_INSIDE_COLOR : insideColor}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
          {...(insideUnpainted ? UNPAINTED_MATERIAL_PROPS : materialProps)}
        />
      </mesh>
      {shaded && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color="#1e293b" clippingPlanes={clippingPlanes} />
        </lineSegments>
      )}
      {protrusions.map((o) => {
        const depth = OPENING_TYPES[o.kind].protrusionDepth! * MM_TO_M;
        const zOffset = outwardSign * (thickness / 2 + depth / 2);
        return (
          <mesh key={o.id} position={[o.u, o.v - panelHeight / 2, zOffset]} castShadow>
            <boxGeometry args={[o.width, o.height, depth]} />
            <meshStandardMaterial color={outsideColor} clippingPlanes={clippingPlanes} {...materialProps} />
            {shaded && <Edges threshold={20} color="#1e293b" clippingPlanes={clippingPlanes} />}
          </mesh>
        );
      })}
      {doors.map((o) => {
        // Doppelfluegeltuer: zwei halb so breite Blaetter, je an der
        // AEUSSEREN Kante angeschlagen (Standard-Konvention), statt einer
        // DIN-Links/Rechts-Auswahl - passt zu OPENING_TYPES.door_double, das
        // bewusst kein hasHinge hat.
        if (o.kind === "door_double") {
          const leafWidth = o.width / 2;
          return (
            <group key={o.id}>
              <DoorLeaf
                u={o.u - leafWidth / 2}
                v={o.v}
                width={leafWidth}
                height={o.height}
                panelHeight={panelHeight}
                hinge="left"
                clippingPlanes={clippingPlanes}
                outwardSign={outwardSign}
              />
              <DoorLeaf
                u={o.u + leafWidth / 2}
                v={o.v}
                width={leafWidth}
                height={o.height}
                panelHeight={panelHeight}
                hinge="right"
                clippingPlanes={clippingPlanes}
                outwardSign={outwardSign}
              />
            </group>
          );
        }
        return (
          <DoorLeaf
            key={o.id}
            u={o.u}
            v={o.v}
            width={o.width}
            height={o.height}
            panelHeight={panelHeight}
            hinge={o.hinge ?? "left"}
            clippingPlanes={clippingPlanes}
            outwardSign={outwardSign}
          />
        );
      })}
    </group>
  );
}
