// Himmelsrichtungen fuer die vier Seitenwaende (Jonas' Vorgabe 2026-07-22:
// Norden ist eine der KLEINEN Stirnflaechen, nicht eine der langen
// Seitenflaechen). Oben/Unten bleiben wie vom Bauherrn benannt, keine
// Himmelsrichtung. Alle sechs zusammen sind jetzt gueltige Ziele fuer
// Durchbrueche - vorher nur die vier Seitenwaende.
export type WallId = "north" | "south" | "east" | "west";
export type PanelId = WallId | "top" | "bottom";

export function isVerticalWall(panel: PanelId): panel is WallId {
  return panel === "north" || panel === "south" || panel === "east" || panel === "west";
}

export type OpeningKind =
  | "door_single_1918"
  | "door_single_2418"
  | "door_double"
  | "vent_weather"
  | "cable"
  | "pipe";

// DIN Links/Rechts (Tuerbandseite) - bestimmt jetzt tatsaechlich sichtbar,
// auf welcher Seite Scharniere sitzen (Tuerblatt-Darstellung, siehe
// DoorLeaf.tsx), nicht mehr nur Metadaten ohne optische Wirkung.
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
  // Nur auf einer der vier Seitenwaende platzierbar, NICHT auf Oben/Unten -
  // "Tueren logischerweise nicht [oben/unten]" (Jonas' Vorgabe 2026-07-22).
  verticalOnly?: boolean;
  // Wird als echtes Tuerblatt (Scharniere + Griff) gerendert statt als
  // reiner offener Ausschnitt - siehe DoorLeaf.tsx.
  isDoor?: boolean;
}

// Ein platzierter Durchbruch. Position ist IMMER der Mittelpunkt des
// Durchbruchs relativ zum jeweiligen Panel: u/v sind die beiden lokalen
// Achsen dieses Panels (fuer Seitenwaende: u = seitlich, v = Hoehe ueber dem
// Boden; fuer Oben/Unten: u/v sind die beiden horizontalen Achsen, siehe
// OpeningsPanel fuer die konkrete Beschriftung je Panel). Bei "round"
// (Rohrdurchführung) ist width der Durchmesser, height wird ignoriert.
export interface Opening {
  id: string;
  kind: OpeningKind;
  panel: PanelId;
  u: number;
  v: number;
  width: number;
  height: number;
  hinge?: DoorHinge;
}
