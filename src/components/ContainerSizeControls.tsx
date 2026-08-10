import { useState } from "react";
import { CONTAINER_SIZE_PRESETS, type ContainerSize } from "../constants/containerSizes";
import { LC_DIMENSION_LIMITS, LC_FLOOR_INSULATION_RANGE, LC_STANDARD_WALL_THICKNESS } from "../constants/lcStandard";
import { NumberInput } from "./NumberInput";
import { SonderBadge } from "./SonderBadge";
import { ConfirmDialog } from "./ConfirmDialog";

interface ContainerSizeControlsProps {
  size: ContainerSize;
  wallThickness: number;
  floorThickness: number;
  onSizeChange: (size: ContainerSize) => void;
  onWallThicknessChange: (t: number) => void;
  onFloorThicknessChange: (t: number) => void;
}

// Container-Aussenmasse und Wandstaerke sind jetzt frei editierbar (Jonas'
// Vorgabe 2026-07-22), die drei Standardmasse dienen nur noch als
// Schnellauswahl-Vorlage zum Uebernehmen. Durchgehend in mm. Gestapeltes
// Layout (nicht mehr in einer Zeile) - lebt seit der Umstrukturierung in der
// 320px breiten Seitenleiste statt im breiten Kopfbereich, siehe App.tsx.
//
// Jonas' Vorgabe 2026-08-10 (LC-Systems-Standard-PDF): Sondermass-/
// Uebermass-Warnhinweise fuer Laenge/Breite/Hoehe (siehe DimensionField
// unten), ein Sonder-Hinweis an der Wandstaerke bei Abweichung von 100mm,
// und ein neues, von der Wandstaerke GETRENNTES Bodenisolierungs-Feld
// (beim LC-Standard ist Bodenisolierung anders als bei Wand/Dach kein Teil
// des Grundprodukts, siehe lcStandard.ts).
export function ContainerSizeControls({
  size,
  wallThickness,
  floorThickness,
  onSizeChange,
  onWallThicknessChange,
  onFloorThicknessChange,
}: ContainerSizeControlsProps) {
  const presets = CONTAINER_SIZE_PRESETS;
  const presetLengths = presets.map((p) => p.length);
  const presetWidths = presets.map((p) => p.width);
  const presetHeights = presets.map((p) => p.height);

  return (
    <div className="space-y-2 text-sm">
      <select
        defaultValue=""
        onChange={(e) => {
          const preset = presets[Number(e.target.value)];
          if (preset) onSizeChange({ length: preset.length, width: preset.width, height: preset.height });
          e.target.value = "";
        }}
        className="w-full rounded-full border border-slate-300 bg-white px-3 py-1.5 text-ink shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
        <DimensionField
          label="Länge (mm)"
          value={size.length}
          presetValues={presetLengths}
          limits={LC_DIMENSION_LIMITS.length}
          onChange={(v) => onSizeChange({ ...size, length: v })}
        />
        <DimensionField
          label="Breite (mm)"
          value={size.width}
          presetValues={presetWidths}
          limits={LC_DIMENSION_LIMITS.width}
          onChange={(v) => onSizeChange({ ...size, width: v })}
        />
        <DimensionField
          label="Höhe (mm)"
          value={size.height}
          presetValues={presetHeights}
          limits={LC_DIMENSION_LIMITS.height}
          onChange={(v) => onSizeChange({ ...size, height: v })}
        />
        <div>
          <label className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              Wandstärke (mm)
              {wallThickness !== LC_STANDARD_WALL_THICKNESS && (
                <SonderBadge text={`Sonder-Wandstärke (Standard: ${LC_STANDARD_WALL_THICKNESS} mm) – Sonderausstattung mit Aufpreis.`} />
              )}
            </span>
            <NumberInput
              step={10}
              min={0}
              value={wallThickness}
              onChange={onWallThicknessChange}
              className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <div>
          <label className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              Bodenisolierung (mm)
              {floorThickness > 0 && (
                <SonderBadge text="Optionale Bodenisolierung – beim LC-Standard nicht im Grundpreis enthalten, Sonderausstattung mit Aufpreis." />
              )}
            </span>
            <NumberInput
              step={10}
              min={0}
              value={floorThickness}
              onChange={onFloorThicknessChange}
              className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            0 = keine (Standard) · optional {LC_FLOOR_INSULATION_RANGE.min}–{LC_FLOOR_INSULATION_RANGE.max} mm
          </p>
        </div>
      </div>
    </div>
  );
}

interface DimensionFieldProps {
  label: string;
  value: number;
  presetValues: number[];
  limits: { min: number; max: number };
  onChange: (v: number) => void;
}

// Kapselt die Sondermass-/Uebermass-Erkennung EINER Mass-Eingabe (Jonas'
// Vorgabe 2026-08-10): exakter Treffer auf eine der Standard-Vorlagen -
// keine Meldung. Abweichender Wert INNERHALB der LC-Standardspanne
// (lcStandard.ts) - oranger "Sondermass"-Hinweis. Wert AUSSERHALB der
// Spanne ("Übermass" bzw. Untermass, im PDF als "auf Anfrage" gefuehrt) -
// zusaetzlich oranger Hinweis UND ein Bestaetigungs-Dialog beim Verlassen
// des Feldes (nicht bei jedem Tastendruck - der Text im Feld ist waehrend
// des Tippens oft voruebergehend ausserhalb der Spanne, siehe NumberInput's
// onBlurCommitted). Bei "Nein" im Dialog wird der Wert auf die naechste
// gueltige Grenze zurueckgesetzt, bei "Ja" gilt der Wert als bestaetigt und
// der Dialog erscheint fuer GENAU diesen Wert nicht erneut.
function DimensionField({ label, value, presetValues, limits, onChange }: DimensionFieldProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledgedValue, setAcknowledgedValue] = useState<number | null>(null);

  const isPreset = presetValues.includes(value);
  const overMax = value > limits.max;
  const underMin = value < limits.min;
  const isSonder = !isPreset && !overMax && !underMin;

  function handleBlurCommitted() {
    if (overMax && acknowledgedValue !== value) {
      setConfirmOpen(true);
    }
  }

  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
      {label}
      <NumberInput
        step={10}
        min={0}
        value={value}
        onChange={onChange}
        onBlurCommitted={handleBlurCommitted}
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      {isSonder && <p className="text-[11px] text-orange-600 dark:text-orange-400">Sondermaß – mit Mehrkosten verbunden.</p>}
      {overMax && (
        <p className="text-[11px] text-orange-600 dark:text-orange-400">
          Übermaß (LC-Standard bis {limits.max} mm) – führt zu Mehraufwand und Mehrkosten.
        </p>
      )}
      {underMin && (
        <p className="text-[11px] text-orange-600 dark:text-orange-400">
          Unterschreitet den LC-Standard (ab {limits.min} mm) – Sonderanfertigung mit Mehrkosten.
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Übermaß bestätigen"
        message={`Dieser Wert liegt über dem LC-Standardmaß (max. ${limits.max} mm). Das kann zu Mehraufwand und zusätzlichen Kosten führen (z. B. Sondertransport) und erfordert Rücksprache mit LC Systems. Trotzdem übernehmen?`}
        confirmLabel="Übernehmen"
        cancelLabel="Zurücksetzen"
        onConfirm={() => {
          setAcknowledgedValue(value);
          setConfirmOpen(false);
        }}
        onCancel={() => {
          onChange(limits.max);
          setConfirmOpen(false);
        }}
      />
    </label>
  );
}
