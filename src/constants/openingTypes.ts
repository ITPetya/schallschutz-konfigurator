import type { OpeningKind, OpeningTypeDef, PanelId } from "../types/openings";

// Jonas' Vorgabe 2026-08-11 ("Bauteile frei verstellbar"): jedes Bauteil
// soll frei in seinen Massen verstellbar sein, genau wie der Container -
// das bisherige Datenmodell erlaubte das nur fuer "free"-Typen (minSize/
// maxSize bzw. minWidth/maxWidth waren fuer "standard"-Typen 0/0). Hier ein
// gemeinsamer, grosszuegiger Bereich fuer alle Standardtueren (identisch zu
// den bereits bestehenden Bereichen der freien Pendants
// door_custom_single/door_custom_double) und fuers Wetterschutzgitter -
// siehe OPENING_TYPES unten, wo diese Konstanten jetzt auch bei den
// "standard"-Eintraegen als minWidth/maxWidth/minHeight/maxHeight
// verwendet werden.
const SINGLE_DOOR_RANGE = { minWidth: 700, maxWidth: 1200, minHeight: 1900, maxHeight: 2600 };
const DOUBLE_DOOR_RANGE = { minWidth: 1600, maxWidth: 3200, minHeight: 1900, maxHeight: 2700 };
const VENT_RANGE = { minWidth: 200, maxWidth: 1000, minHeight: 200, maxHeight: 1000 };

// Relative Richtungen statt Himmelsrichtungen (Jonas' Fehlerbericht
// 2026-07-23, siehe types/openings.ts) + Oben/Unten unveraendert. Alle
// sechs sind gueltige Durchbruch-Ziele.
export const PANEL_LABELS: Record<PanelId, string> = {
  front: "Vorne",
  back: "Hinten",
  left: "Links",
  right: "Rechts",
  top: "Oben",
  bottom: "Unten",
};

// Alle Masse in MILLIMETERN (Jonas' Vorgabe 2026-07-22). Tuer-Masse der
// Standardtueren sind LICHTE Durchgangsmasse (fertige nutzbare Oeffnung) -
// der tatsaechliche Wandausschnitt muesste in Wirklichkeit etwas groesser
// sein (Zargenzuschlag), das ist hier noch NICHT beruecksichtigt (kein
// Zuschlagswert vorgegeben) - siehe README.
export const OPENING_TYPES: Record<OpeningKind, OpeningTypeDef> = {
  door_single_1918: {
    kind: "door_single_1918",
    label: "Einzeltür 904 × 1918",
    category: "standard",
    shape: "rect",
    fixedWidth: 904,
    fixedHeight: 1918,
    // Jonas' Vorgabe 2026-08-11: auch "standard"-Tueren sind jetzt frei
    // verstellbar (siehe OpeningsPanel.tsx) - minWidth/maxWidth/minHeight/
    // maxHeight geben dafuer denselben Bereich wie der freie Pendant-Typ
    // (door_custom_single) vor, fixedWidth/fixedHeight bleiben als
    // Ausgangswert beim Anlegen erhalten.
    ...SINGLE_DOOR_RANGE,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 170,
    minTopMargin: 150,
    hasHinge: true,
    verticalOnly: true,
    isDoor: true,
  },
  door_single_2418: {
    kind: "door_single_2418",
    label: "Einzeltür 904 × 2418",
    category: "standard",
    shape: "rect",
    fixedWidth: 904,
    fixedHeight: 2418,
    ...SINGLE_DOOR_RANGE,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 170,
    minTopMargin: 150,
    hasHinge: true,
    verticalOnly: true,
    isDoor: true,
  },
  door_double: {
    kind: "door_double",
    label: "Doppelflügeltür 2234 × 2530",
    category: "standard",
    shape: "rect",
    fixedWidth: 2234,
    fixedHeight: 2530,
    ...DOUBLE_DOOR_RANGE,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 170,
    minTopMargin: 150,
    verticalOnly: true,
    isDoor: true,
  },
  door_custom_single: {
    kind: "door_custom_single",
    label: "Einzeltür (frei nach Maß)",
    category: "free",
    shape: "rect",
    defaultWidth: 904,
    defaultHeight: 1918,
    minWidth: 700,
    maxWidth: 1200,
    minHeight: 1900,
    maxHeight: 2600,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 170,
    minTopMargin: 150,
    hasHinge: true,
    verticalOnly: true,
    isDoor: true,
  },
  door_custom_double: {
    kind: "door_custom_double",
    label: "Doppelflügeltür (frei nach Maß)",
    category: "free",
    shape: "rect",
    defaultWidth: 2234,
    defaultHeight: 2530,
    minWidth: 1600,
    maxWidth: 3200,
    minHeight: 1900,
    maxHeight: 2700,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 170,
    minTopMargin: 150,
    verticalOnly: true,
    isDoor: true,
  },
  vent_weather: {
    kind: "vent_weather",
    label: "Wetterschutzgitter 411 × 411",
    category: "standard",
    shape: "rect",
    fixedWidth: 411,
    fixedHeight: 411,
    ...VENT_RANGE,
    minSize: 0,
    maxSize: 0,
    protrusionDepth: 12,
    // Jonas' Fehlerbericht 2026-07-25: "keine Wetterschutzgitter auf dem Dach".
    excludedPanels: ["top"],
  },
  cable: {
    kind: "cable",
    label: "Kabeldurchführung",
    category: "free",
    shape: "rect",
    defaultWidth: 100,
    defaultHeight: 100,
    minSize: 30,
    maxSize: 400,
  },
  pipe: {
    kind: "pipe",
    label: "Rohrdurchführung",
    category: "free",
    shape: "round",
    defaultWidth: 100,
    defaultHeight: 100,
    minSize: 50,
    maxSize: 500,
  },
};

