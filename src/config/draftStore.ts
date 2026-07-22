import type { ContainerConfig } from "./types";

// Automatische Zwischensicherung (Jonas' Vorgabe 2026-07-23: "die aktuelle
// Konfiguration soll im Cache oder so gespeichert sein, damit falls
// irgendwas abstuerzt immer ein Zwischenstand noch da ist") - rein
// localStorage, komplett unabhaengig vom manuellen Speichern/Anfragen als
// Datei. Wird nur im editierbaren Konfigurator genutzt, NICHT im
// schreibgeschuetzten internen Viewer.
const DRAFT_KEY = "ssk_draft_config";

export function saveDraft(config: ContainerConfig) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
  } catch {
    // localStorage kann voll oder deaktiviert sein - Autosave ist ein
    // Sicherheitsnetz, kein kritischer Pfad, deshalb hier bewusst still.
  }
}

export function loadDraft(): ContainerConfig | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContainerConfig;
  } catch {
    return null;
  }
}
