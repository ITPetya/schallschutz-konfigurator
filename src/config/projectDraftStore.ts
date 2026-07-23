import type { ContainerConfig } from "./types";
import type { ProjectConfig } from "./projectTypes";

// Automatische Zwischensicherung fuer Baugruppen-Projekte, gleiches Prinzip
// wie draftStore.ts fuer Einzelcontainer - eigener localStorage-Schluessel,
// damit sich beide Entwuerfe nicht gegenseitig ueberschreiben.
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

// Wird von KonfiguratorPage aufgerufen, wenn man von dort "zurueck zum
// Projekt" geht, nachdem man eine einzelne ContainerInstance im normalen
// Konfigurator bearbeitet hat - schreibt NUR deren config zurueck, laesst
// Position/Rotation/restliche Instanzen unangetastet.
export function updateProjectInstanceConfig(instanceId: string, config: ContainerConfig) {
  const project = loadProjectDraft();
  if (!project) return;
  saveProjectDraft({
    ...project,
    instances: project.instances.map((inst) => (inst.id === instanceId ? { ...inst, config } : inst)),
  });
}
