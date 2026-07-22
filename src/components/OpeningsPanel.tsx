import { useState } from "react";
import type { DoorHinge, Opening, OpeningKind, PanelId } from "../types/openings";
import { isVerticalWall } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";

interface OpeningsPanelProps {
  size: ContainerSize;
  openings: Opening[];
  onAdd: (opening: Opening) => void;
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

// u laeuft immer auf der Achse, auf der Norden/Sueden ("Breite") bzw.
// Osten/Westen/Oben/Unten ("Laenge") liegen.
function panelSpanU(panel: PanelId, size: ContainerSize) {
  return panel === "north" || panel === "south" ? size.width : size.length;
}

// v-Spanne: bei den vier Seitenwaenden die Containerhoehe (verticalBounds
// wendet dort zusaetzlich Tuer-Mindestabstaende an); bei Oben/Unten die
// Containerbreite - dieselbe Funktion liefert ohne minBottomOffset/
// minTopMargin einfach "0 bis Spanne", genau das ist auch fuer Oben/Unten
// richtig (kein Boden-/Oberkante-Konzept dort).
function panelSpanV(panel: PanelId, size: ContainerSize) {
  return isVerticalWall(panel) ? size.height : size.width;
}

function positionLabels(panel: PanelId): [string, string] {
  return isVerticalWall(panel) ? ["Seitlich (m)", "Höhe über Boden (m)"] : ["Position Länge (m)", "Position Breite (m)"];
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500";

export function OpeningsPanel({ size, openings, onAdd, onUpdate, onRemove }: OpeningsPanelProps) {
  const [panel, setPanel] = useState<PanelId>("east");
  const [kind, setKind] = useState<OpeningKind>("door_single_1918");
  const [hinge, setHinge] = useState<DoorHinge>("left");

  const availableKinds = Object.values(OPENING_TYPES).filter(
    (t) => !t.verticalOnly || isVerticalWall(panel),
  );
  const newTypeDef = OPENING_TYPES[kind];

  function handlePanelChange(next: PanelId) {
    setPanel(next);
    // Tueren sind auf Oben/Unten nicht erlaubt (logisch, Jonas' Vorgabe
    // 2026-07-22) - beim Wechsel auf ein horizontales Panel automatisch auf
    // einen dort gueltigen Typ umschalten, statt einen unmoeglichen
    // ausgewaehlt zu lassen.
    if (!isVerticalWall(next) && newTypeDef.verticalOnly) {
      setKind("vent_weather");
    }
  }

  function handleAdd() {
    const typeDef = OPENING_TYPES[kind];
    const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 0.1;
    const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 0.1;
    // Standardvorgabe: Tueren sitzen am erlaubten Mindestabstand vom Boden
    // (170mm), alles andere mittig auf der Panel-Spanne - beides danach frei
    // ueber die Positions-Eingabe anpassbar (innerhalb der erlaubten Grenzen).
    const bounds = verticalBounds(typeDef, height, panelSpanV(panel, size));
    const v = typeDef.minBottomOffset !== undefined ? bounds.min : panelSpanV(panel, size) / 2;

    onAdd({
      id: crypto.randomUUID(),
      kind,
      panel,
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
          value={panel}
          onChange={(e) => handlePanelChange(e.target.value as PanelId)}
          className={inputClass}
        >
          {(Object.keys(PANEL_LABELS) as PanelId[]).map((p) => (
            <option key={p} value={p}>
              {PANEL_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as OpeningKind)}
          className={inputClass}
        >
          <optgroup label="Standard (feste Maße)">
            {availableKinds
              .filter((t) => t.category === "standard")
              .map((t) => (
                <option key={t.kind} value={t.kind}>
                  {t.label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Frei (parametrisch)">
            {availableKinds
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
          const maxU = Math.max(0, panelSpanU(o.panel, size) / 2 - o.width / 2);
          const vBounds = verticalBounds(typeDef, o.height, panelSpanV(o.panel, size));
          const [uLabel, vLabel] = positionLabels(o.panel);

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
                  {uLabel}
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
                  {vLabel}
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
