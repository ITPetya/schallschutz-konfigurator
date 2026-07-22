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

// Rundet auf 1/100 mm - ohne das zeigen Zahlenfelder haessliche Fliesskomma-
// Artefakte an, sobald z. B. eine ungerade Hoehe durch 2 geteilt wird.
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Berechnet den erlaubten Bereich fuer v, basierend auf minBottomOffset/
// minTopMargin des Typs (Jonas' Vorgabe 2026-07-22: Tueren mindestens 170mm
// ueber dem Boden, hoechstens bis 150mm unter die Containeroberkante).
// WICHTIG: bei Tueren (isDoor) ist v die UNTERKANTE, bei allen anderen
// Durchbruchsarten die ACHSE/Mitte (Jonas' Vorgabe 2026-07-22, zweite
// Praezisierung) - deshalb zwei unterschiedliche Formeln. Typen ohne
// minBottomOffset/minTopMargin (Gitter/Kabel/Rohr) sind unbeschraenkt
// (0 bis containerHeight, ueber den Achse-Zweig).
export function verticalBounds(typeDef: OpeningTypeDef, openingHeight: number, containerHeight: number): VerticalBounds {
  if (typeDef.isDoor) {
    const min = round(typeDef.minBottomOffset ?? 0);
    const max = round(containerHeight - (typeDef.minTopMargin ?? 0) - openingHeight);
    return { min, max, impossible: min > max };
  }
  const min = round((typeDef.minBottomOffset ?? 0) + openingHeight / 2);
  const max = round(containerHeight - (typeDef.minTopMargin ?? 0) - openingHeight / 2);
  return { min, max, impossible: min > max };
}

export function clampVerticalPosition(v: number, bounds: VerticalBounds): number {
  if (bounds.impossible) return v;
  return round(Math.min(Math.max(v, bounds.min), bounds.max));
}
