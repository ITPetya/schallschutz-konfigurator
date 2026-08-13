import type { ContainerSize } from "../constants/containerSizes";
import { isVerticalWall, type PanelId } from "../types/openings";

// u laeuft immer auf der Achse, auf der Vorne/Hinten ("Breite") bzw.
// Links/Rechts/Oben/Unten ("Laenge") liegen.
export function panelSpanU(panel: PanelId, size: ContainerSize) {
  return panel === "front" || panel === "back" ? size.width : size.length;
}

// v-Spanne: bei den vier Seitenwaenden die Containerhoehe (verticalBounds
// wendet dort zusaetzlich Tuer-Mindestabstaende an); bei Oben/Unten die
// Containerbreite - dieselbe Funktion liefert ohne minBottomOffset/
// minTopMargin einfach "0 bis Spanne", genau das ist auch fuer Oben/Unten
// richtig (kein Boden-/Oberkante-Konzept dort).
export function panelSpanV(panel: PanelId, size: ContainerSize) {
  return isVerticalWall(panel) ? size.height : size.width;
}

// Bei Tueren (isDoor) ist v die UNTERKANTE ueber dem Boden, bei allen
// anderen Durchbruchsarten die ACHSE/Mitte (Jonas' Vorgabe 2026-07-22) -
// die Beschriftung muss das fuer den Nutzer sichtbar machen, sonst ist der
// Unterschied nicht erkennbar.
export function positionLabels(panel: PanelId, isDoor: boolean): [string, string] {
  if (!isVerticalWall(panel)) return ["Position Länge (mm)", "Position Breite (mm)"];
  return ["Seitlich (mm)", isDoor ? "Unterkante über Boden (mm)" : "Höhe über Boden (mm)"];
}

// Jonas' Vorgabe 2026-08-14 ("ein Kabeldurchbruch soll auf Boden/Dach immer
// bei Breite links-nach-rechts und Länge/Höhe vorne-nach-hinten sein, das
// ist jetzt noch anders"): auf den vier Seitenwaenden treibt "Breite" die
// u-Achse (die Achse ENTLANG der Wand) und "Höhe" die v-Achse (vertikal) -
// das ist bereits richtig. Auf Boden/Dach ist die u-Achse aber die LAENGE
// (vorne-hinten, siehe panelSpanU) und die v-Achse die BREITE (links-rechts,
// siehe panelSpanV) - eine direkte width->u/height->v-Zuordnung wie bei den
// Seitenwaenden wuerde "Breite" dort faelschlich an die Laengen-Achse
// haengen. Diese beiden Funktionen sind die EINZIGE Stelle, die entscheidet,
// welches Feld (width/height) welche Achse (u/v) treibt - sowohl die CSG-
// Ausschnitt-Geometrie (Wall.tsx/RoofRidge.tsx, ueber Container.tsx's
// openingsFor) als auch die Positions-Grenzen (OpeningFieldsEditor.tsx)
// muessen dieselbe Zuordnung nutzen, sonst liesse sich ein Durchbruch
// ausserhalb der Panel-Flaeche positionieren.
export function uExtent(o: { width: number; height: number }, panel: PanelId): number {
  return isVerticalWall(panel) ? o.width : o.height;
}
export function vExtent(o: { width: number; height: number }, panel: PanelId): number {
  return isVerticalWall(panel) ? o.height : o.width;
}
