import type { ContainerSize } from "../constants/containerSizes";
import type { PartitionWallConfig } from "../types/partitionWall";

const MM_TO_M = 1 / 1000;
// "kurz vor die Trennwand" (Jonas' Vorgabe 2026-08-14) - der Schnitt liegt
// nicht exakt auf der Wandflaeche, sondern einen kleinen Abstand davor, damit
// die Flaeche selbst sichtbar bleibt statt exakt in der Schnittebene zu
// liegen (Z-Fighting-Risiko).
const GAP_MM = 100;

export interface PartitionWallFocus {
  cameraPosition: [number, number, number];
  target: [number, number, number];
  sectionOffsetMm: number;
  cutDirection: 1 | -1;
}

// Kamera- und Schnitt-Zielwerte, um beim Hineinzoomen in eine Trennwand
// automatisch auf ihre C-Schienen-Seite zu blicken (Jonas' Vorgabe
// 2026-08-14) - hergeleitet aus zwei bestehenden Konventionen:
//
// 1. Rotation [0, Math.PI/2, 0] (identisch fuer Vorne/Hinten/Trennwand, siehe
//    PartitionWall.tsx) bildet lokal+Z IMMER auf Welt+X ab (nachgerechnet per
//    Rotationsmatrix) - outwardSign=+1 (smoothSide="front") heisst also: die
//    glatte Seite zeigt Welt+X (Richtung "Vorne"), die C-Schienen-Seite damit
//    Welt-X (Richtung "Hinten"), und umgekehrt bei smoothSide="back".
// 2. SectionAndViewPanel.tsx's sectionPlane fuer Achse "x": normal=(-1,0,0)*
//    cutDirection, constant=offsetMm*MM_TO_M*cutDirection, WebGL behaelt den
//    Bereich, wo normal·punkt+constant >= 0. Bei cutDirection=-1 bedeutet das
//    "behalte x >= offset", bei cutDirection=+1 "behalte x <= offset".
//
// Um die C-Schienen-Seite ueberhaupt sehen zu koennen, muss der Bereich
// ZWISCHEN der naeheren Stirnwand und der Trennwand weggeschnitten werden -
// bei smoothSide="front" (C-Schiene Richtung -X/Hinten) also alles mit
// x < (Wandflaeche - Puffer) behalten... nein, WEGSCHNEIDEN (behalten wird
// alles ab der Wandflaeche Richtung +X) -> cutDirection=-1. Bei
// smoothSide="back" symmetrisch cutDirection=+1. Nicht rein aus dem Code
// beweisbar (haengt an SECTION_NORMALS' Vorzeichenkonvention, die hier per
// Hand nachgerechnet wurde, nicht an einer Blickrichtungs-Annahme wie beim
// DIN-rechts-Fix) - trotzdem beim ersten Rendern kurz gegenpruefen.
export function computePartitionWallFocus(pw: PartitionWallConfig, size: ContainerSize): PartitionWallFocus {
  const positionU_m = pw.positionU * MM_TO_M;
  const halfThickness_m = pw.thickness / 2 * MM_TO_M;
  const heightM = size.height * MM_TO_M;
  const viewDistM = Math.max(size.width, size.height) * MM_TO_M * 1.8 + 2;

  const railFacesFront = pw.smoothSide === "back"; // C-Schiene Richtung +X/Vorne
  const cameraX = positionU_m + (railFacesFront ? viewDistM : -viewDistM);
  const faceX = positionU_m + (railFacesFront ? halfThickness_m : -halfThickness_m);
  const sectionOffsetMm = (faceX + (railFacesFront ? GAP_MM * MM_TO_M : -GAP_MM * MM_TO_M)) / MM_TO_M;
  const cutDirection: 1 | -1 = railFacesFront ? 1 : -1;

  return {
    cameraPosition: [cameraX, heightM * 0.55, 0],
    target: [positionU_m, heightM / 2, 0],
    sectionOffsetMm,
    cutDirection,
  };
}
