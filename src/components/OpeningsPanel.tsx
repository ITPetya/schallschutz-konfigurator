import { useState } from "react";
import type { DoorHinge, Opening } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";
import { panelSpanU, panelSpanV, positionLabels } from "../utils/panelGeometry";
import { NumberInput } from "./NumberInput";
import { TrashIcon } from "./icons/TrashIcon";
import { AnimatedButton } from "./AnimatedButton";

interface OpeningsPanelProps {
  size: ContainerSize;
  openings: Opening[];
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none";
// min-h-[2rem] (Jonas' Fehlerbericht 2026-07-25: "Eingabefelder nicht auf
// einer Höhe, nur weil der Titel darüber zweizeilig ist") - reserviert IMMER
// zwei Zeilen Platz fuer die Beschriftung, egal ob sie ein- oder zweizeilig
// umbricht (z. B. "Seitlich (mm)" vs. "Unterkante über Boden (mm)"), damit
// alle Eingabefelder in derselben Grid-Zeile auf gleicher Hoehe landen -
// items-end richtet kurze Beschriftungen unten buendig aus, direkt ueber dem
// Eingabefeld, genau wie bei den zweizeiligen von selbst der Fall ist.
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500";
const labelTextClass = "flex min-h-[2rem] items-end";

// Reine Liste der platzierten Durchbrueche (Jonas' Vorgabe 2026-07-24: "bei
// Einbauten sollen nur die gelistet werden, die auch schon eingefügt sind")
// - der "+"-Button zum Anlegen sitzt jetzt oben links im Viewer selbst
// (siehe KonfiguratorPage.tsx), nicht mehr hier in der Seitenleiste. Jeder
// Eintrag ist einzeln auf-/zuklappbar (Jonas' Vorgabe 2026-07-25, bewusst
// OHNE eigenes Icon dafuer - die Kopfzeile selbst ist der Klickbereich).
export function OpeningsPanel({ size, openings, onUpdate, onRemove }: OpeningsPanelProps) {
  return (
    <div className="space-y-2">
      {openings.length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Durchbrüche platziert.</p>
      )}
      {openings.map((o) => (
        <OpeningRow key={o.id} opening={o} size={size} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface OpeningRowProps {
  opening: Opening;
  size: ContainerSize;
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

function OpeningRow({ opening: o, size, onUpdate, onRemove }: OpeningRowProps) {
  const [expanded, setExpanded] = useState(false);
  const typeDef = OPENING_TYPES[o.kind];
  const maxU = Math.max(0, panelSpanU(o.panel, size) / 2 - o.width / 2);
  const vBounds = verticalBounds(typeDef, o.height, panelSpanV(o.panel, size));
  const [uLabel, vLabel] = positionLabels(o.panel, !!typeDef.isDoor);
  const widthMin = typeDef.minWidth ?? typeDef.minSize;
  const widthMax = typeDef.maxWidth ?? typeDef.maxSize;
  const heightMin = typeDef.minHeight ?? typeDef.minSize;
  const heightMax = typeDef.maxHeight ?? typeDef.maxSize;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center justify-between text-left"
        >
          <span className="font-medium text-brand-dark">{typeDef.label}</span>
          <span className="text-xs text-slate-500">{PANEL_LABELS[o.panel]}</span>
        </button>
        <AnimatedButton
          type="button"
          onClick={() => onRemove(o.id)}
          className="shrink-0 text-slate-400 hover:text-red-500"
          aria-label={`${typeDef.label} entfernen`}
        >
          <TrashIcon size={16} />
        </AnimatedButton>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {typeDef.category === "standard" && (
            <p className="text-xs text-slate-400">
              Feste Maße: {typeDef.fixedWidth} × {typeDef.fixedHeight} mm
            </p>
          )}

          {typeDef.hasHinge && (
            <label className={labelClass}>
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
            <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
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
                onChange={(v) => onUpdate(o.id, { u: v })}
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
                onChange={(v) => onUpdate(o.id, { v })}
                onBlurCommitted={() => onUpdate(o.id, { v: clampVerticalPosition(o.v, vBounds) })}
                className={inputClass}
              />
            </label>

            {typeDef.category === "free" && (
              <>
                <label className={labelClass}>
                  <span className={labelTextClass}>{typeDef.shape === "round" ? "Durchmesser (mm)" : "Breite (mm)"}</span>
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
                    <span className={labelTextClass}>Höhe (mm)</span>
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
      )}
    </div>
  );
}
