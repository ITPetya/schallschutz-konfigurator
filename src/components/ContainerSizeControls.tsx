import { CONTAINER_SIZE_PRESETS, type ContainerSize } from "../constants/containerSizes";

interface ContainerSizeControlsProps {
  size: ContainerSize;
  wallThickness: number;
  onSizeChange: (size: ContainerSize) => void;
  onWallThicknessChange: (t: number) => void;
}

// Container-Aussenmasse und Wandstaerke sind jetzt frei editierbar (Jonas'
// Vorgabe 2026-07-22), die drei Standardmasse dienen nur noch als
// Schnellauswahl-Vorlage zum Uebernehmen. Durchgehend in mm.
export function ContainerSizeControls({ size, wallThickness, onSizeChange, onWallThicknessChange }: ContainerSizeControlsProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <select
        defaultValue=""
        onChange={(e) => {
          const preset = CONTAINER_SIZE_PRESETS[Number(e.target.value)];
          if (preset) onSizeChange({ length: preset.length, width: preset.width, height: preset.height });
          e.target.value = "";
        }}
        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-ink shadow-sm"
      >
        <option value="" disabled>
          Vorlage…
        </option>
        {CONTAINER_SIZE_PRESETS.map((p, i) => (
          <option key={p.label} value={i}>
            {p.label}
          </option>
        ))}
      </select>
      <NumberField label="L" value={size.length} onChange={(v) => onSizeChange({ ...size, length: v })} />
      <NumberField label="B" value={size.width} onChange={(v) => onSizeChange({ ...size, width: v })} />
      <NumberField label="H" value={size.height} onChange={(v) => onSizeChange({ ...size, height: v })} />
      <NumberField label="Wand" value={wallThickness} onChange={onWallThicknessChange} />
      <span className="text-xs text-slate-400">mm</span>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      {label}
      <input
        type="number"
        step={10}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none"
      />
    </label>
  );
}
