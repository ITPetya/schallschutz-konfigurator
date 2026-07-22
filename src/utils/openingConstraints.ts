import type { OpeningTypeDef } from "../types/openings";

export interface VerticalBounds {
  min: number;
  max: number;
  // true, wenn min > max - die Tuer passt bei dieser Containerhoehe unter
  // BEIDEN Einschraenkungen (Mindestabstand Boden UND Mindestabstand
  // Oberkante) gleichzeitig NICHT hinein. Muss dem Nutzer sichtbar gemacht
  // werden statt still einen der beiden Werte zu ignorieren.
  impossible: boolean;
}

// Rundet auf Millimeter (3 Nachkommastellen) - ohne das zeigen Zahlenfelder
// haessliche Fliesskomma-Artefakte wie "1.4349999999999996" an, sobald mit
// Werten wie 0.17/2.53 gerechnet wird (0.1+0.2-Problem).
function roundMm(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// Berechnet den erlaubten Bereich fuer v (Hoehe des Durchbruch-Mittelpunkts
// ueber dem Boden), basierend auf minBottomOffset/minTopMargin des Typs -
// siehe Jonas' Vorgabe 2026-07-22: Tueren muessen mindestens 170mm ueber dem
// Boden beginnen und duerfen hoechstens bis 150mm unter die Containeroberkante
// reichen. Typen ohne diese Felder (Gitter/Kabel/Rohr) sind unbeschraenkt
// (0 bis containerHeight).
export function verticalBounds(typeDef: OpeningTypeDef, openingHeight: number, containerHeight: number): VerticalBounds {
  const min = roundMm((typeDef.minBottomOffset ?? 0) + openingHeight / 2);
  const max = roundMm(containerHeight - (typeDef.minTopMargin ?? 0) - openingHeight / 2);
  return { min, max, impossible: min > max };
}

export function clampVerticalPosition(v: number, bounds: VerticalBounds): number {
  if (bounds.impossible) return v;
  return roundMm(Math.min(Math.max(v, bounds.min), bounds.max));
}
