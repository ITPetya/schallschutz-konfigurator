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

// Jonas' Fehlerbericht 2026-08-10: an einem runden Dach-Durchbruch war die
// Schienen-/Streckgitter-Aussparung "eckig statt rund, wie ein Schlitz" -
// Ursache: o.height wird beim Vergroessern/Verkleinern eines RUNDEN
// Durchbruchs (OpeningsPanel.tsx zeigt fuer shape="round" bewusst nur ein
// "Durchmesser"-Feld, das ausschliesslich o.width schreibt) nie mitgepflegt
// und blieb dadurch oft auf dem Default (z. B. 100mm) stehen, WAEHREND o.width
// (der tatsaechliche Durchmesser) laengst groesser/kleiner war. Diese Stelle
// hier nutzte bisher ueberall direkt o.height fuer die blockierte
// Hoehen-Spanne - bei einem runden Durchbruch muss das aber der Durchmesser
// (o.width) sein, nicht das u. U. veraltete o.height (das laut
// types/openings.ts bei "round" ohnehin als ignoriert dokumentiert ist).
function verticalSpan(o: Opening): [number, number] {
  const h = OPENING_TYPES[o.kind].shape === "round" ? o.width : o.height;
  return [o.v - h / 2, o.v + h / 2];
}

// Schneidet from/to-Segmente auf [lo, hi] zu (Rest verworfen, wenn er unter
// MIN_SEGMENT_HEIGHT_M faellt) - siehe insetV-Parameter unten.
function clipSegments<T extends { from: number; to: number }>(segments: T[], lo: number, hi: number): T[] {
  const out: T[] = [];
  for (const seg of segments) {
    const from = Math.max(seg.from, lo);
    const to = Math.min(seg.to, hi);
    if (to - from > MIN_SEGMENT_HEIGHT_M) out.push({ ...seg, from, to });
  }
  return out;
}

// Gemeinsame Raster-/Aussparungs-Berechnung fuer C-Schienen + Streckgitter-
// Felder - von InteriorCladding.tsx (Platzierung) UND Wall.tsx (CSG-
// Ausschnitt in der Wand an jeder Schienen-Position, siehe dortigen
// Kommentar "Schienen versenkt") gemeinsam genutzt, damit beide IMMER exakt
// dieselben Positionen verwenden.
//
// insetV (Jonas' Fehlerbericht 2026-08-10, "Schienen im Dach zu lang,
// durchbrechen die Aussenhaut"): bei Links/Rechts/Vorne/Hinten ist
// panelHeight bereits die korrekte lichte Innenhoehe (verticalWallHeight,
// siehe Container.tsx - dort schon um Boden-/Dachstaerke gekuerzt), aber
// beim Dach-Panel ("top") ist panelHeight = effectiveW bewusst UNGEKUERZT
// (traegt die volle Breite, siehe dortiger Wandkeil-Kommentar) - dessen
// Schienen liefen deshalb bis an/über die Seitenwand-Staerke hinaus. Anders
// als beim u-Achsen-Pendant (claddingWidth in Wall.tsx) wird hier NICHT die
// Gesamtbreite selbst geschrumpft (v ist KANTEN-relativ, nicht mittig wie u
// - ein geschrumpftes "total" wuerde die Oeffnungs-v-Werte gegen die falsche
// Kante rechnen), sondern erst NACH der normalen Berechnung auf
// [insetV, panelHeight-insetV] zugeschnitten.
export function computeRailLayout(
  panelWidth: number,
  panelHeight: number,
  openings: Opening[],
  insetV = 0,
): RailLayout {
  const count = Math.max(1, Math.floor(panelWidth / C_RAIL_PITCH_M) + 1);
  const margin = (panelWidth - (count - 1) * C_RAIL_PITCH_M) / 2;
  const railU = Array.from({ length: count }, (_, i) => -panelWidth / 2 + margin + i * C_RAIL_PITCH_M);

  let railSegments: RailSegment[] = [];
  for (const u of railU) {
    const nearby = openings.filter((o) => Math.abs(o.u - u) < o.width / 2 + C_RAIL_WIDTH_M / 2);
    // Jonas' Fehlerbericht 2026-08-10: ueber Tueren sollen GAR KEINE Schienen
    // stehen (auch kein Stumpf oberhalb der Tuerzarge) - anders als bei
    // sonstigen Durchbruechen (Fenster/Lueftungsgitter), wo die Schiene
    // oberhalb/unterhalb weiterhin sinnvoll ist und daher nur die von der
    // Oeffnung blockierte Hoehe ausgespart wird (siehe freeSegments unten).
    if (nearby.some((o) => OPENING_TYPES[o.kind].isDoor)) continue;
    const blocked = nearby.map(verticalSpan);
    for (const [from, to] of freeSegments(blocked, panelHeight)) railSegments.push({ u, from, to });
  }

  // Jonas' Fehlerbericht 2026-08-10 ("kein wirklich sichtbarer Ausschnitt,
  // nur Textur unterbrochen"): die Bay-Grenzen lagen bisher auf den
  // Schienen-MITTELPUNKTEN (railU) statt auf deren AUSSENKANTEN - das
  // Streckgitter-Feld griff dadurch auf jeder Seite um die halbe
  // Schienenbreite (23mm) in den Schienen-/Ausschnittbereich hinein und
  // verdeckte ihn optisch (die Gitterflaeche liegt sogar naeher am Raum als
  // die buendige Schiene, siehe streckgitterZ vs. railBaseZ in
  // InteriorCladding.tsx). Fix: Bay-Grenzen auf die echten Schienen-
  // AUSSENKANTEN (railU +/- C_RAIL_WIDTH_M/2) gelegt, damit exakt der vom
  // Ausschnitt/der Schiene beanspruchte Streifen frei von Gitterflaeche
  // bleibt statt ueberdeckt zu werden.
  const halfRail = C_RAIL_WIDTH_M / 2;
  const bayBounds: { uStart: number; uEnd: number }[] = [];
  if (railU[0] - halfRail > -panelWidth / 2) bayBounds.push({ uStart: -panelWidth / 2, uEnd: railU[0] - halfRail });
  for (let i = 0; i < railU.length - 1; i++) bayBounds.push({ uStart: railU[i] + halfRail, uEnd: railU[i + 1] - halfRail });
  if (railU[railU.length - 1] + halfRail < panelWidth / 2) {
    bayBounds.push({ uStart: railU[railU.length - 1] + halfRail, uEnd: panelWidth / 2 });
  }

  let baySegments: BaySegment[] = [];
  for (const { uStart, uEnd } of bayBounds) {
    if (uEnd - uStart < MIN_BAY_WIDTH_M) continue;
    const blocked = openings
      .filter((o) => o.u + o.width / 2 > uStart && o.u - o.width / 2 < uEnd)
      .map(verticalSpan);
    for (const [from, to] of freeSegments(blocked, panelHeight)) baySegments.push({ uStart, uEnd, from, to });
  }

  if (insetV > 0) {
    railSegments = clipSegments(railSegments, insetV, panelHeight - insetV);
    baySegments = clipSegments(baySegments, insetV, panelHeight - insetV);
  }

  return { railSegments, baySegments };
}
