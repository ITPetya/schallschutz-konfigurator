import type { ProjectConfig } from "./projectTypes";
import { isStorageAllowed } from "./storageConsent";

// Automatische Zwischensicherung fuer Baugruppen-Projekte (Jonas' Vorgabe
// 2026-07-23: "die aktuelle Konfiguration soll im Cache oder so gespeichert
// sein, damit falls irgendwas abstuerzt immer ein Zwischenstand noch da
// ist") - rein localStorage, komplett unabhaengig vom manuellen
// Speichern/Anfragen als Datei. Respektiert die Speicher-Einwilligung (siehe
// storageConsent.ts) - bei explizitem "Nein" wird ueberhaupt nicht mehr
// geschrieben.
const PROJECT_DRAFT_KEY = "ssk_project_draft";

export function saveProjectDraft(project: ProjectConfig) {
  if (!isStorageAllowed()) return;
  try {
    localStorage.setItem(PROJECT_DRAFT_KEY, JSON.stringify(project));
  } catch {
    // localStorage kann voll oder deaktiviert sein - Autosave ist ein
    // Sicherheitsnetz, kein kritischer Pfad, deshalb hier bewusst still.
  }
}

export function loadProjectDraft(): ProjectConfig | null {
  const raw = localStorage.getItem(PROJECT_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectConfig;
  } catch {
    return null;
  }
}

// Ein Cache gilt nur dann als "vorhanden" (z. B. fuer die "Aus Cache
// laden"-Option auf der Startseite), wenn er tatsaechlich mindestens einen
// Container enthaelt - ein frisch angelegtes, noch leeres Projekt zaehlt
// nicht als sinnvoller Zwischenstand.
export function hasMeaningfulProjectDraft(): boolean {
  const draft = loadProjectDraft();
  return !!draft && draft.instances.length > 0;
}

export function clearProjectDraft() {
  try {
    localStorage.removeItem(PROJECT_DRAFT_KEY);
  } catch {
    // s.o.
  }
}
