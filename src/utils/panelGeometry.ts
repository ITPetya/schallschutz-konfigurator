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
