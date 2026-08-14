import type { PartitionOpeningKind } from "../types/partitionWall";
import type { PartitionOpeningWizardState } from "../utils/partitionOpeningWizard";
import { PartitionOpeningFieldsEditor } from "./PartitionOpeningFieldsEditor";
import { ExpandingPanel } from "./ExpandingPanel";

interface AddPartitionOpeningPopupProps {
  wizard: PartitionOpeningWizardState | null;
  partitionSpan: number;
  containerHeight: number;
  onOpen: () => void;
  onFamilyChange: (family: PartitionOpeningKind) => void;
  onFieldsChange: (patch: Partial<PartitionOpeningWizardState["opening"]>) => void;
  onCommit: () => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const sectionTitleClass = "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand";

const PARTITION_OPENING_OPTIONS: { kind: PartitionOpeningKind; label: string }[] = [
  { kind: "cable", label: "Kabeldurchführung" },
  { kind: "pipe", label: "Rohrdurchführung" },
  { kind: "vent_weather", label: "Wetterschutzgitter" },
];

// Verkleinerte Variante von AddOpeningPopup.tsx fuer Durchbrüche INNERHALB
// einer Trennwand (Jonas' Vorgabe 2026-08-14, Drill-in-Editor) - nur 2 statt
// 3 Schritte, weil kein Flächen-Schritt noetig ist (implizit "diese
// Trennwand"). Ersetzt AddOpeningPopup als "+"-Button oben links im Viewer,
// solange eine Trennwand fokussiert ist (siehe WorkspacePage.tsx).
export function AddPartitionOpeningPopup({
  wizard,
  partitionSpan,
  containerHeight,
  onOpen,
  onFamilyChange,
  onFieldsChange,
  onCommit,
  onClose,
}: AddPartitionOpeningPopupProps) {
  const open = wizard !== null;
  const family = wizard?.family ?? null;

  return (
    <ExpandingPanel
      open={open}
      onToggle={open ? onClose : onOpen}
      ariaLabel={open ? "Schließen" : "Durchbruch hinzufügen"}
      header={<span className="text-xs font-bold uppercase tracking-widest text-brand">Durchbruch hinzufügen</span>}
    >
      {wizard && (
        <>
          <div className="space-y-1.5">
            <span className={sectionTitleClass}>1. Einbaute wählen</span>
            <select
              aria-label="Einbaute"
              value={family ?? ""}
              onChange={(e) => onFamilyChange(e.target.value as PartitionOpeningKind)}
              className={inputClass}
            >
              <option value="" disabled>
                Einbaute wählen…
              </option>
              {PARTITION_OPENING_OPTIONS.map(({ kind, label }) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {family && wizard.opening && (
            <div className="space-y-1.5">
              <span className={sectionTitleClass}>2. Maße & Details</span>
              <PartitionOpeningFieldsEditor
                opening={wizard.opening}
                partitionSpan={partitionSpan}
                containerHeight={containerHeight}
                onChange={onFieldsChange}
              />
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
        </>
      )}
    </ExpandingPanel>
  );
}
