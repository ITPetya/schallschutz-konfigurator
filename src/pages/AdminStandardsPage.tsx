import { useState } from "react";
import {
  getContainerPresets,
  getStandardColors,
  getStandardDoorDims,
  saveContainerPresets,
  saveStandardColors,
  saveStandardDoorDims,
  type StandardDoorDims,
} from "../admin/standardsStore";
import type { ContainerSizePreset } from "../constants/containerSizes";
import type { RalColor } from "../constants/ralColors";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none";
const numberInputClass = `${inputClass} w-24`;

// Admin macht alles admin-editierbar, was vorher hartkodiert war (Jonas'
// Vorgabe 2026-07-22): Standard-Containergroessen, Standard-Tuermasse,
// Standard-RAL-Farben. Aenderungen landen ueber standardsStore.ts in
// localStorage und wirken sich (per applyDoorDimOverrides bei Tueren) direkt
// auf den Konfigurator aus.
export function AdminStandardsPage() {
  const [presets, setPresets] = useState<ContainerSizePreset[]>(getContainerPresets());
  const [colors, setColors] = useState<RalColor[]>(getStandardColors());
  const [doorDims, setDoorDims] = useState<StandardDoorDims>(getStandardDoorDims());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function flashSaved() {
    setSavedMessage("Gespeichert.");
    window.setTimeout(() => setSavedMessage(null), 2500);
  }

  function updatePreset(index: number, patch: Partial<ContainerSizePreset>) {
    setPresets((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function updateColor(index: number, patch: Partial<RalColor>) {
    setColors((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-8">
      <h1 className="font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">Standards</h1>
      {savedMessage && <p className="text-sm text-brand-dark">{savedMessage}</p>}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand">Standard-Containergrößen</h2>
        <div className="space-y-2">
          {presets.map((p, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <input
                type="text"
                value={p.label}
                onChange={(e) => updatePreset(i, { label: e.target.value })}
                className={`${inputClass} col-span-2`}
                placeholder="Bezeichnung"
              />
              <input
                type="number"
                value={p.length}
                onChange={(e) => updatePreset(i, { length: Number(e.target.value) })}
                className={numberInputClass}
                placeholder="Länge"
              />
              <input
                type="number"
                value={p.width}
                onChange={(e) => updatePreset(i, { width: Number(e.target.value) })}
                className={numberInputClass}
                placeholder="Breite"
              />
              <input
                type="number"
                value={p.height}
                onChange={(e) => updatePreset(i, { height: Number(e.target.value) })}
                className={numberInputClass}
                placeholder="Höhe"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            saveContainerPresets(presets);
            flashSaved();
          }}
          className="mt-3 rounded-full bg-brand px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Containergrößen speichern
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand">Standardfarben (RAL)</h2>
        <div className="space-y-2">
          {colors.map((c, i) => (
            <div key={i} className="grid grid-cols-5 items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <span className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: c.hex }} />
              <input
                type="text"
                value={c.code}
                onChange={(e) => updateColor(i, { code: e.target.value })}
                className={inputClass}
                placeholder="RAL-Code"
              />
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateColor(i, { name: e.target.value })}
                className={`${inputClass} col-span-2`}
                placeholder="Name"
              />
              <input
                type="text"
                value={c.hex}
                onChange={(e) => updateColor(i, { hex: e.target.value })}
                className={inputClass}
                placeholder="#RRGGBB"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            saveStandardColors(colors);
            flashSaved();
          }}
          className="mt-3 rounded-full bg-brand px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Farben speichern
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand">Standard-Türmaße</h2>
        <div className="space-y-2">
          {(Object.keys(doorDims) as (keyof StandardDoorDims)[]).map((key) => (
            <div key={key} className="grid grid-cols-3 items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-sm text-slate-500">{doorLabel(key)}</span>
              <input
                type="number"
                value={doorDims[key].width}
                onChange={(e) =>
                  setDoorDims((prev) => ({ ...prev, [key]: { ...prev[key], width: Number(e.target.value) } }))
                }
                className={numberInputClass}
                placeholder="Breite"
              />
              <input
                type="number"
                value={doorDims[key].height}
                onChange={(e) =>
                  setDoorDims((prev) => ({ ...prev, [key]: { ...prev[key], height: Number(e.target.value) } }))
                }
                className={numberInputClass}
                placeholder="Höhe"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            saveStandardDoorDims(doorDims);
            flashSaved();
          }}
          className="mt-3 rounded-full bg-brand px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Türmaße speichern
        </button>
      </section>
    </div>
  );
}

function doorLabel(key: keyof StandardDoorDims) {
  if (key === "door_single_1918") return "Einzeltür 1918";
  if (key === "door_single_2418") return "Einzeltür 2418";
  return "Doppelflügeltür";
}