export interface OpeningSizePreset {
  label: string;
  width: number;
  height: number;
}

// Jonas' Vorgabe 2026-08-11: kleines "Standardmaße…"-Dropdown pro Bauteil
// als reine Schnellauswahl-Vorlage (mirror von ContainerSizeControls.tsx's
// "Vorlage…"-Dropdown) - fuellt nur die freien Breite/Höhe-Felder vor, KEIN
// separater "Standard vs. frei"-Modus. Bewusst nach TUER-FAMILIE gruppiert
// (nicht nach dem konkreten OpeningKind): eine Einzeltür (ob urspruenglich
// als "Einzeltür 904×1918" oder "frei nach Maß" angelegt) kann zwischen
// BEIDEN bekannten Einzeltür-Standardmassen wechseln, eine Doppelflügeltür
// nur zwischen den Doppelflügel-Massen (unterschiedliche Anzahl Fluegel/
// Scharnierlogik, siehe hasHinge in types/openings.ts) - Kabel-/
// Rohrdurchführungen haben keine Standardmasse, deshalb kein Eintrag.
export const OPENING_SIZE_PRESETS: Partial<Record<OpeningKind, OpeningSizePreset[]>> = {
  door_single_1918: [
    { label: "904 × 1918 mm", width: 904, height: 1918 },
    { label: "904 × 2418 mm", width: 904, height: 2418 },
  ],
  door_single_2418: [
    { label: "904 × 1918 mm", width: 904, height: 1918 },
    { label: "904 × 2418 mm", width: 904, height: 2418 },
  ],
  door_custom_single: [
    { label: "904 × 1918 mm", width: 904, height: 1918 },
    { label: "904 × 2418 mm", width: 904, height: 2418 },
  ],
  door_double: [{ label: "2234 × 2530 mm", width: 2234, height: 2530 }],
  door_custom_double: [{ label: "2234 × 2530 mm", width: 2234, height: 2530 }],
  vent_weather: [{ label: "411 × 411 mm", width: 411, height: 411 }],
};

// Alle bekannten Standard-Tuermasse als flache Liste (Jonas' Vorgabe
// 2026-08-11): "Sonder" ist jetzt WERTBASIERT definiert - eine Tür ist eine
// Sondertür, wenn ihre AKTUELLEN Masse KEINEM bekannten Standardmass
// entsprechen, unabhaengig davon, mit welchem OpeningKind ("Einzeltür
// 904×1918" oder "frei nach Maß") sie urspruenglich angelegt wurde -
// dieselbe Logik wie getDimensionWarning() beim Container (siehe
// containerWarnings.ts's isSonderDoor).
export const STANDARD_DOOR_SIZES: { width: number; height: number }[] = [
  { width: 904, height: 1918 },
  { width: 904, height: 2418 },
  { width: 2234, height: 2530 },
];
