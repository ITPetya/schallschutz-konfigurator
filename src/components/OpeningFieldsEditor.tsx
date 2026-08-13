import type { DoorHinge, Opening } from "../types/openings";
import { OPENING_SIZE_PRESETS, OPENING_TYPES } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";
import { panelSpanU, panelSpanV, positionLabels } from "../utils/panelGeometry";
import { NumberInput } from "./NumberInput";

interface OpeningFieldsEditorProps {
  opening: Opening;
  size: ContainerSize;
  onChange: (patch: Partial<Opening>) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
// min-h-[2rem] (Jonas' Fehlerbericht 2026-07-25: "Eingabefelder nicht auf
// einer Höhe, nur weil der Titel darüber zweizeilig ist") - reserviert IMMER
// zwei Zeilen Platz fuer die Beschriftung, egal ob sie ein- oder zweizeilig
// umbricht (z. B. "Seitlich (mm)" vs. "Unterkante über Boden (mm)"), damit
// alle Eingabefelder in derselben Grid-Zeile auf gleicher Hoehe landen -
// items-end richtet kurze Beschriftungen unten buendig aus, direkt ueber dem
// Eingabefeld, genau wie bei den zweizeiligen von selbst der Fall ist.
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400";
const labelTextClass = "flex min-h-[2rem] items-end";

// Maße/Position/Bandseite/Standardmaße-Felder einer Einbaute - aus
// OpeningsPanel.tsx's aufklappbarer Zeile extrahiert (Jonas' Vorgabe
// 2026-08-13, "Einbauten hinzufügen"-Assistent), damit sowohl das
// nachträgliche Bearbeiten dort ALS AUCH der neue Assistent (Schritt 3,
// AddOpeningPopup.tsx) dieselbe Feld-/Grenzen-Logik nutzen, statt sie zu
// duplizieren - siehe docs/session-handoff-2026-07-25.md's Konvention
// "strukturell identisches extrahieren statt duplizieren".
export function OpeningFieldsEditor({ opening: o, size, onChange }: OpeningFieldsEditorProps) {
  const typeDef = OPENING_TYPES[o.kind];
  const maxU = Math.max(0, panelSpanU(o.panel, size) / 2 - o.width / 2);
  // Bei runden Durchbruechen ist width der Durchmesser und height wird laut
  // Datenmodell ignoriert (siehe types/openings.ts) - hier trotzdem effektiv
  // auf width umgelegt, falls height (z. B. aus einem aelteren Speicherstand
  // oder vor dem Fix unten) noch veraltet/abweichend ist (Jonas'
  // Fehlerbericht 2026-08-10: "eckiger Schlitz statt rund" an einem
  // vergroesserten runden Dach-Durchbruch, siehe railLayout.ts's
  // verticalSpan fuer denselben Fix an der eigentlichen Ausschnitt-Stelle).
  const effectiveHeight = typeDef.shape === "round" ? o.width : o.height;
  const vBounds = verticalBounds(typeDef, effectiveHeight, panelSpanV(o.panel, size));
  const [uLabel, vLabel] = positionLabels(o.panel, !!typeDef.isDoor);
  const widthMin = typeDef.minWidth ?? typeDef.minSize;
  const widthMax = typeDef.maxWidth ?? typeDef.maxSize;
  const heightMin = typeDef.minHeight ?? typeDef.minSize;
  const heightMax = typeDef.maxHeight ?? typeDef.maxSize;

  return (
    <div className="space-y-2">
      {/* Jonas' Vorgabe 2026-08-11: reine Schnellauswahl-Vorlage (mirror
          von ContainerSizeControls.tsx's "Vorlage…"-Dropdown) - fuellt
          nur Breite/Höhe unten vor, aendert NICHT den OpeningKind/die
          Bauteil-Logik (Scharnier etc.) und ist kein "Standard vs.
          frei"-Modusumschalter. Nur sichtbar, wenn es fuer diesen
          Bauteil-Typ ueberhaupt bekannte Standardmasse gibt (Kabel-/
          Rohrdurchführungen haben keine). */}
      {OPENING_SIZE_PRESETS[o.kind] && (
        <select
          aria-label="Standardmaße"
          defaultValue=""
          onChange={(e) => {
            const preset = OPENING_SIZE_PRESETS[o.kind]?.[Number(e.target.value)];
            if (preset) onChange(typeDef.shape === "round" ? { width: preset.width, height: preset.width } : preset);
            e.target.value = "";
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Standardmaße…
          </option>
          {OPENING_SIZE_PRESETS[o.kind]!.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      )}

      {typeDef.hasHinge && (
        <label className={labelClass}>
          Bandseite
          <select
            value={o.hinge ?? "left"}
            onChange={(e) => onChange({ hinge: e.target.value as DoorHinge })}
            className={inputClass}
          >
            <option value="left">DIN Links</option>
            <option value="right">DIN Rechts</option>
          </select>
        </label>
      )}

      {vBounds.impossible && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          Passt bei dieser Containerhöhe nicht: Mindestabstand Boden
          (170mm) und Mindestabstand Oberkante (150mm) zusammen brauchen
          mehr Höhe als der Container hat.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          <span className={labelTextClass}>{uLabel}</span>
          <NumberInput
            step={10}
            min={-maxU}
            max={maxU}
            value={Math.round(o.u)}
            onChange={(v) => onChange({ u: v })}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{vLabel}</span>
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

        {/* Jonas' Vorgabe 2026-08-11 ("Bauteile frei verstellbar"): Breite/
            Höhe sind jetzt IMMER editierbar, genau wie beim Container -
            vorher galt das nur fuer "free"-Typen, "standard"-Typen
            (Standardtueren/-gitter) zeigten nur einen statischen
            "Feste Maße"-Text ohne Eingabefeld. Frei editierbare Felder
            SIND jetzt die Quelle der Wahrheit, "Standard" ergibt sich
            rein daraus, ob der aktuelle Wert einem bekannten Preset
            entspricht (siehe isSonderDoor in containerWarnings.ts) -
            keine separate Modusumschaltung mehr noetig. */}
        <label className={labelClass}>
          <span className={labelTextClass}>{typeDef.shape === "round" ? "Durchmesser (mm)" : "Breite (mm)"}</span>
          <NumberInput
            step={10}
            min={widthMin}
            max={widthMax}
            value={Math.round(o.width)}
            // Rund hat kein eigenes Hoehenfeld (siehe rect-Zweig
            // unten) - height muss deshalb hier synchron mitlaufen,
            // sonst bleibt sie auf ihrem Erstellungswert stehen,
            // waehrend der tatsaechliche Durchmesser (width) sich
            // aendert (Jonas' Fehlerbericht 2026-08-10, siehe
            // effectiveHeight oben).
            onChange={(v) => onChange(typeDef.shape === "round" ? { width: v, height: v } : { width: v })}
            className={inputClass}
          />
        </label>
        {typeDef.shape === "rect" && (
          <label className={labelClass}>
            <span className={labelTextClass}>Höhe (mm)</span>
            <NumberInput
              step={10}
              min={heightMin}
              max={heightMax}
              value={Math.round(o.height)}
              onChange={(v) => onChange({ height: v })}
              className={inputClass}
            />
          </label>
        )}
      </div>
    </div>
  );
}
