import { CONTAINER_SIZE_PRESETS, type ContainerSize } from "../constants/containerSizes";
import { NumberInput } from "./NumberInput";

interface ContainerSizeControlsProps {
  size: ContainerSize;
  wallThickness: number;
  onSizeChange: (size: ContainerSize) => void;
  onWallThicknessChange: (t: number) => void;
}

// Container-Aussenmasse und Wandstaerke sind jetzt frei editierbar (Jonas'
// Vorgabe 2026-07-22), die drei Standardmasse dienen nur noch als
// Schnellauswahl-Vorlage zum Uebernehmen. Durchgehend in mm. Gestapeltes
// Layout (nicht mehr in einer Zeile) - lebt seit der Umstrukturierung in der
// 320px breiten Seitenleiste statt im breiten Kopfbereich, siehe App.tsx.
export function ContainerSizeControls({ size, wallThickness, onSizeChange, onWallThicknessChange }: ContainerSizeControlsProps) {
  const presets = CONTAINER_SIZE_PRESETS;
  return (
    <div className="space-y-2 text-sm">
      <select
        defaultValue=""
        onChange={(e) => {
          const preset = presets[Number(e.target.value)];
          if (preset) onSizeChange({ length: preset.length, width: preset.width, height: preset.height });
          e.target.value = "";
        }}
        className="w-full rounded-full border border-slate-300 bg-white px-3 py-1.5 text-ink shadow-sm"
      >
        <option value="" disabled>
          Vorlage…
        </option>
        {presets.map((p, i) => (
          <option key={p.label} value={i}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Länge (mm)" value={size.length} onChange={(v) => onSizeChange({ ...size, length: v })} />
        <NumberField label="Breite (mm)" value={size.width} onChange={(v) => onSizeChange({ ...size, width: v })} />
        <NumberField label="Höhe (mm)" value={size.height} onChange={(v) => onSizeChange({ ...size, height: v })} />
        <NumberField label="Wandstärke (mm)" value={wallThickness} onChange={onWallThicknessChange} />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-500">
      {label}
      <NumberInput
        step={10}
        min={0}
        value={value}
        onChange={onChange}
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none"
      />
    </label>
  );
}
