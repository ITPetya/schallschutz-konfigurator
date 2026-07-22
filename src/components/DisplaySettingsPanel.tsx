import { useState } from "react";
import type { BackgroundStyle, ViewStyle } from "../context/DisplaySettingsContext";
import { RAL_SPECIAL_COLORS, RAL_STANDARD_COLORS, type RalColor } from "../constants/ralColors";

interface DisplaySettingsPanelProps {
  viewStyle: ViewStyle;
  onViewStyleChange: (v: ViewStyle) => void;
  background: BackgroundStyle;
  onBackgroundChange: (b: BackgroundStyle) => void;
  insideColor: string;
  onInsideColorChange: (hex: string) => void;
  outsideColor: string;
  onOutsideColorChange: (hex: string) => void;
  shadowsEnabled: boolean;
  onShadowsEnabledChange: (v: boolean) => void;
}

const toggleBtn = (active: boolean) =>
  `flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`;

export function DisplaySettingsPanel({
  viewStyle,
  onViewStyleChange,
  background,
  onBackgroundChange,
  insideColor,
  onInsideColorChange,
  outsideColor,
  onOutsideColorChange,
  shadowsEnabled,
  onShadowsEnabledChange,
}: DisplaySettingsPanelProps) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-500">Ansicht</p>
        <div className="flex gap-1">
          <button type="button" className={toggleBtn(viewStyle === "realistic")} onClick={() => onViewStyleChange("realistic")}>
            Realistisch
          </button>
          <button
            type="button"
            className={toggleBtn(viewStyle === "shaded_edges")}
            onClick={() => onViewStyleChange("shaded_edges")}
          >
            Schattiert mit Kanten
          </button>
        </div>
        {/* Jonas' Vorgabe 2026-07-24: Schatten abschaltbar machen. */}
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={shadowsEnabled}
            onChange={(e) => onShadowsEnabledChange(e.target.checked)}
          />
          Schatten anzeigen
        </label>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-500">Hintergrund</p>
        <div className="flex gap-1">
          <button type="button" className={toggleBtn(background === "studio")} onClick={() => onBackgroundChange("studio")}>
            Studio
          </button>
          <button type="button" className={toggleBtn(background === "terrain")} onClick={() => onBackgroundChange("terrain")}>
            Gelände
          </button>
        </div>
      </div>

      <ColorPicker label="Außenfarbe" value={outsideColor} onChange={onOutsideColorChange} />
      <ColorPicker label="Innenfarbe" value={insideColor} onChange={onInsideColorChange} />
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const standardColors = RAL_STANDARD_COLORS;
  const isStandard = standardColors.some((c) => c.hex === value);
  const [category, setCategory] = useState<"standard" | "special">(isStandard ? "standard" : "special");
  const options = category === "standard" ? standardColors : RAL_SPECIAL_COLORS;
  const current = [...standardColors, ...RAL_SPECIAL_COLORS].find((c) => c.hex === value);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{label}</p>
      <div className="mb-1.5 flex gap-1">
        <button
          type="button"
          className={toggleBtn(category === "standard")}
          onClick={() => {
            setCategory("standard");
            onChange(standardColors[0].hex);
          }}
        >
          Standardfarben
        </button>
        <button type="button" className={toggleBtn(category === "special")} onClick={() => setCategory("special")}>
          Sonderfarben
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-slate-300"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none"
        >
          {options.map((c: RalColor) => (
            <option key={c.code} value={c.hex}>
              {c.code} – {c.name}
            </option>
          ))}
        </select>
      </div>
      {!current && <p className="mt-1 text-xs text-slate-400">Aktuell: {value}</p>}
    </div>
  );
}
