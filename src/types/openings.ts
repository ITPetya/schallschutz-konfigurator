// Eine der vier Seitenwaende - Dach/Boden sind fuer diese erste Ausbaustufe
// bewusst OHNE Durchbrueche (siehe Projektbrief: "Wände als separate
// Flächen, damit Durchbrüche pro Wand platziert werden können").
export type WallId = "front" | "back" | "left" | "right";

export type OpeningKind =
  | "door_single_1918"
  | "door_single_2418"
  | "door_double"
  | "vent_weather"
  | "cable"
  | "pipe";

// DIN Links/Rechts (Tuerbandseite) - betrifft aktuell NUR die Kennzeichnung,
// da diese Ausbaustufe nur den Wandausschnitt modelliert, kein Tuerblatt mit
// Anschlagsrichtung. Bewusst trotzdem als eigenes Feld erfasst (nicht als
// separate "kind"-Variante verdoppelt), weil die Ausschnittsgeometrie fuer
// Links/Rechts identisch ist - nur die Metadaten unterscheiden sich.
export type DoorHinge = "left" | "right";

export interface OpeningTypeDef {
  kind: OpeningKind;
  label: string;
  category: "standard" | "free";
  shape: "rect" | "round";
  fixedWidth?: number;
  fixedHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  minSize: number;
  maxSize: number;
  // Nur fuer Tueren gesetzt (Jonas' Vorgabe 2026-07-22): Mindestabstand der
  // Unterkante vom Boden bzw. Mindestabstand der Oberkante von der
  // Containeroberkante. Andere Durchbruchsarten (Gitter/Kabel/Rohr) haben
  // diese Felder nicht gesetzt = keine Einschraenkung.
  minBottomOffset?: number;
  minTopMargin?: number;
  // Nur fuer das Wetterschutzgitter gesetzt: baut so viel (in Metern) ueber
  // die AUSSENseite der Wand hinaus auf (zusaetzlich zum Ausschnitt selbst).
  protrusionDepth?: number;
  // Braucht dieser Typ eine DIN-Links/Rechts-Auswahl (nur Einzeltueren)?
  hasHinge?: boolean;
}

// Ein platzierter Durchbruch. Position ist IMMER der Mittelpunkt des
// Durchbruchs relativ zur jeweiligen Wand: u = horizontaler Versatz von der
// Wandmitte (Meter, negativ = nach links), v = Hoehe des Mittelpunkts ueber
// dem Boden (Meter). Bei "round" (Rohrdurchführung) ist width der
// Durchmesser, height wird ignoriert.
export interface Opening {
  id: string;
  kind: OpeningKind;
  wall: WallId;
  u: number;
  v: number;
  width: number;
  height: number;
  hinge?: DoorHinge;
}
