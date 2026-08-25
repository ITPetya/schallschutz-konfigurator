import { isStorageAllowed } from "./storageConsent";
import { safeGetItem, safeSetItem } from "../utils/safeLocalStorage";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";

// Jonas' Fehlerbericht 2026-08-14: "die Ansichts-Einstellungen werden immer
// mit dem Container gespeichert... ich möchte das Ansichtseinstellungen
// sollen eher pro user gespeichert werde, also mit im cache" - Stil/
// Hintergrund/Schatten/Gelände-Detailstufe sind reine Betrachtungs-
// einstellungen, keine Produkteigenschaft, und sollen deshalb NICHT mehr
// Teil von ContainerConfig/der gespeicherten Datei sein, sondern eine reine
// Browser-Praeferenz - exakt dasselbe Muster wie unitPreferencesStore.ts
// (Mess-Einheiten) und spaceMouseSettingsStore.ts (SpaceMouse-Empfindlichkeit).
export const VIEW_PREFS_KEY = "ssk_view_prefs";

export interface ViewPreferences {
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  shadowsEnabled: boolean;
  terrainDetail: TerrainDetail;
}

const DEFAULT_VIEW_PREFS: ViewPreferences = {
  viewStyle: "realistic",
  background: "studio",
  shadowsEnabled: true,
  terrainDetail: "low",
};

const VALID_VIEW_STYLES = new Set<ViewStyle>(["realistic", "shaded_edges"]);
const VALID_BACKGROUNDS = new Set<BackgroundStyle>(["studio", "terrain"]);
const VALID_TERRAIN_DETAILS = new Set<TerrainDetail>(["low", "medium", "high", "ultra"]);

function isViewStyle(v: unknown): v is ViewStyle {
  return typeof v === "string" && VALID_VIEW_STYLES.has(v as ViewStyle);
}
function isBackgroundStyle(v: unknown): v is BackgroundStyle {
  return typeof v === "string" && VALID_BACKGROUNDS.has(v as BackgroundStyle);
}
function isTerrainDetail(v: unknown): v is TerrainDetail {
  return typeof v === "string" && VALID_TERRAIN_DETAILS.has(v as TerrainDetail);
}

export function loadViewPreferences(): ViewPreferences {
  const raw = safeGetItem(VIEW_PREFS_KEY);
  if (!raw) return DEFAULT_VIEW_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<ViewPreferences>;
    return {
      viewStyle: isViewStyle(parsed.viewStyle) ? parsed.viewStyle : DEFAULT_VIEW_PREFS.viewStyle,
      background: isBackgroundStyle(parsed.background) ? parsed.background : DEFAULT_VIEW_PREFS.background,
      shadowsEnabled: typeof parsed.shadowsEnabled === "boolean" ? parsed.shadowsEnabled : DEFAULT_VIEW_PREFS.shadowsEnabled,
      terrainDetail: isTerrainDetail(parsed.terrainDetail) ? parsed.terrainDetail : DEFAULT_VIEW_PREFS.terrainDetail,
    };
  } catch {
    return DEFAULT_VIEW_PREFS;
  }
}

export function saveViewPreferences(prefs: ViewPreferences) {
  if (!isStorageAllowed()) return;
  safeSetItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
}
