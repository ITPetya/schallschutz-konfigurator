import type { PartitionWallConfig } from "../types/partitionWall";
import { AnimatedButton } from "./AnimatedButton";
import { TrashIcon } from "./icons/TrashIcon";

interface PartitionWallsPanelProps {
  partitionWalls: PartitionWallConfig[];
  onEdit: (pw: PartitionWallConfig) => void;
  onRemove: (id: string) => void;
}

// Kompakte Liste bereits angelegter Trennwaende (Jonas' Vorgabe 2026-08-14:
// Anlegen laeuft jetzt ueber den normalen "Einbauten hinzufügen"-Assistenten,
// siehe AddOpeningPopup.tsx - diese Liste hier ist nur noch der Einstieg in
// den Drill-in-Editor, kein Inline-Bearbeiten mehr wie in der ersten Runde).
// Jede Zeile ist selbst der Text-Link ("wie bei Sonderheiten hinzufügen",
// DisplaySettingsPanel.tsx's NoteField-Stil) - Klick springt in
// PartitionWallSettings/PartitionOpeningsPanel (WorkspacePage.tsx).
export function PartitionWallsPanel({ partitionWalls, onEdit, onRemove }: PartitionWallsPanelProps) {
  if (partitionWalls.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Trennwände</span>
      {partitionWalls.map((pw, i) => (
        <div key={pw.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => onEdit(pw)} className="flex-1 text-left font-medium text-brand hover:underline">
            Trennwand {i + 1} – Durchbrüche/Einstellungen
          </button>
          <AnimatedButton
            type="button"
            onClick={() => onRemove(pw.id)}
            className="shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-500"
            aria-label={`Trennwand ${i + 1} entfernen`}
          >
            <TrashIcon size={16} />
          </AnimatedButton>
        </div>
      ))}
    </div>
  );
}
