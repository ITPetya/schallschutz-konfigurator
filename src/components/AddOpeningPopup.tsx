import type { Opening, PanelId } from "../types/openings";
import { isKindAllowedOnPanel, isLengthSpanningPanel } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import { OPENING_FAMILIES, type OpeningFamily } from "../constants/openingFamilies";
import type { ContainerSize } from "../constants/containerSizes";
import type { OpeningWizardState } from "../utils/openingWizard";
import type { PartitionWallCreateDraft } from "../types/partitionWall";
import { SONDER_DOOR_TEXT, isSonderDoor } from "../utils/containerWarnings";
import { OpeningFieldsEditor } from "./OpeningFieldsEditor";
import { PartitionWallCreateFields } from "./PartitionWallCreateFields";
import { SonderBadge } from "./SonderBadge";
import { ExpandingPanel } from "./ExpandingPanel";

const TRENNWAND_VALUE = "__trennwand__";

interface AddOpeningPopupProps {
  size: ContainerSize;
  wallThickness: number;
  wizard: OpeningWizardState | null;
  onOpen: () => void;
  onPanelChange: (panel: PanelId) => void;
  onFamilyChange: (family: OpeningFamily) => void;
  onFieldsChange: (patch: Partial<Opening>) => void;
  onCommit: () => void;
  onClose: () => void;
  // Jonas' Vorgabe 2026-08-14: "Trennwand" ist keine echte OpeningFamily
  // (erzeugt ein PartitionWallConfig statt eines Opening) - laeuft deshalb
  // als eigener, paralleler Zweig statt ueber onFamilyChange/onFieldsChange/
  // onCommit, siehe types/partitionWall.ts.
  partitionDraft: PartitionWallCreateDraft | null;
  onSelectTrennwand: () => void;
  onPartitionFieldsChange: (patch: Partial<PartitionWallCreateDraft>) => void;
  onCommitPartitionWall: () => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const sectionTitleClass = "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand";

// Assistent zum Anlegen einer neuen Einbaute - liegt IM Viewer an der linken
// Seite (Jonas' Vorgabe 2026-07-22), ausgeloest durch den runden "+"-Button,
// der jetzt TEIL dieser Komponente ist (siehe ExpandingPanel.tsx: die Flaeche
// waechst sichtbar aus dem Button heraus, statt als separate Box daneben
// aufzutauchen - Jonas' Vorgabe 2026-08-13, "damit es nicht mit anderen
// Elementen kollidiert"). Umbenannt von "Neuer Durchbruch" und schrittweise
// aufklappend: Abschnitt 2 ("Einbaute wählen") erscheint erst, sobald eine
// Fläche gewählt ist, Abschnitt 3 ("Maße & Details") erst, sobald eine
// Einbaute-Familie gewählt ist - "Man soll klar erst die Fläche auswählen".
// Die Fläche laesst sich hier per Dropdown ODER (siehe WorkspacePage.tsx/
// Scene.tsx/WallFaceMarkers.tsx) per Klick auf die Wand im 3D-Viewer waehlen,
// genau wie bei "Ausrichten" - beide Wege landen im selben wizard.panel-
// Zustand.
//
// wizard === null heisst "Assistent geschlossen" (nur der Button ist
// sichtbar) - der gesamte Zustand lebt in WorkspacePage.tsx, das daraus auch
// die Live-Vorschau (draftOpening) fuer den Viewer ableitet.
export function AddOpeningPopup({
  size,
  wallThickness,
  wizard,
  onOpen,
  onPanelChange,
  onFamilyChange,
  onFieldsChange,
  onCommit,
  onClose,
  partitionDraft,
  onSelectTrennwand,
  onPartitionFieldsChange,
  onCommitPartitionWall,
}: AddOpeningPopupProps) {
  const open = wizard !== null;
  const panel = wizard?.panel ?? null;
  const family = wizard?.family ?? null;

  const availableFamilies = (Object.entries(OPENING_FAMILIES) as [OpeningFamily, (typeof OPENING_FAMILIES)[OpeningFamily]][]).filter(
    ([, def]) => !panel || isKindAllowedOnPanel(OPENING_TYPES[def.creationKind], panel),
  );

  return (
    <ExpandingPanel
      open={open}
      onToggle={open ? onClose : onOpen}
      ariaLabel={open ? "Schließen" : "Einbauten hinzufügen"}
      triggerDataTour="add-opening"
      header={<span className="text-xs font-bold uppercase tracking-widest text-brand">Einbauten hinzufügen</span>}
    >
      {wizard && (
        <>
          <div className="space-y-1.5">
            <span className={sectionTitleClass}>1. Fläche wählen</span>
            <select
              aria-label="Wand"
              value={panel ?? ""}
              onChange={(e) => onPanelChange(e.target.value as PanelId)}
              className={inputClass}
            >
              <option value="" disabled>
                Fläche wählen…
              </option>
              {(Object.keys(PANEL_LABELS) as PanelId[]).map((p) => (
                <option key={p} value={p}>
                  {PANEL_LABELS[p]}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 dark:text-slate-500">Oder direkt auf eine Wand im Viewer klicken.</p>
          </div>

          {panel && (
            <div className="space-y-1.5">
              <span className={sectionTitleClass}>2. Einbaute wählen</span>
              <select
                aria-label="Einbaute"
                value={partitionDraft ? TRENNWAND_VALUE : (family ?? "")}
                onChange={(e) => (e.target.value === TRENNWAND_VALUE ? onSelectTrennwand() : onFamilyChange(e.target.value as OpeningFamily))}
                className={inputClass}
              >
                <option value="" disabled>
                  Einbaute wählen…
                </option>
                {availableFamilies.map(([f, def]) => (
                  <option key={f} value={f}>
                    {def.label}
                  </option>
                ))}
                {isLengthSpanningPanel(panel) && <option value={TRENNWAND_VALUE}>Trennwand</option>}
              </select>
            </div>
          )}

          {family && wizard.opening && (
            <div className="space-y-1.5">
              <span className={sectionTitleClass}>
                3. Maße & Details
                {isSonderDoor(wizard.opening) && <SonderBadge text={SONDER_DOOR_TEXT} />}
              </span>
              <OpeningFieldsEditor opening={wizard.opening} size={size} onChange={onFieldsChange} />
            </div>
          )}

          {partitionDraft && (
            <div className="space-y-1.5">
              <span className={sectionTitleClass}>3. Maße & Details</span>
              <PartitionWallCreateFields size={size} wallThickness={wallThickness} draft={partitionDraft} onChange={onPartitionFieldsChange} />
            </div>
          )}

          {(family || partitionDraft) && (
            <button
              type="button"
              onClick={partitionDraft ? onCommitPartitionWall : onCommit}
              className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
            >
              Hinzufügen
            </button>
          )}
        </>
      )}
    </ExpandingPanel>
  );
}
