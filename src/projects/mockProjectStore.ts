import type { Project, ProjectConfig, ProjectStatus } from "./types";

// Gleiche Einschraenkung wie mockAuthStore.ts: reines localStorage-
// Grundgeruest, kein echtes Backend, funktioniert nur in diesem Browser.
const PROJECTS_KEY = "ssk_projects";

function load(): Project[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function save(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function listAllProjects(): Project[] {
  return load();
}

export function listProjectsForOwner(ownerId: string): Project[] {
  return load().filter((p) => p.ownerId === ownerId);
}

export function listProjectsForKonstrukteur(konstrukteurId: string): Project[] {
  return load().filter((p) => p.assignedKonstrukteurId === konstrukteurId);
}

export function getProject(id: string): Project | undefined {
  return load().find((p) => p.id === id);
}

export function createProject(name: string, ownerId: string, config: ProjectConfig): Project {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    ownerId,
    assignedKonstrukteurId: null,
    status: "angefragt",
    createdAt: new Date().toISOString(),
    config,
  };
  const projects = load();
  projects.push(project);
  save(projects);
  return project;
}

export function assignKonstrukteur(projectId: string, konstrukteurId: string | null) {
  const projects = load();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.assignedKonstrukteurId = konstrukteurId;
    save(projects);
  }
}

export function setProjectStatus(projectId: string, status: ProjectStatus) {
  const projects = load();
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.status = status;
    save(projects);
  }
}

export function deleteProject(projectId: string) {
  save(load().filter((p) => p.id !== projectId));
}
