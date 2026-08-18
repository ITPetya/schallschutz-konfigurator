import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { setPointerCursor, resetPointerCursor } from "../utils/pointerCursor";
import { isRectFullyCutAway } from "../utils/planeClipping";

export interface SelectableFace {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
}

interface SelectableFaceMarkersProps {
  faces: SelectableFace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Jonas' Vorgabe 2026-08-17: Doppelklick oeffnet die Bearbeitung (Zeile in
  // der Seitenleiste aufklappen bzw. Trennwand-Drill-in) - gleiches Muster
  // wie ProjectScene3D.tsx's onOpenDetail fuer Baugruppen-Container.
  onOpen: (id: string) => void;
  sectionPlane?: THREE.Plane | null;
}

// Klick-/Hover-Overlay fuer bereits platzierte Einbauten UND Trennwaende
// (Jonas' Vorgabe 2026-08-17: "man soll die Einbauten auch auswaehlen
// koennen") - gleiches Zwei-Ebenen-Muster wie WallFaceMarkers.tsx/
// AlignmentFaceMarkers.tsx, aber ohne deren feste 0.3m-Einrueckung fuer die
// sichtbare Markierung: Einbauten reichen von kleinen Kabeldurchbruechen bis
// zu grossen Tueren/Trennwaenden, ein fixer Rand waere fuer die kleinen
// Faelle zu gross. Drei Deckkraft-Stufen (idle/hover/selected) statt
// WallFaceMarkers' zwei, dieselbe Farb-/Opacity-Sprache wie die
// Hover-Ergaenzung in ProjectScene3D.tsx (Feature 1).
export function SelectableFaceMarkers({ faces, selectedId, onSelect, onOpen, sectionPlane }: SelectableFaceMarkersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Siehe WallFaceMarkers.tsx fuer die ausfuehrliche Begruendung: Filterung
  // (komplett weggeschnittene Flaeche) UND clippingPlanes (teilweise
  // weggeschnitten) sind beide noetig, isRectFullyCutAway prueft alle vier
  // Ecken statt nur des Mittelpunkts.
  const clippingPlanes = sectionPlane ? [sectionPlane] : [];
  const visibleFaces = sectionPlane ? faces.filter((f) => !isRectFullyCutAway(f.position, f.rotation, f.width, f.height, sectionPlane)) : faces;

  return (
    <group>
      {visibleFaces.map((f) => {
        const isSelected = selectedId === f.id;
        const isHovered = hoveredId === f.id;
        const opacity = isSelected ? 0.5 : isHovered ? 0.28 : 0.12;
        return (
          <group key={f.id} position={f.position} rotation={f.rotation}>
            <mesh
              // Siehe MeasureMarkers.tsx fuer die volle Begruendung (Jonas'
              // Fehlerbericht 2026-08-18): ohne eigenen onPointerDown-Handler
              // lief das pointerdown-Event ungehindert zur Baugruppen-
              // Container-Grundflaeche dahinter durch (die darauf mit
              // Auswahl/Drag reagiert), auch wenn onClick bereits korrekt
              // gestoppt wurde - r3f behandelt jeden Event-Typ unabhaengig.
              onPointerDown={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(f.id);
              }}
              onDoubleClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onOpen(f.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(f.id);
                setPointerCursor();
              }}
              onPointerOut={() => {
                setHoveredId((cur) => (cur === f.id ? null : cur));
                resetPointerCursor();
              }}
            >
              <planeGeometry args={[f.width, f.height]} />
              <meshBasicMaterial
                color="#0284c7"
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
                clippingPlanes={clippingPlanes}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
