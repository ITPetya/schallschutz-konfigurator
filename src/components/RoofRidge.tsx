import { useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { useSectionPlane } from "../context/SectionPlaneContext";

interface RoofRidgeProps {
  lengthM: number;
  widthM: number; // Basis-Breite (Kante zu Kante, dort Zusatzhoehe = 0)
  baseY: number; // Welt-Y der Dach-Aussenflaeche (Basis der Schraege)
}

// Jonas' Vorgabe 2026-07-29: das Dach bekommt aussen eine leichte First-
// Schraege wie ein Hausdach - je 1° Neigung von der Mitte (First, laengs)
// zu beiden Laengsseiten hin, macht am First zusammen 2° ("durch die
// Addition der beiden 1° rechts und links ergeben sich in der Mitte 2°").
// Rein additiv/dekorativ: die Innenseite (Decke samt Dach-Schienen/
// Streckgitter aus InteriorCladding.tsx) bleibt unveraendert flach auf
// Hoehe H - nur diese duenne Keil-Kappe sitzt OBEN AUF der bestehenden
// flachen Dachflaeche (wall-top in Container.tsx), reicht dadurch bewusst
// ein paar mm ueber die konfigurierte Containerhoehe hinaus ("nicht
// schlimm", Jonas' Vorgabe). Kein CSG, keine Durchbrueche - reine
// Aussenkontur, unabhaengig vom Oeffnungssystem.
const SLOPE_DEG = 1;

export function RoofRidge({ lengthM, widthM, baseY }: RoofRidgeProps) {
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
    return geom;
  }, [lengthM, widthM]);

  const materialProps = shaded ? { roughness: 1, metalness: 0 } : { roughness: 0.6, metalness: 0.4 };

  return (
    <mesh geometry={geometry} position={[0, baseY, 0]} castShadow>
      <meshStandardMaterial color={outsideColor} side={THREE.DoubleSide} clippingPlanes={clippingPlanes} {...materialProps} />
      {shaded && <Edges threshold={20} color="#1e293b" clippingPlanes={clippingPlanes} />}
    </mesh>
  );
}
