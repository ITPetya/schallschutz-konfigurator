import type { Opening } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { C_RAIL_PITCH_M, C_RAIL_WIDTH_M } from "./cRailProfile";

// Reststuecke unter dieser Hoehe werden nicht mehr als eigenes Feld/Schiene
// gerendert bzw. ausgeschnitten (z. B. ein 3mm-Rest direkt ueber einer Tuer).
const MIN_SEGMENT_HEIGHT_M = 0.02;
const MIN_BAY_WIDTH_M = 0.02;

export interface RailSegment {
  u: number;
  from: number;
  to: number;
}

export interface BaySegment {
  uStart: number;
  uEnd: number;
  from: number;
  to: number;
}

export interface RailLayout {
  railSegments: RailSegment[];
  baySegments: BaySegment[];
}

// Verschmilzt ueberlappende "blockierte" Hoehenbereiche (Oeffnungen) und
// liefert die dazwischen/darueber/darunter freien Hoehenbereiche innerhalb
// [0, total].
function freeSegments(blocked: [number, number][], total: number): [number, number][] {
  if (blocked.length === 0) return [[0, total]];
  const sorted = [...blocked].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [from, to] = sorted[i];
    if (from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  const free: [number, number][] = [];
  let cursor = 0;
  for (const [from, to] of merged) {
    if (from > cursor) free.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < total) free.push([cursor, total]);
  return free.filter(([from, to]) => to - from > MIN_SEGMENT_HEIGHT_M);
}

// Gemeinsame Raster-/Aussparungs-Berechnung fuer C-Schienen + Streckgitter-
// Felder - von InteriorCladding.tsx (Platzierung) UND Wall.tsx (CSG-
// Ausschnitt in der Wand an jeder Schienen-Position, siehe dortigen
// Kommentar "Schienen versenkt") gemeinsam genutzt, damit beide IMMER exakt
// dieselben Positionen verwenden.
export function computeRailLayout(panelWidth: number, panelHeight: number, openings: Opening[]): RailLayout {
  const count = Math.max(1, Math.floor(panelWidth / C_RAIL_PITCH_M) + 1);
  const margin = (panelWidth - (count - 1) * C_RAIL_PITCH_M) / 2;
  const railU = Array.from({ length: count }, (_, i) => -panelWidth / 2 + margin + i * C_RAIL_PITCH_M);

  const railSegments: RailSegment[] = [];
  for (const u of railU) {
    const nearby = openings.filter((o) => Math.abs(o.u - u) < o.width / 2 + C_RAIL_WIDTH_M / 2);
    // Jonas' Fehlerbericht 2026-08-10: ueber Tueren sollen GAR KEINE Schienen
    // stehen (auch kein Stumpf oberhalb der Tuerzarge) - anders als bei
    // sonstigen Durchbruechen (Fenster/Lueftungsgitter), wo die Schiene
    // oberhalb/unterhalb weiterhin sinnvoll ist und daher nur die von der
    // Oeffnung blockierte Hoehe ausgespart wird (siehe freeSegments unten).
    if (nearby.some((o) => OPENING_TYPES[o.kind].isDoor)) continue;
    const blocked = nearby.map((o): [number, number] => [o.v - o.height / 2, o.v + o.height / 2]);
    for (const [from, to] of freeSegments(blocked, panelHeight)) railSegments.push({ u, from, to });
  }

  const bayBounds: { uStart: number; uEnd: number }[] = [];
  if (railU[0] > -panelWidth / 2) bayBounds.push({ uStart: -panelWidth / 2, uEnd: railU[0] });
  for (let i = 0; i < railU.length - 1; i++) bayBounds.push({ uStart: railU[i], uEnd: railU[i + 1] });
  if (railU[railU.length - 1] < panelWidth / 2) bayBounds.push({ uStart: railU[railU.length - 1], uEnd: panelWidth / 2 });

  const baySegments: BaySegment[] = [];
  for (const { uStart, uEnd } of bayBounds) {
    if (uEnd - uStart < MIN_BAY_WIDTH_M) continue;
    const blocked = openings
      .filter((o) => o.u + o.width / 2 > uStart && o.u - o.width / 2 < uEnd)
      .map((o): [number, number] => [o.v - o.height / 2, o.v + o.height / 2]);
    for (const [from, to] of freeSegments(blocked, panelHeight)) baySegments.push({ uStart, uEnd, from, to });
  }

  return { railSegments, baySegments };
}
