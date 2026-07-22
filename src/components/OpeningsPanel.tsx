import type { DoorHinge, Opening } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";
import { panelSpanU, panelSpanV, positionLabels } from "../utils/panelGeometry";
import { NumberInput } from "./NumberInput";

interface OpeningsPanelProps {
  size: ContainerSize;
  openings: Opening[];
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500";

// Reine Liste der platzierten Durchbrueche (Jonas' Vorgabe 2026-07-24: "bei
// Einbauten sollen nur die gelistet werden, die auch schon eingefügt sind")
// - der "+"-Button zum Anlegen sitzt jetzt oben links im Viewer selbst
// (siehe KonfiguratorPage.tsx), nicht mehr hier in der Seitenleiste.
export function OpeningsPanel({ size, openings, onUpdate, onRemove }: OpeningsPanelProps) {
  return (
    <div className="space-y-2">
      {openings.length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Durchbrüche platziert.</p>
      )}
      {openings.map((o) => {
        const typeDef = OPENING_TYPES[o.kind];
        const maxU = Math.max(0, panelSpanU(o.panel, size) / 2 - o.width / 2);
        const vBounds = verticalBounds(typeDef, o.height, panelSpanV(o.panel, size));
        const [uLabel, vLabel] = positionLabels(o.panel, !!typeDef.isDoor);
        const widthMin = typeDef.minWidth ?? typeDef.minSize;
        const widthMax = typeDef.maxWidth ?? typeDef.maxSize;
        const heightMin = typeDef.minHeight ?? typeDef.minSize;
        const heightMax = typeDef.maxHeight ?? typeDef.maxSize;

        return (
          <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-brand-dark">{typeDef.label}</span>
              <span className="text-xs text-slate-500">{PANEL_LABELS[o.panel]}</span>
              <button
                type="button"
                onClick={() => onRemove(o.id)}
                className="text-slate-400 hover:text-red-500"
                aria-label={`${typeDef.label} entfernen`}
              >
                ✕
              </button>
            </div>

            {typeDef.category === "standard" && (
              <p className="mb-2 text-xs text-slate-400">
                Feste Maße: {typeDef.fixedWidth} × {typeDef.fixedHeight} mm
              </p>
            )}

            {typeDef.hasHinge && (
              <label className={`${labelClass} mb-2`}>
                Bandseite
                <select
                  value={o.hinge ?? "left"}
                  onChange={(e) => onUpdate(o.id, { hinge: e.target.value as DoorHinge })}
                  className={inputClass}
                >
                  <option value="left">DIN Links</option>
                  <option value="right">DIN Rechts</option>
                </select>
              </label>
            )}

            {vBounds.impossible && (
              <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                Passt bei dieser Containerhöhe nicht: Mindestabstand Boden
                (170mm) und Mindestabstand Oberkante (150mm) zusammen
                brauchen mehr Höhe als der Container hat.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                {uLabel}
                <NumberInput
                  step={10}
                  min={-maxU}
                  max={maxU}
                  value={Math.round(o.u)}
                  onChange={(v) => onUpdate(o.id, { u: v })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {vLabel}
                <NumberInput
                  step={10}
                  min={vBounds.impossible ? undefined : vBounds.min}
                  max={vBounds.impossible ? undefined : vBounds.max}
                  value={Math.round(o.v)}
                  onChange={(v) => onUpdate(o.id, { v })}
                  onBlurCommitted={() => onUpdate(o.id, { v: clampVerticalPosition(o.v, vBounds) })}
                  className={inputClass}
                />
              </label>

              {typeDef.category === "free" && (
                <>
                  <label className={labelClass}>
                    {typeDef.shape === "round" ? "Durchmesser (mm)" : "Breite (mm)"}
                    <NumberInput
                      step={10}
                      min={widthMin}
                      max={widthMax}
                      value={Math.round(o.width)}
                      onChange={(v) => onUpdate(o.id, { width: v })}
                      className={inputClass}
                    />
                  </label>
                  {typeDef.shape === "rect" && (
                    <label className={labelClass}>
                      Höhe (mm)
                      <NumberInput
                        step={10}
                        min={heightMin}
                        max={heightMax}
                        value={Math.round(o.height)}
                        onChange={(v) => onUpdate(o.id, { height: v })}
                        className={inputClass}
                      />
                    </label>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
