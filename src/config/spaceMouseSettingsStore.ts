import { isStorageAllowed } from "./storageConsent";

// Merkt sich die im SpaceMouse-Einstellungen-Panel gewaehlte Empfindlichkeit
// (Jonas' Vorgabe 2026-08-12: "man soll die Empfindlichkeit einstellen
// können") - gleiche Konvention wie unitPreferencesStore.ts: nur bei
// erteilter Speicher-Einwilligung schreiben, Lesen ist unabhaengig davon
// immer erlaubt (zeigt sonst einfach die eingebaute Vorbelegung).
// Exportiert, damit "Meine Daten löschen" (projectHistoryStore.ts) diesen
// Key mit entfernen kann.
export const SPACEMOUSE_SENSITIVITY_KEY = "ssk_spacemouse_sensitivity";

export const DEFAULT_SPACEMOUSE_SENSITIVITY = 1;
export const MIN_SPACEMOUSE_SENSITIVITY = 0.3;
export const MAX_SPACEMOUSE_SENSITIVITY = 3;

function clamp(value: number): number {
  return Math.min(MAX_SPACEMOUSE_SENSITIVITY, Math.max(MIN_SPACEMOUSE_SENSITIVITY, value));
}

export function loadSpaceMouseSensitivity(): number {
  const raw = localStorage.getItem(SPACEMOUSE_SENSITIVITY_KEY);
  if (!raw) return DEFAULT_SPACEMOUSE_SENSITIVITY;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed) : DEFAULT_SPACEMOUSE_SENSITIVITY;
}

export function saveSpaceMouseSensitivity(value: number) {
  if (!isStorageAllowed()) return;
  try {
    localStorage.setItem(SPACEMOUSE_SENSITIVITY_KEY, String(clamp(value)));
  } catch {
    // Speicher voll/deaktiviert - Einstellung gilt dann nur fuer die
    // laufende Sitzung.
  }
}
