import type { ContainerSize } from "../constants/containerSizes";
import type { PartitionDoor, PartitionWallConfig } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";
import { NumberInput } from "./NumberInput";
import { AnimatedButton } from "./AnimatedButton";

interface PartitionWallSettingsProps {
  pw: PartitionWallConfig;
  size: ContainerSize;
  wallThickness: number;
  onUpdate: (patch: Partial<PartitionWallConfig>) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400";
const DOOR_WIDTH_MM = OPENING_TYPES.partition_door.fixedWidth!;

// "Grundeinstellungen" einer Trennwand im Drill-in-Editor (Jonas' Vorgabe
// 2026-08-14) - dieselben drei Felder wie beim Anlegen (siehe
// PartitionWallCreateFields.tsx), hier nachtraeglich editierbar, PLUS das
// Spiegeln (das beim schnellen Anlegen bewusst fehlt).
export function PartitionWallSettings({ pw, size, wallThickness, onUpdate }: PartitionWallSettingsProps) {
  const positionHalfRange = Math.max(0, size.length / 2 - wallThickness - pw.thickness / 2 - 100);
  const partitionSpan = Math.max(0, size.width - 2 * wallThickness);
  const doorMaxU = Math.max(0, partitionSpan / 2 - DOOR_WIDTH_MM / 2);

  function toggleDoor() {
    if (pw.door) {
      onUpdate({ door: undefined });
    } else {
      const door: PartitionDoor = { u: 0 };
      onUpdate({ door });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          Position auf der Länge (mm)
          <NumberInput
            step={10}
            min={-positionHalfRange}
            max={positionHalfRange}
            value={Math.round(pw.positionU)}
            onChange={(v) => onUpdate({ positionU: v })}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Wandstärke (mm)
          <NumberInput step={5} min={20} max={200} value={Math.round(pw.thickness)} onChange={(v) => onUpdate({ thickness: v })} className={inputClass} />
        </label>
      </div>

      <AnimatedButton
        type="button"
        onClick={() => onUpdate({ smoothSide: pw.smoothSide === "front" ? "back" : "front" })}
        className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Spiegeln (glatte/C-Schienen-Seite tauschen)
      </AnimatedButton>

      <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tür (932 × 1932mm, DIN rechts von glatt)</span>
          <AnimatedButton type="button" onClick={toggleDoor} className="text-xs font-medium text-brand hover:text-brand-dark">
            {pw.door ? "entfernen" : "hinzufügen"}
          </AnimatedButton>
        </div>
        {pw.door && (
          <label className={`${labelClass} mt-2`}>
            Position (mm von Mitte)
            <NumberInput
              step={10}
              min={-doorMaxU}
              max={doorMaxU}
              value={Math.round(pw.door.u)}
              onChange={(v) => onUpdate({ door: { u: v } })}
              className={inputClass}
            />
          </label>
        )}
      </div>
    </div>
  );
}
