import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, ViewStyle } from "../context/DisplaySettingsContext";

export type ProjectStatus = "angefragt" | "in Bearbeitung" | "fertig";

// Kompletter Konfigurator-Zustand, wie er beim Speichern eines Projekts
// eingefroren wird - genau das, was ein Konstrukteur im Viewer sehen muss,
// um das Projekt nachzubauen.
export interface ProjectConfig {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  insideColor: string;
  outsideColor: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string; // Kunde, der das Projekt angefragt hat
  assignedKonstrukteurId: string | null;
  status: ProjectStatus;
  createdAt: string;
  config: ProjectConfig;
}
