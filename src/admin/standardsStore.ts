import { CONTAINER_SIZE_PRESETS as DEFAULT_PRESETS, type ContainerSizePreset } from "../constants/containerSizes";
import { RAL_STANDARD_COLORS as DEFAULT_RAL_STANDARD, type RalColor } from "../constants/ralColors";
import { OPENING_TYPES } from "../constants/openingTypes";

// Macht alles, was bisher als hartkodierte Konstante angelegt war
// (Standard-Containergroessen, Standard-Tuermasse, Standard-RAL-Farben),
// admin-editierbar (Jonas' Vorgabe 2026-07-22: "alles was ich jetzt schon
// manuell angelegt habe"). Gleiche Einschraenkung wie mockAuthStore/
// mockProjectStore: reines localStorage-Grundgeruest, kein echtes Backend -
// Aenderungen gelten nur in diesem Browser.

const PRESETS_KEY = "ssk_standard_container_sizes";
const RAL_KEY = "ssk_standard_colors";
const DOOR_DIMS_KEY = "ssk_standard_door_dims";

export function getContainerPresets(): ContainerSizePreset[] {
  const raw = localStorage.getItem(PRESETS_KEY);
  if (!raw) return DEFAULT_PRESETS;
  try {
    return JSON.parse(raw) as ContainerSizePreset[];
  } catch {
    return DEFAULT_PRESETS;
  }
}

export function saveContainerPresets(presets: ContainerSizePreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function getStandardColors(): RalColor[] {
  const raw = localStorage.getItem(RAL_KEY);
  if (!raw) return DEFAULT_RAL_STANDARD;
  try {
    return JSON.parse(raw) as RalColor[];
  } catch {
    return DEFAULT_RAL_STANDARD;
  }
}

export function saveStandardColors(colors: RalColor[]) {
  localStorage.setItem(RAL_KEY, JSON.stringify(colors));
}

export interface StandardDoorDims {
  door_single_1918: { width: number; height: number };
  door_single_2418: { width: number; height: number };
  door_double: { width: number; height: number };
}

function defaultDoorDims(): StandardDoorDims {
  return {
    door_single_1918: {
      width: OPENING_TYPES.door_single_1918.fixedWidth!,
      height: OPENING_TYPES.door_single_1918.fixedHeight!,
    },
    door_single_2418: {
      width: OPENING_TYPES.door_single_2418.fixedWidth!,
      height: OPENING_TYPES.door_single_2418.fixedHeight!,
    },
    door_double: {
      width: OPENING_TYPES.door_double.fixedWidth!,
      height: OPENING_TYPES.door_double.fixedHeight!,
    },
  };
}

export function getStandardDoorDims(): StandardDoorDims {
  const raw = localStorage.getItem(DOOR_DIMS_KEY);
  if (!raw) return defaultDoorDims();
  try {
    return JSON.parse(raw) as StandardDoorDims;
  } catch {
    return defaultDoorDims();
  }
}

export function saveStandardDoorDims(dims: StandardDoorDims) {
  localStorage.setItem(DOOR_DIMS_KEY, JSON.stringify(dims));
  applyDoorDimOverrides();
}

// Ueberschreibt OPENING_TYPES' fixedWidth/fixedHeight fuer die drei
// Standardtueren in-place, EINMAL beim App-Start (main.tsx) - einfacher als
// jede Konsumentenstelle (Wall.tsx-CSG, OpeningsPanel, AddOpeningPopup) auf
// eine eigene Getter-Funktion umzustellen, da OPENING_TYPES ohnehin schon
// als gemeinsame Quelle ueberall referenziert wird.
export function applyDoorDimOverrides() {
  const dims = getStandardDoorDims();
  OPENING_TYPES.door_single_1918.fixedWidth = dims.door_single_1918.width;
  OPENING_TYPES.door_single_1918.fixedHeight = dims.door_single_1918.height;
  OPENING_TYPES.door_single_2418.fixedWidth = dims.door_single_2418.width;
  OPENING_TYPES.door_single_2418.fixedHeight = dims.door_single_2418.height;
  OPENING_TYPES.door_double.fixedWidth = dims.door_double.width;
  OPENING_TYPES.door_double.fixedHeight = dims.door_double.height;
}
