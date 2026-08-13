import type { Opening, PanelId } from "../types/openings";
import { isKindAllowedOnPanel } from "../types/openings";
import { OPENING_TYPES } from "../constants/openingTypes";
import { OPENING_FAMILIES, type OpeningFamily } from "../constants/openingFamilies";
import type { ContainerSize } from "../constants/containerSizes";
import { verticalBounds } from "./openingConstraints";
import { panelSpanV } from "./panelGeometry";

// Reiner State-Typ + Uebergangsfunktionen fuer den "Einbauten
// hinzufügen"-Assistenten (Jonas' Vorgabe 2026-08-13) - bewusst ohne
// React-Abhaengigkeit, damit WorkspacePage.tsx ihn per useState halten und
// AddOpeningPopup.tsx als reine controlled Component daran haengen kann.
//
// `panel`/`family` sind explizit `| null`, solange der Nutzer noch keine
// Wahl getroffen hat - genau daran haengt das schrittweise Aufklappen der
// drei Abschnitte in AddOpeningPopup.tsx ("erst Fläche, dann Einbaute, dann
// Maße", Jonas: "Man soll klar erst die Fläche auswählen"). `opening` traegt
// trotzdem IMMER ein vollstaendiges Opening-Objekt (mit Platzhalterwerten,
// bevor eine echte Wahl getroffen wurde), damit es sich direkt patchen
// laesst, sobald Werte feststehen - buildDraft() liefert erst ab
// panel+family != null tatsaechlich etwas zum Rendern.
export interface OpeningWizardState {
  panel: PanelId | null;
  family: OpeningFamily | null;
  opening: Opening;
}

function placeholderOpening(): Opening {
  return {
    id: crypto.randomUUID(),
    kind: "cable",
    panel: "left",
    u: 0,
    v: 0,
    width: 100,
    height: 100,
  };
}

export function createInitialWizardState(): OpeningWizardState {
  return { panel: null, family: null, opening: placeholderOpening() };
}

// Wand-Wahl (per Dropdown ODER per Klick auf die Wand im 3D-Viewer, siehe
// WallFaceMarkers.tsx) - identische Fallback-Idee wie die alte
// handlePanelChange() in AddOpeningPopup.tsx: ist die aktuell gewaehlte
// Familie auf der neuen Wand nicht erlaubt (Tueren nicht auf Oben/Unten,
// Wetterschutzgitter nicht auf dem Dach, siehe isKindAllowedOnPanel), wird
// die Familienwahl zurueckgesetzt statt eine unmoegliche Kombination stehen
// zu lassen - der Nutzer waehlt dann in Abschnitt 2 einfach neu.
export function applyPanelPick(state: OpeningWizardState, panel: PanelId): OpeningWizardState {
  const stillAllowed = !state.family || isKindAllowedOnPanel(OPENING_TYPES[state.opening.kind], panel);
  return {
    panel,
    family: stillAllowed ? state.family : null,
    opening: { ...state.opening, panel },
  };
}

// Einbaute-Wahl (Abschnitt 2) - setzt den zur Familie gehoerenden
// creationKind (siehe openingFamilies.ts) plus sinnvolle Default-Maße/
// -Position/-Bandseite, identische Formel wie die bisherige handleAdd() in
// AddOpeningPopup.tsx: Tueren sitzen am erlaubten Mindestabstand vom Boden,
// alles andere mittig auf der Panel-Spanne.
export function applyFamilyPick(state: OpeningWizardState, family: OpeningFamily, size: ContainerSize): OpeningWizardState {
  const panel = state.panel ?? state.opening.panel;
  const kind = OPENING_FAMILIES[family].creationKind;
  const typeDef = OPENING_TYPES[kind];
  const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 100;
  const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 100;
  const bounds = verticalBounds(typeDef, height, panelSpanV(panel, size));
  const v = typeDef.minBottomOffset !== undefined ? bounds.min : panelSpanV(panel, size) / 2;

  return {
    ...state,
    family,
    opening: {
      ...state.opening,
      kind,
      panel,
      u: 0,
      v,
      width,
      height,
      hinge: typeDef.hasHinge ? "left" : undefined,
    },
  };
}

// Live-Vorschau fuers Viewer-Rendering (Scene.tsx) - null, solange Flaeche
// oder Einbaute noch fehlen, sonst das aktuelle (ggf. per Maße-Feldern
// weiter gepatchte) Opening. Wird NIE in editingInstance.config.openings/die
// Undo-Historie geschrieben, nur zusaetzlich ins Rendering gemischt.
export function buildDraft(state: OpeningWizardState): Opening | null {
  if (!state.panel || !state.family) return null;
  return state.opening;
}
