import type { PartitionOpening, PartitionSide } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";
import { NumberInput } from "./NumberInput";

interface PartitionOpeningFieldsEditorProps {
  opening: PartitionOpening;
  partitionSpan: number;
  containerHeight: number;
  onChange: (patch: Partial<PartitionOpening>) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400";

// Maße/Position/Seite-Felder eines Trennwand-Durchbruchs - aus der ersten
// Runde (PartitionWallsPanel.tsx's damaliger PartitionOpeningRow) extrahiert,
// damit sowohl die Liste (PartitionOpeningsPanel.tsx) ALS AUCH der neue
// Assistent (AddPartitionOpeningPopup.tsx, Schritt 2) dieselbe Feld-/
// Grenzen-Logik nutzen, statt sie zu duplizieren - exakt dasselbe Muster wie
// OpeningFieldsEditor.tsx fuer die normalen Aussenwand-Durchbrueche.
// partitionSpan/containerHeight kommen als reine Zahlen rein (kein PanelId),
// weil eine Trennwand kein Aussenwand-Panel ist, siehe Plan.
export function PartitionOpeningFieldsEditor({ opening: o, partitionSpan, containerHeight, onChange }: PartitionOpeningFieldsEditorProps) {
  const typeDef = OPENING_TYPES[o.kind];
  const maxU = Math.max(0, partitionSpan / 2 - o.width / 2);
  const vBounds = verticalBounds(typeDef, o.height, containerHeight);
  const widthMin = typeDef.minWidth ?? typeDef.minSize;
  const widthMax = typeDef.maxWidth ?? typeDef.maxSize;
  const heightMin = typeDef.minHeight ?? typeDef.minSize;
  const heightMax = typeDef.maxHeight ?? typeDef.maxSize;

  return (
    <div className="space-y-2">
      {o.kind === "vent_weather" && (
        <label className={labelClass}>
          Seite
          <select value={o.side ?? "smooth"} onChange={(e) => onChange({ side: e.target.value as PartitionSide })} className={inputClass}>
            <option value="smooth">Glatte Seite</option>
            <option value="railed">C-Schienen-Seite</option>
          </select>
        </label>
      )}

      {vBounds.impossible && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">Passt bei dieser Containerhöhe nicht.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          Seitlich (mm)
          <NumberInput step={10} min={-maxU} max={maxU} value={Math.round(o.u)} onChange={(v) => onChange({ u: v })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Höhe über Boden (mm)
          <NumberInput
            step={10}
            min={vBounds.impossible ? undefined : vBounds.min}
            max={vBounds.impossible ? undefined : vBounds.max}
            value={Math.round(o.v)}
            onChange={(v) => onChange({ v })}
            onBlurCommitted={() => onChange({ v: clampVerticalPosition(o.v, vBounds) })}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {typeDef.shape === "round" ? "Durchmesser (mm)" : "Breite (mm)"}
          <NumberInput
            step={10}
            min={widthMin}
            max={widthMax}
            value={Math.round(o.width)}
            onChange={(v) => onChange(typeDef.shape === "round" ? { width: v, height: v } : { width: v })}
            className={inputClass}
          />
        </label>
        {typeDef.shape === "rect" && (
          <label className={labelClass}>
            Höhe (mm)
            <NumberInput step={10} min={heightMin} max={heightMax} value={Math.round(o.height)} onChange={(v) => onChange({ height: v })} className={inputClass} />
          </label>
        )}
      </div>
    </div>
  );
}
