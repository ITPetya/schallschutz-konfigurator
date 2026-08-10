import { isStorageAllowed } from "./storageConsent";
import type { LengthUnit } from "../utils/lengthUnits";

// Merkt sich die im Messwerkzeug gewaehlten Einheiten (Jonas' Vorgabe
// 2026-08-10: "die eingestellten Sachen sollen im Cache gespeichert
// werden") - gleiche Konvention wie tourStore.ts/ThemeContext.tsx: nur bei
// erteilter Speicher-Einwilligung schreiben, Lesen ist unabhaengig davon
// immer erlaubt (zeigt sonst einfach die eingebaute Vorbelegung).
// Exportiert, damit "Meine Daten löschen" (projectHistoryStore.ts) diesen
// Key mit entfernen kann.
export const UNIT_PREFS_KEY = "ssk_measure_unit_prefs";

export interface UnitPreferences {
  primary: LengthUnit;
  // null = Sekundäreinheit ausgeschaltet.
  secondary: LengthUnit | null;
}

const DEFAULT_PREFS: UnitPreferences = { primary: "mm", secondary: null };

const VALID_UNITS = new Set<LengthUnit>(["mm", "cm", "m", "in", "ft"]);
function isLengthUnit(v: unknown): v is LengthUnit {
  return typeof v === "string" && VALID_UNITS.has(v as LengthUnit);
}

export function loadUnitPreferences(): UnitPreferences {
  const raw = localStorage.getItem(UNIT_PREFS_KEY);
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<UnitPreferences>;
    return {
      primary: isLengthUnit(parsed.primary) ? parsed.primary : DEFAULT_PREFS.primary,
      secondary: isLengthUnit(parsed.secondary) ? parsed.secondary : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveUnitPreferences(prefs: UnitPreferences) {
  if (!isStorageAllowed()) return;
  try {
    localStorage.setItem(UNIT_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Speicher voll/deaktiviert - Einstellung gilt dann nur fuer die
    // laufende Sitzung.
  }
}
