import type { ContainerSize } from "../constants/containerSizes";
import type { PartitionWallCreateDraft } from "../types/partitionWall";
import { NumberInput } from "./NumberInput";

interface PartitionWallCreateFieldsProps {
  size: ContainerSize;
  wallThickness: number;
  draft: PartitionWallCreateDraft;
  onChange: (patch: Partial<PartitionWallCreateDraft>) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400";

// Schritt 3 des Assistenten, wenn "Trennwand" gewaehlt wurde (siehe
// AddOpeningPopup.tsx) - bewusst nur die drei Felder, die Jonas beim Anlegen
// nannte (Position/Wandstärke/Tür ja-nein), gleiche Bausteine wie
// OpeningFieldsEditor.tsx. Spiegeln/Durchbrüche kommen erst im
// Drill-in-Editor (PartitionWallSettings.tsx) dazu.
export function PartitionWallCreateFields({ size, wallThickness, draft, onChange }: PartitionWallCreateFieldsProps) {
  const positionHalfRange = Math.max(0, size.length / 2 - wallThickness - draft.thickness / 2 - 100);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          Längsposition (mm)
          <NumberInput
            step={10}
            min={-positionHalfRange}
            max={positionHalfRange}
            value={Math.round(draft.positionU)}
            onChange={(v) => onChange({ positionU: v })}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Wandstärke (mm)
          <NumberInput
            step={5}
            min={20}
            max={200}
            value={Math.round(draft.thickness)}
            onChange={(v) => onChange({ thickness: v })}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={draft.hasDoor} onChange={(e) => onChange({ hasDoor: e.target.checked })} />
        Mit Tür (932 × 1932mm)
      </label>
    </div>
  );
}
