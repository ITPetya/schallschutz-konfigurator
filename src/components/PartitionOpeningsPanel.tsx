import { useState } from "react";
import type { PartitionOpening } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";
import { TrashIcon } from "./icons/TrashIcon";
import { AnimatedButton } from "./AnimatedButton";
import { PartitionOpeningFieldsEditor } from "./PartitionOpeningFieldsEditor";

interface PartitionOpeningsPanelProps {
  openings: PartitionOpening[];
  partitionSpan: number;
  containerHeight: number;
  onUpdate: (id: string, patch: Partial<PartitionOpening>) => void;
  onRemove: (id: string) => void;
}

// Liste der in EINER Trennwand platzierten Durchbrüche - gleiches Karten-/
// Auf-zu-Klapp-Muster wie OpeningsPanel.tsx, hier im Drill-in-Editor der
// Trennwand (WorkspacePage.tsx) unter "Einbauten" gerendert.
export function PartitionOpeningsPanel({ openings, partitionSpan, containerHeight, onUpdate, onRemove }: PartitionOpeningsPanelProps) {
  return (
    <div className="space-y-2">
      {openings.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Durchbrüche in dieser Trennwand.</p>}
      {openings.map((o) => (
        <PartitionOpeningRow key={o.id} opening={o} partitionSpan={partitionSpan} containerHeight={containerHeight} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface PartitionOpeningRowProps {
  opening: PartitionOpening;
  partitionSpan: number;
  containerHeight: number;
  onUpdate: (id: string, patch: Partial<PartitionOpening>) => void;
  onRemove: (id: string) => void;
}

function PartitionOpeningRow({ opening: o, partitionSpan, containerHeight, onUpdate, onRemove }: PartitionOpeningRowProps) {
  const [expanded, setExpanded] = useState(false);
  const typeDef = OPENING_TYPES[o.kind];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          onDoubleClick={() => setExpanded(true)}
          className="flex flex-1 cursor-pointer items-center justify-between text-left"
        >
          <span className="font-medium text-brand-dark">{typeDef.label}</span>
        </button>
        <AnimatedButton
          type="button"
          onClick={() => onRemove(o.id)}
          className="shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500"
          aria-label={`${typeDef.label} entfernen`}
        >
          <TrashIcon size={16} />
        </AnimatedButton>
      </div>

      {expanded && (
        <div className="mt-2">
          <PartitionOpeningFieldsEditor
            opening={o}
            partitionSpan={partitionSpan}
            containerHeight={containerHeight}
            onChange={(patch) => onUpdate(o.id, patch)}
          />
        </div>
      )}
    </div>
  );
}
