// Eine der vier Seitenwaende - Dach/Boden sind fuer diese erste Ausbaustufe
// bewusst OHNE Durchbrueche (siehe Projektbrief: "Wände als separate
// Flächen, damit Durchbrüche pro Wand platziert werden können").
export type WallId = "front" | "back" | "left" | "right";

export type OpeningKind = "door" | "vent" | "cable" | "pipe";

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
}
