import type { PartitionOpening, PartitionOpeningKind } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";

// Reiner State-Typ + Uebergangsfunktionen fuer den "+"-Assistenten einer
// Trennwand (Jonas' Vorgabe 2026-08-14) - gleiches Grundmuster wie
// utils/openingWizard.ts, aber nur 2 statt 3 Schritte (kein Flächen-Schritt,
// die Trennwand ist implizit "diese eine"). PartitionOpeningKind dient hier
// direkt als "Familie" - anders als bei OPENING_FAMILIES gibt es keine
// Standard/Custom-Unterscheidung, die aufgeloest werden muesste.
export interface PartitionOpeningWizardState {
  family: PartitionOpeningKind | null;
  opening: PartitionOpening;
}

function placeholderPartitionOpening(): PartitionOpening {
  return { id: crypto.randomUUID(), kind: "cable", u: 0, v: 0, width: 100, height: 100 };
}

export function createInitialPartitionOpeningWizardState(): PartitionOpeningWizardState {
  return { family: null, opening: placeholderPartitionOpening() };
}

// Familie-Wahl (Schritt 1) - setzt sinnvolle Default-Masse/-Position
// (mittig auf der Trennwand-Spanne/-Höhe), analog zu applyFamilyPick in
// openingWizard.ts.
export function applyPartitionFamilyPick(state: PartitionOpeningWizardState, family: PartitionOpeningKind, containerHeight: number): PartitionOpeningWizardState {
  const typeDef = OPENING_TYPES[family];
  const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 100;
  const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 100;
  return {
    family,
    opening: {
      ...state.opening,
      kind: family,
      u: 0,
      v: Math.round(containerHeight / 2),
      width,
      height,
      side: family === "vent_weather" ? "smooth" : undefined,
    },
  };
}

// Live-Vorschau fuers Viewer-Rendering - null, solange keine Familie gewaehlt
// ist, sonst der aktuelle (ggf. per Maße-Feldern weiter gepatchte) Durchbruch.
export function buildPartitionOpeningDraft(state: PartitionOpeningWizardState): PartitionOpening | null {
  if (!state.family) return null;
  return state.opening;
}
