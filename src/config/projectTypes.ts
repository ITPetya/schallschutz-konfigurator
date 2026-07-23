import type { ContainerConfig } from "./types";

// Baugruppen-Datenmodell (siehe docs/baugruppen-architektur.md) - eine
// ContainerInstance buendelt eine VOLLSTAENDIGE, unveraenderte ContainerConfig
// (identisch zum Einzelcontainer-Format) mit ihrer Position/Rotation im
// gemeinsamen Projekt-Bodenplan. position ist wie ALLE Masse im Datenmodell
// in Millimetern (Projekt-Ursprung, Container-MITTELPUNKT), rotationY in
// Grad um die Hochachse.
export interface ContainerInstance {
  id: string;
  label: string;
  config: ContainerConfig;
  position: { x: number; z: number };
  rotationY: number;
}

// formatVersion von Anfang an (siehe Architektur-Doku) - damit spaetere
// Aenderungen nicht wieder die "optionales Feld, alte Dateien haben es
// nicht"-Kompatibilitaetskrücke brauchen, die ContainerConfig inzwischen an
// mehreren Stellen hat.
export interface ProjectConfig {
  formatVersion: 1;
  name: string;
  instances: ContainerInstance[];
}
