// Grenzwerte aus "Der LC Systems Standard für Container" (PDF, Stand
// 2026-08-10) - alle Masse in MILLIMETERN, konsistent mit dem Rest des
// Datenmodells (siehe containerSizes.ts). Dient als zentrale Quelle fuer
// die Sondermass-/Uebermass-Warnungen in ContainerSizeControls.tsx.

// "Länge von 1,00 - 18,00m / Breite von 1,00 - 4,50m / Höhe von 1,00 -
// 3,70m ... Optional weitere Sondermaße auf Anfrage" - Werte AUSSERHALB
// dieser Spannen sind kein Standardprodukt mehr, aber laut PDF trotzdem
// bestellbar ("auf Anfrage") - deshalb nur Warnung/Bestaetigung, kein
// hartes Blockieren (Jonas' Vorgabe 2026-08-10).
export const LC_DIMENSION_LIMITS = {
  length: { min: 1000, max: 18000 },
  width: { min: 1000, max: 4500 },
  height: { min: 1000, max: 3700 },
};

// "LC-C-Schienensystem ... RPI3 Steinwoll-Isolierung ... t=100mm" -
// Standard-Wandstaerke fuer Wand UND Dach, siehe DEFAULT_WALL_THICKNESS in
// containerSizes.ts. Jede Abweichung ist Sonderausstattung (Jonas' Vorgabe
// 2026-08-10: "Wandstärken sind 100 Standard, alles andere auch Sonder").
export const LC_STANDARD_WALL_THICKNESS = 100;

// "Boden: ... Optional mit Bodenisolierung t=100-120mm" - anders als bei
// Wand/Dach ist beim Boden KEINE Isolierung im Grundprodukt enthalten
// (Jonas' Vorgabe 2026-08-10: eigenes, von der Wandstärke getrenntes Feld).
// 0 = keine Bodenisolierung (Standard/im Grundpreis), 100-120 = die
// angebotene Optional-Spanne.
export const LC_FLOOR_INSULATION_RANGE = { min: 100, max: 120 };

export type SoundClass = "standard" | "schallschutz" | "silent" | "silentPlus";

export interface SoundClassSpec {
  id: SoundClass;
  label: string;
  rangeLabel: string;
  // "Ab Silent ist eine Mindestdicke der Wandstärke von 100 zwingend
  // erforderlich" (Jonas' Vorgabe 2026-08-10) - fuer alle anderen Klassen
  // ist 100mm nur eine unverbindliche Richtdicke, siehe minWallThicknessHint.
  minWallThicknessRequired?: number;
}

// "Es gibt folgende Auswahlen: Standard (34-36 dB), Schallschutz (42-45
// dB), Silent (45-47 dB), Silent-Plus (49-52 dB)" (Jonas' Vorgabe
// 2026-08-10, ergaenzt die im PDF nur grob skizzierten zwei Stufen
// "bewertet 42-45 dB / optional bis 52 dB").
export const SOUND_CLASSES: SoundClassSpec[] = [
  { id: "standard", label: "Standard", rangeLabel: "R'w 34–36 dB" },
  { id: "schallschutz", label: "Schallschutz", rangeLabel: "R'w 42–45 dB" },
  { id: "silent", label: "Silent", rangeLabel: "R'w 45–47 dB", minWallThicknessRequired: 100 },
  { id: "silentPlus", label: "Silent-Plus", rangeLabel: "R'w 49–52 dB", minWallThicknessRequired: 100 },
];

export const DEFAULT_SOUND_CLASS: SoundClass = "standard";

// "für alle Schallangaben ist 100mm als Richtdicke nötig, ansonsten kann
// es sein, dass die Schallschutzklasse nicht erreicht wird" (Jonas' Vorgabe
// 2026-08-10) - unverbindliche Empfehlung fuer Standard/Schallschutz, im
// Unterschied zur zwingenden Vorgabe ab Silent (minWallThicknessRequired).
export const LC_SOUND_WALL_THICKNESS_HINT = 100;
