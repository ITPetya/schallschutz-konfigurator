import type { OpeningKind, OpeningTypeDef, WallId } from "../types/openings";

// Wandstaerke des Sondercontainers - deutlich dicker als ein normaler
// Seecontainer (~2mm Stahlblech), weil es ein SCHALLSCHUTZ-Container ist
// (gedaemmtes Paneel). Reiner Platzhalterwert fuer diese Ausbaustufe.
export const WALL_THICKNESS = 0.1;

export const WALL_LABELS: Record<WallId, string> = {
  front: "Vorne",
  back: "Hinten",
  left: "Links",
  right: "Rechts",
};

// Alle Masse in Metern. Tuer-Masse (2026-07-22, Jonas' Vorgabe) sind LICHTE
// Durchgangsmasse (fertige nutzbare Oeffnung) - der tatsaechliche Wandausschnitt
// muesste in Wirklichkeit etwas groesser sein (Zargenzuschlag), das ist hier
// noch NICHT beruecksichtigt (kein Zuschlagswert vorgegeben) - siehe README.
export const OPENING_TYPES: Record<OpeningKind, OpeningTypeDef> = {
  door_single_1918: {
    kind: "door_single_1918",
    label: "Einzeltür 904 × 1918",
    category: "standard",
    shape: "rect",
    fixedWidth: 0.904,
    fixedHeight: 1.918,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 0.17,
    minTopMargin: 0.15,
    hasHinge: true,
  },
  door_single_2418: {
    kind: "door_single_2418",
    label: "Einzeltür 904 × 2418",
    category: "standard",
    shape: "rect",
    fixedWidth: 0.904,
    fixedHeight: 2.418,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 0.17,
    minTopMargin: 0.15,
    hasHinge: true,
  },
  door_double: {
    kind: "door_double",
    label: "Doppelflügeltür 2234 × 2530",
    category: "standard",
    shape: "rect",
    fixedWidth: 2.234,
    fixedHeight: 2.53,
    minSize: 0,
    maxSize: 0,
    minBottomOffset: 0.17,
    minTopMargin: 0.15,
  },
  vent_weather: {
    kind: "vent_weather",
    label: "Wetterschutzgitter 411 × 411",
    category: "standard",
    shape: "rect",
    fixedWidth: 0.411,
    fixedHeight: 0.411,
    minSize: 0,
    maxSize: 0,
    protrusionDepth: 0.012,
  },
  cable: {
    kind: "cable",
    label: "Kabeldurchführung",
    category: "free",
    shape: "rect",
    defaultWidth: 0.1,
    defaultHeight: 0.1,
    minSize: 0.03,
    maxSize: 0.4,
  },
  pipe: {
    kind: "pipe",
    label: "Rohrdurchführung",
    category: "free",
    shape: "round",
    defaultWidth: 0.1,
    defaultHeight: 0.1,
    minSize: 0.05,
    maxSize: 0.5,
  },
};
