import { useState } from "react";
import type { DoorHinge, Opening, OpeningKind, WallId } from "../types/openings";
import { OPENING_TYPES, WALL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";

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
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500";

export function OpeningsPanel({ size, openings, onAdd, onUpdate, onRemove }: OpeningsPanelProps) {
  const [wall, setWall] = useState<WallId>("front");
  const [kind, setKind] = useState<OpeningKind>("door_single_1918");
  const [hinge, setHinge] = useState<DoorHinge>("left");

  const newTypeDef = OPENING_TYPES[kind];

  function handleAdd() {
    const typeDef = OPENING_TYPES[kind];
    const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 0.1;
    const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 0.1;
    // Standardvorgabe: Tueren sitzen am erlaubten Mindestabstand vom Boden
    // (170mm), alles andere mittig auf Wandhoehe - beides danach frei ueber
    // die Positions-Eingabe anpassbar (innerhalb der erlaubten Grenzen).
    const bounds = verticalBounds(typeDef, height, size.height);
    const v = typeDef.minBottomOffset !== undefined ? bounds.min : size.height / 2;

    onAdd({
      id: crypto.randomUUID(),
      kind,
      wall,
      u: 0,
      v,
      width,
      height,
      hinge: typeDef.hasHinge ? hinge : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
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
        {newTypeDef.hasHinge && (
          <select
            value={hinge}
            onChange={(e) => setHinge(e.target.value as DoorHinge)}
            className={inputClass}
          >
            <option value="left">DIN Links</option>
            <option value="right">DIN Rechts</option>
          </select>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          + Durchbruch hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        {openings.length === 0 && (
          <p className="text-sm text-slate-400">Noch keine Durchbrüche platziert.</p>
        )}
        {openings.map((o) => {
          const typeDef = OPENING_TYPES[o.kind];
          const panelWidth = panelWidthForWall(o.wall, size);
          const maxU = Math.max(0, panelWidth / 2 - o.width / 2);
          const vBounds = verticalBounds(typeDef, o.height, size.height);

          return (
            <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-brand-dark">{typeDef.label}</span>
                <span className="text-xs text-slate-500">{WALL_LABELS[o.wall]}</span>
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
                  Feste Maße: {typeDef.fixedWidth} × {typeDef.fixedHeight} m
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
                    min={vBounds.impossible ? undefined : vBounds.min}
                    max={vBounds.impossible ? undefined : vBounds.max}
                    value={o.v}
                    onChange={(e) => onUpdate(o.id, { v: Number(e.target.value) })}
                    onBlur={(e) => onUpdate(o.id, { v: clampVerticalPosition(Number(e.target.value), vBounds) })}
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
