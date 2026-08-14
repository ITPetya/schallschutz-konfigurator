import { useState } from "react";
import type { ContainerSize } from "../constants/containerSizes";
import type { PartitionDoor, PartitionOpening, PartitionOpeningKind, PartitionSide, PartitionWallConfig } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";
import { clampVerticalPosition, verticalBounds } from "../utils/openingConstraints";
import { NumberInput } from "./NumberInput";
import { AnimatedButton } from "./AnimatedButton";
import { TrashIcon } from "./icons/TrashIcon";

interface PartitionWallsPanelProps {
  size: ContainerSize;
  wallThickness: number;
  partitionWalls: PartitionWallConfig[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<PartitionWallConfig>) => void;
  onRemove: (id: string) => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400";

// Sicherheitsabstand zur jeweiligen Stirnwand (mm) - rein UI-seitiges
// Clamping, keine LC-Standard-Integration (Jonas hat dafuer keine Vorgabe
// gemacht, siehe Plan) - haelt nur davon ab, eine Trennwand versehentlich in
// die Stirnwand hinein zu schieben.
const POSITION_MARGIN_MM = 100;
const DOOR_KIND = "partition_door" as const;
const DOOR_WIDTH_MM = OPENING_TYPES[DOOR_KIND].fixedWidth!;

const PARTITION_OPENING_KINDS: { kind: PartitionOpeningKind; label: string }[] = [
  { kind: "cable", label: "Kabeldurchführung" },
  { kind: "pipe", label: "Rohrdurchführung" },
  { kind: "vent_weather", label: "Wetterschutzgitter" },
];

// Liste der Trennwaende (Jonas' Vorgabe 2026-08-14) - gleiches Karten-/
// Auf-zu-Klapp-Muster wie OpeningsPanel.tsx, direkt darunter in derselben
// "Einbauten"-Sektion gerendert (siehe WorkspacePage.tsx).
export function PartitionWallsPanel({ size, wallThickness, partitionWalls, onAdd, onUpdate, onRemove }: PartitionWallsPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Trennwände</span>
        <AnimatedButton type="button" onClick={onAdd} className="text-xs font-medium text-brand hover:text-brand-dark">
          + Trennwand hinzufügen
        </AnimatedButton>
      </div>
      {partitionWalls.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Trennwände platziert.</p>}
      {partitionWalls.map((pw, i) => (
        <PartitionWallRow key={pw.id} pw={pw} index={i} size={size} wallThickness={wallThickness} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface PartitionWallRowProps {
  pw: PartitionWallConfig;
  index: number;
  size: ContainerSize;
  wallThickness: number;
  onUpdate: (id: string, patch: Partial<PartitionWallConfig>) => void;
  onRemove: (id: string) => void;
}

function PartitionWallRow({ pw, index, size, wallThickness, onUpdate, onRemove }: PartitionWallRowProps) {
  const [expanded, setExpanded] = useState(false);
  // Lichte Breite der Trennwand selbst (spannt wie Vorne/Hinten zwischen
  // Links/Rechts, siehe PartitionWall.tsx/Container.tsx's endWallWidth) -
  // hier nur naeherungsweise (ohne Eckbeschlag-Recess) fuer UI-Grenzen
  // nachgerechnet, exakt genug fuers Clamping der Eingabefelder.
  const partitionSpan = Math.max(0, size.width - 2 * wallThickness);
  const positionHalfRange = Math.max(0, size.length / 2 - wallThickness - pw.thickness / 2 - POSITION_MARGIN_MM);
  const doorMaxU = Math.max(0, partitionSpan / 2 - DOOR_WIDTH_MM / 2);

  function patchOpenings(openings: PartitionOpening[]) {
    onUpdate(pw.id, { openings });
  }
  function handleAddOpening(kind: PartitionOpeningKind) {
    const typeDef = OPENING_TYPES[kind];
    const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 100;
    const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 100;
    const opening: PartitionOpening = {
      id: crypto.randomUUID(),
      kind,
      u: 0,
      v: Math.round(size.height / 2),
      width,
      height,
      side: kind === "vent_weather" ? "smooth" : undefined,
    };
    patchOpenings([...pw.openings, opening]);
  }
  function handleUpdateOpening(id: string, patch: Partial<PartitionOpening>) {
    patchOpenings(pw.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function handleRemoveOpening(id: string) {
    patchOpenings(pw.openings.filter((o) => o.id !== id));
  }

  function toggleDoor() {
    if (pw.door) {
      onUpdate(pw.id, { door: undefined });
    } else {
      const door: PartitionDoor = { u: 0 };
      onUpdate(pw.id, { door });
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          onDoubleClick={() => setExpanded(true)}
          className="flex flex-1 cursor-pointer items-center justify-between text-left"
        >
          <span className="font-medium text-brand-dark">Trennwand {index + 1}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {pw.smoothSide === "front" ? "glatt → vorne" : "glatt → hinten"}
          </span>
        </button>
        <AnimatedButton
          type="button"
          onClick={() => onRemove(pw.id)}
          className="shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500"
          aria-label={`Trennwand ${index + 1} entfernen`}
        >
          <TrashIcon size={16} />
        </AnimatedButton>
      </div>

      {expanded && (
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className={labelClass}>
              Position (mm von Mitte)
              <NumberInput
                step={10}
                min={-positionHalfRange}
                max={positionHalfRange}
                value={Math.round(pw.positionU)}
                onChange={(v) => onUpdate(pw.id, { positionU: v })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Wandstärke (mm)
              <NumberInput
                step={5}
                min={20}
                max={200}
                value={Math.round(pw.thickness)}
                onChange={(v) => onUpdate(pw.id, { thickness: v })}
                className={inputClass}
              />
            </label>
          </div>

          <AnimatedButton
            type="button"
            onClick={() => onUpdate(pw.id, { smoothSide: pw.smoothSide === "front" ? "back" : "front" })}
            className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-ink hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Spiegeln (glatte/C-Schienen-Seite tauschen)
          </AnimatedButton>

          <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tür (932 × 1932mm, DIN rechts von glatt)</span>
              <AnimatedButton
                type="button"
                onClick={toggleDoor}
                className="text-xs font-medium text-brand hover:text-brand-dark"
              >
                {pw.door ? "entfernen" : "hinzufügen"}
              </AnimatedButton>
            </div>
            {pw.door && (
              <label className={`${labelClass} mt-2`}>
                Position (mm von Mitte)
                <NumberInput
                  step={10}
                  min={-doorMaxU}
                  max={doorMaxU}
                  value={Math.round(pw.door.u)}
                  onChange={(v) => onUpdate(pw.id, { door: { u: v } })}
                  className={inputClass}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Durchbrüche in dieser Wand</span>
              <div className="flex gap-1">
                {PARTITION_OPENING_KINDS.map(({ kind, label }) => (
                  <AnimatedButton
                    key={kind}
                    type="button"
                    onClick={() => handleAddOpening(kind)}
                    title={`${label} hinzufügen`}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-ink hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    + {label}
                  </AnimatedButton>
                ))}
              </div>
            </div>
            {pw.openings.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Keine Durchbrüche in dieser Trennwand.</p>
            )}
            {pw.openings.map((o) => (
              <PartitionOpeningRow
                key={o.id}
                opening={o}
                partitionSpan={partitionSpan}
                containerHeight={size.height}
                onChange={(patch) => handleUpdateOpening(o.id, patch)}
                onRemove={() => handleRemoveOpening(o.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PartitionOpeningRowProps {
  opening: PartitionOpening;
  partitionSpan: number;
  containerHeight: number;
  onChange: (patch: Partial<PartitionOpening>) => void;
  onRemove: () => void;
}

function PartitionOpeningRow({ opening: o, partitionSpan, containerHeight, onChange, onRemove }: PartitionOpeningRowProps) {
  const typeDef = OPENING_TYPES[o.kind];
  const maxU = Math.max(0, partitionSpan / 2 - o.width / 2);
  const vBounds = verticalBounds(typeDef, o.height, containerHeight);
  const widthMin = typeDef.minWidth ?? typeDef.minSize;
  const widthMax = typeDef.maxWidth ?? typeDef.maxSize;
  const heightMin = typeDef.minHeight ?? typeDef.minSize;
  const heightMax = typeDef.maxHeight ?? typeDef.maxSize;

  return (
    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-ink dark:text-slate-100">{typeDef.label}</span>
        <AnimatedButton type="button" onClick={onRemove} className="text-slate-400 hover:text-red-500 dark:text-slate-500" aria-label={`${typeDef.label} entfernen`}>
          <TrashIcon size={14} />
        </AnimatedButton>
      </div>

      {o.kind === "vent_weather" && (
        <label className={`${labelClass} mb-1.5`}>
          Seite
          <select
            value={o.side ?? "smooth"}
            onChange={(e) => onChange({ side: e.target.value as PartitionSide })}
            className={inputClass}
          >
            <option value="smooth">Glatte Seite</option>
            <option value="railed">C-Schienen-Seite</option>
          </select>
        </label>
      )}

      {vBounds.impossible && (
        <p className="mb-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          Passt bei dieser Containerhöhe nicht.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className={labelClass}>
          Seitlich (mm)
          <NumberInput step={10} min={-maxU} max={maxU} value={Math.round(o.u)} onChange={(v) => onChange({ u: v })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Höhe über Boden (mm)
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
        <label className={labelClass}>
          {typeDef.shape === "round" ? "Durchmesser (mm)" : "Breite (mm)"}
          <NumberInput
            step={10}
            min={widthMin}
            max={widthMax}
            value={Math.round(o.width)}
            onChange={(v) => onChange(typeDef.shape === "round" ? { width: v, height: v } : { width: v })}
            className={inputClass}
          />
        </label>
        {typeDef.shape === "rect" && (
          <label className={labelClass}>
            Höhe (mm)
            <NumberInput step={10} min={heightMin} max={heightMax} value={Math.round(o.height)} onChange={(v) => onChange({ height: v })} className={inputClass} />
          </label>
        )}
      </div>
    </div>
  );
}
