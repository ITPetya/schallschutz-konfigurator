import type { Opening } from "./openings";

// Kabel-/Rohrdurchführung und Wetterschutzgitter sind fuer die Trennwand
// erlaubt (Jonas' Vorgabe 2026-08-14), Tueren laufen separat ueber
// PartitionDoor (feste 932x1932mm, siehe unten) statt ueber diese Liste.
export type PartitionOpeningKind = "vent_weather" | "cable" | "pipe";

// Nur fuers Wetterschutzgitter relevant: auf welcher Seite der Trennwand das
// Gitter baut (protrusionDepth) bzw. wohin die Lamellen kippen - "smooth"
// (glatte Seite) / "railed" (C-Schienen-Seite), unabhaengig vom
// PartitionWallConfig.smoothSide-Spiegelzustand der ganzen Wand (Jonas'
// Vorgabe: "frei auswählbar auf welcher Seite"). Wird in PartitionWall.tsx
// zusammen mit smoothSide in ein konkretes Opening.protrusionSign (Wall.tsx)
// aufgeloest - dadurch "dreht" die Lamellenrichtung automatisch mit, wenn die
// Wand gespiegelt wird, ohne dass side selbst geaendert werden muss.
export type PartitionSide = "smooth" | "railed";

// Gleiche Mass-/Bezugspunkt-Konventionen wie Opening (types/openings.ts): alle
// Masse in Millimetern, u = horizontaler Versatz von der Wandmitte, v = Achse/
// Mitte ueber dem Boden (Wetterschutzgitter/Kabel/Rohr haben nie isDoor,
// nutzen also immer den Mitte-Bezug).
export interface PartitionOpening {
  id: string;
  kind: PartitionOpeningKind;
  u: number;
  v: number;
  width: number;
  height: number;
  side?: PartitionSide;
}

// Feste 932x1932mm (Jonas' Vorgabe 2026-08-14), nur die Position ist
// einstellbar - keine Bandseiten-Auswahl (siehe openingTypes.ts's
// partition_door: hasHinge:false), die Bandseite wird immer aus
// PartitionWallConfig.smoothSide hergeleitet ("immer DIN rechts von der
// glatten Seite aus gesehen"), nie gespeichert - sonst wuerde sie beim
// Spiegeln der Wand stehen bleiben statt automatisch mitzudrehen.
export interface PartitionDoor {
  u: number;
}

// Eine einzelne Trennwand (Jonas' Vorgabe 2026-08-14: "Trennwände" im Plural
// moeglich - eine Wand teilt in zwei Räume, mehrere in entsprechend mehr).
// Trennt IMMER die Laenge (nie Breite/Hoehe) - liegt quer im Container, siehe
// PartitionWall.tsx fuer die Geometrie.
export interface PartitionWallConfig {
  id: string;
  // mm-Versatz von der Container-Mitte entlang der Laengsachse.
  positionU: number;
  // Eigene, von der Aussenwandstaerke unabhaengige Dicke (mm).
  thickness: number;
  // Spiegel-Zustand: "front" = die glatte Seite zeigt zur Vorderwand hin, "back"
  // = zur Hinterwand hin (wiederverwendet dieselbe front/back-Konvention wie
  // die Aussenwaende, siehe Container.tsx). Bestimmt, welche Seite die
  // C-Schienen-Verkleidung bekommt UND (zusammen mit smoothSide) die
  // tatsaechliche Bandseite der Tuer.
  smoothSide: "front" | "back";
  openings: PartitionOpening[];
  door?: PartitionDoor;
}

// Zwischenzustand waehrend des Anlegens im "Einbauten hinzufügen"-Assistenten
// (Jonas' Vorgabe 2026-08-14) - bewusst NUR die drei Felder, die er beim
// Anlegen nannte (Position/Wandstärke/Tür ja-nein). smoothSide/Durchbrüche
// kommen erst im Drill-in-Editor dazu (siehe PartitionWallSettings.tsx),
// analog zum bestehenden Muster "schnell anlegen, im Detail verfeinern".
export interface PartitionWallCreateDraft {
  positionU: number;
  thickness: number;
  hasDoor: boolean;
}

// Wandelt einen Trennwand-Durchbruch in die von Wall.tsx erwartete Opening-
// Form um. panel wird nie von Wall.tsx gelesen (rein interne CSG-Ausschnitt-
// Logik dort kennt keine Panel-Identitaet) - "front" ist hier ein reiner
// Platzhalter, um den Typ zu erfuellen.
export function partitionOpeningToWallOpening(o: PartitionOpening, protrusionSign?: 1 | -1): Opening {
  return {
    id: o.id,
    kind: o.kind,
    panel: "front",
    u: o.u,
    v: o.v,
    width: o.width,
    height: o.height,
    protrusionSign,
  };
}
