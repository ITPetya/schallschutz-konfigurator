// Alle Masse in Millimetern (Jonas' Vorgabe 2026-07-22: "alle Maße sollen
// immer in mm angegeben werden") - das gilt durchgehend fuer den gesamten
// Datenmodell-/UI-Layer, nur die 3D-Rendering-Komponenten (Container/Wall/
// DoorLeaf/Scene) rechnen das intern einmalig auf Meter um (Three.js-
// Konvention), siehe Container.tsx.
export interface ContainerSize {
  length: number;
  width: number;
  height: number;
}

export interface ContainerSizePreset extends ContainerSize {
  label: string;
}

// Container-Aussenmasse sind jetzt frei editierbar (Jonas' Vorgabe
// 2026-07-22) - diese drei sind nur noch Vorschlaege zum schnellen
// Uebernehmen, keine feste Auswahlliste mehr.
export const CONTAINER_SIZE_PRESETS: ContainerSizePreset[] = [
  { label: "7000 × 2990 × 2990", length: 7000, width: 2990, height: 2990 },
  { label: "9600 × 2990 × 2990", length: 9600, width: 2990, height: 2990 },
  { label: "12000 × 2990 × 2990", length: 12000, width: 2990, height: 2990 },
];

export const DEFAULT_CONTAINER_SIZE: ContainerSize = { ...CONTAINER_SIZE_PRESETS[0] };

// Wandstaerke ist jetzt ebenfalls frei einstellbar (Jonas' Vorgabe
// 2026-07-22), Standardwert bleibt 100mm.
export const DEFAULT_WALL_THICKNESS = 100;
