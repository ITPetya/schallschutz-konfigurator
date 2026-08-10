import { useMemo } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import type { Opening } from "../types/openings";
import { getCRailProfileShape, getRailRecessDepthM } from "../utils/cRailProfile";
import { computeRailLayout } from "../utils/railLayout";
import { getStreckgitterFieldMaps } from "../utils/streckgitterTexture";
import { useDisplaySettings } from "../context/DisplaySettingsContext";

interface InteriorCladdingProps {
  panelWidth: number;
  panelHeight: number;
  // Siehe Wall.tsx's gleichnamiger Prop - noetig beim Dach, dessen Schienen
  // sonst quer bis in die Seitenwand-Staerke liefen (Jonas' Fehlerbericht
  // 2026-08-10, "Schienen im Dach zu lang").
  claddingInsetV?: number;
  thickness: number;
  openings: Opening[];
  outwardSign: 1 | -1;
  clippingPlanes: THREE.Plane[];
}

// Streckgitter-Felder liegen ein kleines Stueck VOR der eigentlichen
// Wand-Innenflaeche (statt exakt koplanar) - zwei deckungsgleiche Flaechen
// an EXAKT derselben Tiefe fuehren sonst zu Z-Fighting/Flackern (Jonas'
// Fehlerbericht 2026-07-29: "es flackern die Innenwaende ... liegt
// vermutlich am Streckgitter").
const STRECKGITTER_OFFSET_M = 0.002;

// Innenverkleidung der Seitenwaende/des Dachs (Jonas' Vorgabe 2026-07-29):
// Streckgitter-Bleche zwischen senkrechten (bzw. am Dach: querlaufenden)
// C-Klemmschienen (558mm Achse-Achse), zur Befestigung von Aggregaten/
// Halterungen. Tueren/Einbauten sparen sowohl Schienen als auch Gitterfelder
// an der jeweiligen Stelle aus, siehe utils/railLayout.ts (von Wall.tsx UND
// hier gemeinsam genutzt, damit der dortige Wandausschnitt exakt zu den
// hier gerenderten Schienen passt).
export function InteriorCladding({
  panelWidth,
  panelHeight,
  claddingInsetV = 0,
  thickness,
  openings,
  outwardSign,
  clippingPlanes,
}: InteriorCladdingProps) {
  const { viewStyle } = useDisplaySettings();
  // Jonas' Fehlerbericht 2026-07-29: das Streckgitter soll nur in
  // "Schattiert mit Kanten" sichtbar sein (technische Detailansicht) - in
  // "Realistisch" bleibt die Wand-Innenflaeche wie gewohnt glatt. Die
  // C-Schienen selbst bleiben in BEIDEN Ansichten sichtbar, bekommen aber
  // nur hier zusaetzlich Kantenlinien (wie Wall.tsx/DoorLeaf.tsx es fuer
  // alle anderen Bauteile schon handhaben).
  const shaded = viewStyle === "shaded_edges";

  const railGeometry = useMemo(() => {
    const geom = new THREE.ExtrudeGeometry(getCRailProfileShape(), { depth: 1, bevelEnabled: false, steps: 1 });
    // Profil liegt lokal in XY (X=quer zur Wand, Y=Tiefe in den Raum),
    // Extrusion laeuft entlang Z - fuer eine SENKRECHTE Schiene muss die
    // Extrusionsachse zur Wand-Hochachse (lokal Y) werden: rotateX(-90°)
    // bildet (x,y,z) -> (x,z,-y) ab, die Extrusionslaenge (0..1) landet
    // damit auf lokal Y (0..1, aufwaerts).
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  // Wandinnenflaeche, siehe Wall.tsx's edgeGeometry.
  const innerZ = -outwardSign * (thickness / 2);
  // Jonas' Fehlerbericht 2026-08-10: die Schiene soll BUENDIG mit der
  // Innenwand sitzen (keine herausstehenden Teile) - der Schienen-Ruecken
  // sitzt deshalb um die VOLLE Versenktiefe (getRailRecessDepthM, siehe
  // cRailProfile.ts) Richtung Aussenflaeche zurueckversetzt, GENAU in dem
  // ebenso tiefen Ausschnitt, den Wall.tsx an derselben Stelle aus der Wand
  // entfernt (siehe dort und railLayout.ts - beide nutzen dieselbe Tiefe).
  const railBaseZ = innerZ + outwardSign * getRailRecessDepthM(thickness);
  const streckgitterZ = innerZ - outwardSign * STRECKGITTER_OFFSET_M;

  const { railSegments, baySegments } = useMemo(
    () => computeRailLayout(panelWidth, panelHeight, openings, claddingInsetV),
    [panelWidth, panelHeight, openings, claddingInsetV],
  );

  const bayFields = useMemo(
    () =>
      baySegments.map((bay) => ({
        ...bay,
        ...getStreckgitterFieldMaps(bay.uEnd - bay.uStart, bay.to - bay.from),
      })),
    [baySegments],
  );

  return (
    <group>
      {/* C-Schienen: EINE Profil-Geometrie fuer alle Instanzen/Groessen -
          pro freiem Hoehenabschnitt nur Y-skaliert (Extrusionslaenge=1m)
          statt neu berechnet. Immer sichtbar (Realistisch UND Schattiert
          mit Kanten), Kantenlinien nur im letzteren. */}
      {railSegments.map(({ u, from, to }, i) => (
        <mesh
          key={`rail-${i}`}
          geometry={railGeometry}
          position={[u, from - panelHeight / 2, railBaseZ]}
          scale={[1, to - from, outwardSign]}
          castShadow
        >
          <meshStandardMaterial color="#b8bcc0" roughness={0.5} metalness={0.7} clippingPlanes={clippingPlanes} />
          {shaded && <Edges threshold={20} color="#1e293b" clippingPlanes={clippingPlanes} />}
        </mesh>
      ))}

      {/* Streckgitter-Felder zwischen den Schienen (inkl. der beiden
          schmaleren Randfelder links/rechts) - nur in "Schattiert mit
          Kanten" (siehe shaded oben). */}
      {shaded &&
        bayFields.map(({ uStart, uEnd, from, to, map, bumpMap }, i) => (
          <mesh key={`bay-${i}`} position={[(uStart + uEnd) / 2, (from + to) / 2 - panelHeight / 2, streckgitterZ]}>
            <planeGeometry args={[uEnd - uStart, to - from]} />
            <meshStandardMaterial
              map={map}
              bumpMap={bumpMap}
              bumpScale={0.4}
              roughness={0.55}
              metalness={0.6}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        ))}
    </group>
  );
}
