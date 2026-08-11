import { useState } from "react";
import { CONTAINER_SIZE_PRESETS, type ContainerSize } from "../constants/containerSizes";
import { LC_DIMENSION_LIMITS } from "../constants/lcStandard";
import { getDimensionWarning, getFloorThicknessWarning, getWallThicknessWarning } from "../utils/containerWarnings";
import { NumberInput } from "./NumberInput";
import { SonderBadge } from "./SonderBadge";
import { ConfirmDialog } from "./ConfirmDialog";

interface ContainerSizeControlsProps {
  size: ContainerSize;
  wallThickness: number;
  onSizeChange: (size: ContainerSize) => void;
  onWallThicknessChange: (t: number) => void;
  // Jonas' Korrektur 2026-08-11 (spaeter am selben Tag): die Bodenstaerke ist
  // wieder ein frei editierbares Feld, GENAU wie die Wandstaerke (siehe
  // lcStandard.ts fuer die Begruendung des Hin-und-Her) - lebt deshalb hier,
  // direkt neben Wandstaerke, statt bei der Schallschutzklasse (die
  // Bodenisolierungs-CHECKBOX bleibt weiterhin dort, siehe
  // SoundClassControls.tsx - nur die Dicke selbst ist eine reine Groessen-/
  // Materialangabe wie die Wandstaerke).
  floorThickness: number;
  onFloorThicknessChange: (t: number) => void;
}

// Container-Aussenmasse und Wandstaerke sind jetzt frei editierbar (Jonas'
// Vorgabe 2026-07-22), die drei Standardmasse dienen nur noch als
// Schnellauswahl-Vorlage zum Uebernehmen. Durchgehend in mm. Gestapeltes
// Layout (nicht mehr in einer Zeile) - lebt seit der Umstrukturierung in der
// 320px breiten Seitenleiste statt im breiten Kopfbereich, siehe App.tsx.
//
// Jonas' Vorgabe 2026-08-10: Sondermass-/Uebermass-Warnhinweise fuer
// Laenge/Breite/Hoehe (siehe DimensionField unten) und ein Sonder-Hinweis an
// der Wandstaerke bei Abweichung vom Standard. Alle Texte kommen aus
// utils/containerWarnings.ts (einzige Quelle, auch fuer den Sammel-Hinweis
// in der Baugruppen-Liste, siehe ContainerWarningBadge.tsx) - bewusst OHNE
// Firmennamen (Jonas' Fehlerbericht 2026-08-10: "nirgendwo ein Firmenname
// wie LC-Standard stehen, es soll immer neutral sein"). Warnungen zeigen
// sich als kleines Ausrufezeichen-Badge neben dem Feldnamen (Jonas: "das
// Ausrufezeichen wie es bei der Wandstärke ist finde ich gut, mache das so
// bei allen wo das hinpasst") statt als eigener Absatztext.
//
// Jonas' Korrektur 2026-08-11 (spaeter am selben Tag, siehe lcStandard.ts):
// die Bodenstaerke (floorThickness) ist wieder ein frei editierbares Feld,
// mit demselben Sonder-Badge-Muster wie die Wandstaerke, nur mit zwei
// zulaessigen Standardwerten (100/120mm) statt einem. Die Frage "hohl oder
// isoliert?" (floorInsulated) bleibt weiterhin bei der Schallschutzklasse
// (siehe SoundClassControls.tsx), weil ihr DEFAULT davon abhaengt - nur die
// Dicke selbst ist hier, als reine Groessen-/Materialangabe wie
// wallThickness.
export function ContainerSizeControls({
  size,
  wallThickness,
  onSizeChange,
  onWallThicknessChange,
  floorThickness,
  onFloorThicknessChange,
}: ContainerSizeControlsProps) {
  const presets = CONTAINER_SIZE_PRESETS;
  const wallWarning = getWallThicknessWarning(wallThickness);
  const floorWarning = getFloorThicknessWarning(floorThickness);

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
        <DimensionField field="length" label="Länge (mm)" value={size.length} onChange={(v) => onSizeChange({ ...size, length: v })} />
        <DimensionField field="width" label="Breite (mm)" value={size.width} onChange={(v) => onSizeChange({ ...size, width: v })} />
        <DimensionField field="height" label="Höhe (mm)" value={size.height} onChange={(v) => onSizeChange({ ...size, height: v })} />
        <div>
          <label className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              Wandstärke (mm)
              {wallWarning && <SonderBadge text={wallWarning.text} />}
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
              Bodenstärke (mm)
              {floorWarning && <SonderBadge text={floorWarning.text} />}
            </span>
            <NumberInput
              step={10}
              min={0}
              value={floorThickness}
              onChange={onFloorThicknessChange}
              className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

interface DimensionFieldProps {
  field: "length" | "width" | "height";
  label: string;
  value: number;
  onChange: (v: number) => void;
}

// Kapselt die Sondermass-/Uebermass-Erkennung EINER Mass-Eingabe (Jonas'
// Vorgabe 2026-08-10, siehe getDimensionWarning in containerWarnings.ts):
// exakter Treffer auf eine der Standard-Vorlagen - keine Meldung.
// Abweichender Wert INNERHALB der Standardspanne - oranges Badge.
// Wert AUSSERHALB der Spanne ("Übermass" bzw. Untermass) - Badge PLUS ein
// Bestaetigungs-Dialog beim Verlassen des Feldes (nicht bei jedem
// Tastendruck - der Text im Feld ist waehrend des Tippens oft
// voruebergehend ausserhalb der Spanne, siehe NumberInput's
// onBlurCommitted). Bei "Zurücksetzen" im Dialog wird der Wert auf die
// naechste gueltige Grenze zurueckgesetzt, bei "Übernehmen" gilt der Wert
// als bestaetigt und der Dialog erscheint fuer GENAU diesen Wert nicht
// erneut.
function DimensionField({ field, label, value, onChange }: DimensionFieldProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledgedValue, setAcknowledgedValue] = useState<number | null>(null);

  const limits = LC_DIMENSION_LIMITS[field];
  const overMax = value > limits.max;
  const warning = getDimensionWarning(field, value);

  function handleBlurCommitted() {
    if (overMax && acknowledgedValue !== value) {
      setConfirmOpen(true);
    }
  }

  return (
    <label className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1">
        {label}
        {warning && <SonderBadge text={warning.text} />}
      </span>
      <NumberInput
        step={10}
        min={0}
        value={value}
        onChange={onChange}
        onBlurCommitted={handleBlurCommitted}
        className="w-full rounded border border-slate-300 px-1.5 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Übermaß bestätigen"
        message={`Dieser Wert liegt über dem Standardmaß (max. ${limits.max} mm). Das kann zu Mehraufwand und zusätzlichen Kosten führen (z. B. Sondertransport) und sollte vorher abgestimmt werden. Trotzdem übernehmen?`}
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
