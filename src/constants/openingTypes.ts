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

export const OPENING_TYPES: Record<OpeningKind, OpeningTypeDef> = {
  door: {
    kind: "door",
    label: "Standardtür",
    category: "standard",
    shape: "rect",
    fixedWidth: 0.9,
    fixedHeight: 2.0,
    minSize: 0,
    maxSize: 0,
  },
  vent: {
    kind: "vent",
    label: "Standardlüftungsgitter",
    category: "standard",
    shape: "rect",
    fixedWidth: 0.3,
    fixedHeight: 0.3,
    minSize: 0,
    maxSize: 0,
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
