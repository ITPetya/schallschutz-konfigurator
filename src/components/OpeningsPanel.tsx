import { useState } from "react";
import type { Opening, OpeningKind, WallId } from "../types/openings";
import { OPENING_TYPES, WALL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";

interface OpeningsPanelProps {
  size: ContainerSize;
  openings: Opening[];
  onAdd: (opening: Opening) => void;
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

function panelWidthForWall(wall: WallId, size: ContainerSize) {
  return wall === "front" || wall === "back" ? size.length : size.width;
}

const inputClass =
  "w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-400";

export function OpeningsPanel({ size, openings, onAdd, onUpdate, onRemove }: OpeningsPanelProps) {
  const [wall, setWall] = useState<WallId>("front");
  const [kind, setKind] = useState<OpeningKind>("door");

  function handleAdd() {
    const typeDef = OPENING_TYPES[kind];
    const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 0.1;
    const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 0.1;
    // Standardvorgabe: Tueren stehen auf dem Boden, alles andere sitzt mittig
    // auf Wandhoehe - beides danach frei ueber die Positions-Eingabe anpassbar.
    const v = kind === "door" ? height / 2 : size.height / 2;

    onAdd({ id: crypto.randomUUID(), kind, wall, u: 0, v, width, height });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded border border-slate-700 bg-slate-800 p-3">
        <select
          value={wall}
          onChange={(e) => setWall(e.target.value as WallId)}
          className={inputClass}
        >
          {(Object.keys(WALL_LABELS) as WallId[]).map((w) => (
            <option key={w} value={w}>
              {WALL_LABELS[w]}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as OpeningKind)}
          className={inputClass}
        >
          <optgroup label="Standard (feste Maße)">
            {Object.values(OPENING_TYPES)
              .filter((t) => t.category === "standard")
              .map((t) => (
                <option key={t.kind} value={t.kind}>
                  {t.label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Frei (parametrisch)">
            {Object.values(OPENING_TYPES)
              .filter((t) => t.category === "free")
              .map((t) => (
                <option key={t.kind} value={t.kind}>
                  {t.label}
                </option>
              ))}
          </optgroup>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500"
        >
          + Durchbruch hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        {openings.length === 0 && (
          <p className="text-sm text-slate-500">Noch keine Durchbrüche platziert.</p>
        )}
        {openings.map((o) => {
          const typeDef = OPENING_TYPES[o.kind];
          const panelWidth = panelWidthForWall(o.wall, size);
          const maxU = Math.max(0, panelWidth / 2 - o.width / 2);

          return (
            <div key={o.id} className="rounded border border-slate-700 bg-slate-800 p-3 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">{typeDef.label}</span>
                <span className="text-xs text-slate-400">{WALL_LABELS[o.wall]}</span>
                <button
                  type="button"
                  onClick={() => onRemove(o.id)}
                  className="text-slate-400 hover:text-red-400"
                  aria-label={`${typeDef.label} entfernen`}
                >
                  ✕
                </button>
              </div>

              {typeDef.category === "standard" && (
                <p className="mb-2 text-xs text-slate-500">
                  Feste Maße: {typeDef.fixedWidth} × {typeDef.fixedHeight} m
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>
                  Seitlich (m)
                  <input
                    type="number"
                    step={0.05}
                    min={-maxU}
                    max={maxU}
                    value={o.u}
                    onChange={(e) => onUpdate(o.id, { u: Number(e.target.value) })}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Höhe über Boden (m)
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={size.height}
                    value={o.v}
                    onChange={(e) => onUpdate(o.id, { v: Number(e.target.value) })}
                    className={inputClass}
                  />
                </label>

                {typeDef.category === "free" && (
                  <>
                    <label className={labelClass}>
                      {typeDef.shape === "round" ? "Durchmesser (m)" : "Breite (m)"}
                      <input
                        type="number"
                        step={0.01}
                        min={typeDef.minSize}
                        max={typeDef.maxSize}
                        value={o.width}
                        onChange={(e) => onUpdate(o.id, { width: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </label>
                    {typeDef.shape === "rect" && (
                      <label className={labelClass}>
                        Höhe (m)
                        <input
                          type="number"
                          step={0.01}
                          min={typeDef.minSize}
                          max={typeDef.maxSize}
                          value={o.height}
                          onChange={(e) => onUpdate(o.id, { height: Number(e.target.value) })}
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
    </div>
  );
}
