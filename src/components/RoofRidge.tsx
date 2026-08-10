import { useMemo } from "react";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { Edges } from "@react-three/drei";
import type { Opening } from "../types/openings";
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
const SLOPE_DEG = 1;

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

  const materialProps = shaded ? { roughness: 1, metalness: 0 } : { roughness: 0.6, metalness: 0.4 };

  return (
    <mesh geometry={geometry} position={[0, baseY, 0]} castShadow>
      <meshStandardMaterial color={outsideColor} side={THREE.DoubleSide} clippingPlanes={clippingPlanes} {...materialProps} />
      {shaded && <Edges threshold={20} color="#1e293b" clippingPlanes={clippingPlanes} />}
    </mesh>
  );
}
