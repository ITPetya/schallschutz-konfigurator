import type { Opening, PanelId } from "../types/openings";
import { isKindAllowedOnPanel } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import { OPENING_FAMILIES, type OpeningFamily } from "../constants/openingFamilies";
import type { ContainerSize } from "../constants/containerSizes";
import type { OpeningWizardState } from "../utils/openingWizard";
import { SONDER_DOOR_TEXT, isSonderDoor } from "../utils/containerWarnings";
import { XIcon } from "./icons/XIcon";
import { AnimatedButton } from "./AnimatedButton";
import { OpeningFieldsEditor } from "./OpeningFieldsEditor";
import { SonderBadge } from "./SonderBadge";

interface AddOpeningPopupProps {
  size: ContainerSize;
  wizard: OpeningWizardState;
  onPanelChange: (panel: PanelId) => void;
  onFamilyChange: (family: OpeningFamily) => void;
  onFieldsChange: (patch: Partial<Opening>) => void;
  onCommit: () => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const sectionTitleClass = "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand";

// Assistent zum Anlegen einer neuen Einbaute - liegt IM Viewer an der linken
// Seite (Jonas' Vorgabe 2026-07-22), ausgeloest durch den "+"-Button in
// WorkspacePage.tsx. Umbenannt von "Neuer Durchbruch" und schrittweise
// aufklappend (Jonas' Vorgabe 2026-08-13): Abschnitt 2 ("Einbaute wählen")
// erscheint erst, sobald eine Fläche gewählt ist, Abschnitt 3 ("Maße &
// Details") erst, sobald eine Einbaute-Familie gewählt ist - "Man soll klar
// erst die Fläche auswählen". Die Fläche laesst sich hier per Dropdown ODER
// (siehe WorkspacePage.tsx/Scene.tsx/WallFaceMarkers.tsx) per Klick auf die
// Wand im 3D-Viewer waehlen, genau wie bei "Ausrichten" - beide Wege landen
// im selben wizard.panel-Zustand.
//
// Diese Komponente ist bewusst eine reine controlled Component: der
// gesamte Assistenten-Zustand (wizard) lebt in WorkspacePage.tsx, das daraus
// auch die Live-Vorschau (draftOpening) fuer den Viewer ableitet - hier
// werden ausschliesslich Werte angezeigt und Aenderungen nach oben gemeldet.
export function AddOpeningPopup({ size, wizard, onPanelChange, onFamilyChange, onFieldsChange, onCommit, onClose }: AddOpeningPopupProps) {
  const { panel, family, opening } = wizard;

  const availableFamilies = (Object.entries(OPENING_FAMILIES) as [OpeningFamily, (typeof OPENING_FAMILIES)[OpeningFamily]][]).filter(
    ([, def]) => !panel || isKindAllowedOnPanel(OPENING_TYPES[def.creationKind], panel),
  );

  return (
    <div
      data-tour="add-opening"
      className="absolute left-4 top-4 w-72 space-y-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md dark:border-slate-700 dark:bg-slate-800/95"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-brand">Einbauten hinzufügen</span>
        <AnimatedButton
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-red-500 dark:text-slate-500"
          aria-label="Schließen"
        >
          <XIcon size={16} />
        </AnimatedButton>
      </div>

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
            value={family ?? ""}
            onChange={(e) => onFamilyChange(e.target.value as OpeningFamily)}
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
          </select>
        </div>
      )}

      {family && (
        <div className="space-y-1.5">
          <span className={sectionTitleClass}>
            3. Maße & Details
            {isSonderDoor(opening) && <SonderBadge text={SONDER_DOOR_TEXT} />}
          </span>
          <OpeningFieldsEditor opening={opening} size={size} onChange={onFieldsChange} />
        </div>
      )}

      {family && (
        <button
          type="button"
          onClick={onCommit}
          className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Hinzufügen
        </button>
      )}
    </div>
  );
}
