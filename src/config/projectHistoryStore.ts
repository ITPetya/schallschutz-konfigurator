import type { ProjectConfig } from "./projectTypes";
import { isStorageAllowed } from "./storageConsent";
import { THEME_KEY } from "../context/ThemeContext";
import { SEEN_KEY } from "../tour/tourStore";
import { UNIT_PREFS_KEY } from "./unitPreferencesStore";

// Verlauf mehrerer zuletzt offener Projekte (Jonas' Vorgabe 2026-07-28: "man
// sollte mehrere Container/Projekte auch im local storage gespeichert haben
// ... immer so 10 Stände insgesamt von unterschiedlichen Projekten aber was
// man halt offen hatte") - Nachfolger von projectDraftStore.ts, das nur EINEN
// einzigen globalen Zwischenstand kannte. Jetzt: bis zu MAX_HISTORY_ENTRIES
// EIGENSTAENDIGE Eintraege, jeder fuer sich weiterhin live mitgeschrieben
// (wie zuvor der einzelne Draft), aber ein Wechsel zu einem ANDEREN Projekt
// (neu gestartet, aus Datei geladen, oder gezielt ein anderer Verlaufs-
// Eintrag geoeffnet) legt einen NEUEN Eintrag an statt den alten zu
// ueberschreiben - "wenn das Projekt geändert wird, entsteht halt einfach
// eine neue Version, nur eben ein anderes Projekt" (Jonas' exakte Vorgabe).
// Respektiert weiterhin die Speicher-Einwilligung (siehe storageConsent.ts).
export const MAX_HISTORY_ENTRIES = 10;

const HISTORY_KEY = "ssk_project_history";
const ACTIVE_ID_KEY = "ssk_active_history_id";

export interface ProjectHistoryEntry {
  id: string;
  project: ProjectConfig;
  updatedAt: number;
}

function readRawEntries(): ProjectHistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRawEntries(entries: ProjectHistoryEntry[]) {
  if (!isStorageAllowed()) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage kann voll oder deaktiviert sein - Autosave ist ein
    // Sicherheitsnetz, kein kritischer Pfad, deshalb hier bewusst still.
  }
}

// Neuester Stand zuerst - sowohl fuer die Verlauf-Anzeige als auch damit
// das Abschneiden auf MAX_HISTORY_ENTRIES unten immer die AELTESTEN entfernt.
export function getHistoryEntries(): ProjectHistoryEntry[] {
  return readRawEntries().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveHistoryId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY);
}

export function setActiveHistoryId(id: string) {
  if (!isStorageAllowed()) return;
  try {
    localStorage.setItem(ACTIVE_ID_KEY, id);
  } catch {
    // s.o.
  }
}

function createHistoryId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Legt einen NEUEN Verlaufs-Eintrag an, macht ihn zum aktiven und gibt seine
// id zurueck - fuer "Konfiguration starten" (fresh), das Laden einer
// FREMDEN Projektdatei, oder generell jeden Wechsel zu einem anderen
// Projekt als dem bisher aktiven.
export function startNewProjectDraft(project: ProjectConfig): string {
  const id = createHistoryId();
  const entries = [{ id, project, updatedAt: Date.now() }, ...readRawEntries()]
    // Neuester zuerst, dann auf MAX_HISTORY_ENTRIES kappen - der bewusst
    // gerade erst angelegte Eintrag faellt dabei nie raus.
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ENTRIES);
  writeRawEntries(entries);
  setActiveHistoryId(id);
  return id;
}

// Schreibt laufend (bei jeder Aenderung) in EINEN bestehenden Eintrag zurueck
// - legt ihn an, falls er (z. B. durch Verdraengung) nicht mehr existiert.
export function saveProjectDraft(id: string, project: ProjectConfig) {
  const rest = readRawEntries().filter((e) => e.id !== id);
  const entries = [{ id, project, updatedAt: Date.now() }, ...rest]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ENTRIES);
  writeRawEntries(entries);
}

// Der aktuell AKTIVE Eintrag (der, in den gerade live geschrieben wird) -
// fuer den Session-Wiedereinstieg nach einem Neuladen der Seite ohne
// Navigations-State, und fuer "Aus Cache laden" auf der Startseite.
export function loadProjectDraft(): ProjectConfig | null {
  const id = getActiveHistoryId();
  if (!id) return null;
  return readRawEntries().find((e) => e.id === id)?.project ?? null;
}

// Ein Cache gilt nur dann als "vorhanden" (z. B. fuer die "Aus Cache
// laden"-Option auf der Startseite), wenn er tatsaechlich mindestens einen
// Container enthaelt - ein frisch angelegtes, noch leeres Projekt zaehlt
// nicht als sinnvoller Zwischenstand.
export function hasMeaningfulProjectDraft(): boolean {
  const draft = loadProjectDraft();
  return !!draft && draft.instances.length > 0;
}

// "Meine Daten löschen" (AppShell.tsx) und das Ablehnen der Speicher-
// Einwilligung (StorageConsentBanner.tsx) meinen explizit ALLE lokal
// gespeicherten Daten der App, nicht nur die Projekt-Historie (Jonas'
// Fehlerbericht 2026-07-29: vorher blieben Theme-Praeferenz und "Tour schon
// gesehen"-Merker auch nach "Daten löschen"/"Nein" bestehen) - deshalb
// zusaetzlich die Keys aus ThemeContext.tsx und tourStore.ts mit entfernen.
// UNIT_PREFS_KEY (unitPreferencesStore.ts, Jonas' Vorgabe 2026-08-10:
// Mess-Einheiten) aus demselben Grund.
export function clearProjectDraft() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(ACTIVE_ID_KEY);
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(UNIT_PREFS_KEY);
  } catch {
    // s.o.
  }
}
