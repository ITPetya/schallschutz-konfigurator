import { useState } from "react";
import { RAL_SPECIAL_COLORS, RAL_STANDARD_COLORS, type RalColor } from "../constants/ralColors";

interface DisplaySettingsPanelProps {
  insideColor: string;
  onInsideColorChange: (hex: string) => void;
  outsideColor: string;
  onOutsideColorChange: (hex: string) => void;
  insideUnpainted: boolean;
  onInsideUnpaintedChange: (v: boolean) => void;
  outsideNotes: string;
  onOutsideNotesChange: (v: string) => void;
  insideNotes: string;
  onInsideNotesChange: (v: string) => void;
}

const toggleBtn = (active: boolean) =>
  `flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`;

// "Erweiterte Einstellungen" (Jonas' Vorgabe 2026-07-24, vorher "Darstellung")
// - der Ansicht-Stil (Realistisch/Schattiert mit Kanten), Hintergrund
// (Studio/Gelände) und Schatten-Toggle sind hier RAUS und leben jetzt als
// eigenes "Ansicht"-Panel im Viewer direkt neben "Schnitt" (siehe Scene.tsx,
// Jonas' Vorgabe 2026-07-24: "Gelände und Studio gehört auch zu Ansicht") -
// hier bleibt nur die Farbe/Sonderheiten: Außen-/Innenfarbe (bzw. "innen
// unlackiert" als Alternative) und zwei Sonderheiten-Notizen.
export function DisplaySettingsPanel({
  insideColor,
  onInsideColorChange,
  outsideColor,
  onOutsideColorChange,
  insideUnpainted,
  onInsideUnpaintedChange,
  outsideNotes,
  onOutsideNotesChange,
  insideNotes,
  onInsideNotesChange,
}: DisplaySettingsPanelProps) {
  return (
    <div className="space-y-4 text-sm">
      <ColorPicker label="Außenfarbe" value={outsideColor} onChange={onOutsideColorChange} />
      <NoteField label="Sonderheiten Außen" value={outsideNotes} onChange={onOutsideNotesChange} />

      <div>
        {/* Jonas' Vorgabe 2026-07-24: Alternative zur Innenfarbe. */}
        <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <input
            type="checkbox"
            checked={insideUnpainted}
            onChange={(e) => onInsideUnpaintedChange(e.target.checked)}
          />
          Innen unlackiert
        </label>
        {!insideUnpainted && <ColorPicker label="Innenfarbe" value={insideColor} onChange={onInsideColorChange} />}
      </div>
      <NoteField label="Sonderheiten Innen" value={insideNotes} onChange={onInsideNotesChange} />
    </div>
  );
}

// Jonas' Vorgabe 2026-07-24: "zwei Notizenfelder einblenden lassen können" -
// standardmaessig eingeklappt (nur ein "+ hinzufügen"-Link), damit die
// Seitenleiste nicht mit leeren Textfeldern zugestellt wird; klappt aber
// automatisch auf, falls beim Laden einer Datei bereits ein Text drinsteht.
function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(!!value);

  if (!visible) {
    return (
      <button type="button" onClick={() => setVisible(true)} className="text-xs font-medium text-brand hover:underline">
        + {label} hinzufügen
      </button>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
      />
    </label>
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
