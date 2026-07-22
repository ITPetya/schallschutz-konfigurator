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
  | "door_custom_single"
  | "door_custom_double"
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
  // Fuer "frei"-Typen mit UNTERSCHIEDLICHEM Breiten-/Hoehen-Bereich (z. B.
  // Tueren nach Mass) - wenn gesetzt, haben Vorrang vor minSize/maxSize.
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  // Fallback fuer "frei"-Typen mit EINEM gemeinsamen Bereich fuer beide
  // Achsen (Kabel-/Rohrdurchführung - Breite/Hoehe bzw. Durchmesser).
  minSize: number;
  maxSize: number;
  // Nur fuer Tueren gesetzt (Jonas' Vorgabe 2026-07-22): Mindestabstand der
  // Unterkante vom Boden bzw. Mindestabstand der Oberkante von der
  // Containeroberkante. Andere Durchbruchsarten (Gitter/Kabel/Rohr) haben
  // diese Felder nicht gesetzt = keine Einschraenkung.
  minBottomOffset?: number;
  minTopMargin?: number;
  // Nur fuer das Wetterschutzgitter gesetzt: baut so viel (in mm) ueber die
  // AUSSENseite der Wand hinaus auf (zusaetzlich zum Ausschnitt selbst).
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

// Ein platzierter Durchbruch, alle Masse in Millimetern. u ist IMMER der
// horizontale Versatz von der Panel-Mitte. v ist bei Tueren (isDoor) die
// Hoehe der UNTERKANTE ueber dem Boden, bei allen anderen Durchbruchsarten
// die Hoehe der ACHSE/Mitte ueber dem Boden (Jonas' Vorgabe 2026-07-22 - vor
// dieser Aenderung war v ueberall einheitlich die Mitte). Bei "round"
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
