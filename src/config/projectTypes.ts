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

// Jonas' Vorgabe 2026-08-12: "Ausrichten" als echte, dauerhafte Abhaengigkeit
// zwischen zwei Container-Seitenflaechen statt eines Einmal-Klicks (die alte
// Dropdown-basierte Variante ist damit ersetzt) - siehe
// utils/alignmentDependencies.ts fuer die Aufloese-Logik (Solver). Eine
// Flaeche wird ueber die Weltachse ihrer Normalen plus Vorzeichen
// beschrieben - Container sind nur in 90-Grad-Schritten drehbar (siehe
// handleRotate/worldHalfExtents in WorkspacePage.tsx), die vier Seiten
// liegen dadurch IMMER exakt auf der Welt-X- oder Welt-Z-Achse, nie
// dazwischen.
export type AlignmentAxis = "x" | "z";

export interface AlignmentFaceRef {
  instanceId: string;
  axis: AlignmentAxis;
  // Auf welcher Seite der jeweiligen Achse diese Flaeche liegt (+X/-X bzw.
  // +Z/-Z vom Container-Mittelpunkt aus).
  sign: 1 | -1;
}

// "target" ist der Container, dessen Position DIESE Abhaengigkeit steuert -
// "reference" bleibt selbst frei beweglich (kann wiederum target einer
// ANDEREN Abhaengigkeit sein, der Solver loest Ketten auf). mode: "mate"
// ("Passend") = die beiden Flaechen stehen sich mit distanceMm Abstand
// gegenueber (wie ein physischer Spalt); "flush" ("Fluchtend") = die beiden
// Flaechen liegen in einer Ebene, distanceMm ist der Versatz dazu (0 =
// exakt buendig).
export interface AlignmentDependency {
  id: string;
  target: AlignmentFaceRef;
  reference: AlignmentFaceRef;
  mode: "mate" | "flush";
  distanceMm: number;
}

// formatVersion von Anfang an (siehe Architektur-Doku) - damit spaetere
// Aenderungen nicht wieder die "optionales Feld, alte Dateien haben es
// nicht"-Kompatibilitaetskrücke brauchen, die ContainerConfig inzwischen an
// mehreren Stellen hat.
export interface ProjectConfig {
  formatVersion: 1;
  name: string;
  // Optional (nachtraeglich hinzugefuegt) - vor dieser Aenderung gespeicherte
  // .sszprojekt-Dateien haben das Feld nicht, decodeProject liefert dann
  // einfach undefined zurueck.
  standort?: string;
  instances: ContainerInstance[];
  // Optional (nachtraeglich hinzugefuegt, Jonas' Vorgabe 2026-08-12) - vor
  // dieser Aenderung gespeicherte Dateien haben das Feld nicht. Ueberall beim
  // Lesen mit "?? []" behandeln, nicht direkt indizieren.
  dependencies?: AlignmentDependency[];
}
