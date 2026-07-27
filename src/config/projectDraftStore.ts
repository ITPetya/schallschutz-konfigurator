import type { ProjectConfig } from "./projectTypes";

// Automatische Zwischensicherung fuer Baugruppen-Projekte (Jonas' Vorgabe
// 2026-07-23: "die aktuelle Konfiguration soll im Cache oder so gespeichert
// sein, damit falls irgendwas abstuerzt immer ein Zwischenstand noch da
// ist") - rein localStorage, komplett unabhaengig vom manuellen
// Speichern/Anfragen als Datei.
const PROJECT_DRAFT_KEY = "ssk_project_draft";

export function saveProjectDraft(project: ProjectConfig) {
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
