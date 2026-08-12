import { ToolResultPanel } from "./ToolResultPanel";
import type { AlignmentFacePoint } from "../utils/alignmentDependencies";

export interface AlignmentResultPanelProps {
  active: boolean;
  selected: AlignmentFacePoint[]; // 0, 1 oder 2 Flaechen
  labelFor: (instanceId: string) => string;
  mode: "mate" | "flush";
  onModeChange: (m: "mate" | "flush") => void;
  distanceMm: number;
  onDistanceChange: (mm: number) => void;
  onCreate: () => void;
  onClearSelection: () => void;
}

// Jonas' Vorgabe 2026-08-12: "Ausrichten" jetzt als eigenes Werkzeug wie
// Messen/Schnitt/Ansicht - zwei Flaechen im Viewer anklicken (siehe
// AlignmentFaceMarkers.tsx), dann Fluchtend/Passend + Abstand waehlen und
// eine dauerhafte Abhaengigkeit erstellen (siehe alignmentDependencies.ts).
// Die ZUERST angeklickte Flaeche ist die "reference" (bleibt an ihrem Platz),
// die ZWEITE die "target" (wird vom Solver bewegt) - deshalb hier explizit
// als "Bleibt stehen" / "Wird ausgerichtet" beschriftet statt nur "1"/"2",
// damit die Reihenfolge nicht erraten werden muss.
export function AlignmentResultPanel({
  active,
  selected,
  labelFor,
  mode,
  onModeChange,
  distanceMm,
  onDistanceChange,
  onCreate,
  onClearSelection,
}: AlignmentResultPanelProps) {
  const reference = selected[0];
  const target = selected[1];

  return (
    <ToolResultPanel active={active}>
      <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Ausrichten</p>

      {!reference && <p className="text-xs text-slate-500 dark:text-slate-400">Erste Fläche anklicken (bleibt stehen).</p>}
      {reference && !target && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Bleibt stehen: <span className="font-semibold text-ink dark:text-slate-100">{labelFor(reference.instanceId)}</span>
          <br />
          Jetzt die Fläche des Containers anklicken, der ausgerichtet werden soll.
        </p>
      )}

      {reference && target && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bleibt stehen: <span className="font-semibold text-ink dark:text-slate-100">{labelFor(reference.instanceId)}</span>
            <br />
            Wird ausgerichtet: <span className="font-semibold text-ink dark:text-slate-100">{labelFor(target.instanceId)}</span>
          </p>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onModeChange("mate")}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-bold uppercase tracking-wide ${
                mode === "mate" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              Passend
            </button>
            <button
              type="button"
              onClick={() => onModeChange("flush")}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-bold uppercase tracking-wide ${
                mode === "flush" ? "bg-brand text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              Fluchtend
            </button>
          </div>

          <label className="block text-xs text-slate-500 dark:text-slate-400">
            Abstand (mm)
            <input
              type="number"
              step={10}
              value={distanceMm}
              onChange={(e) => onDistanceChange(Number(e.target.value) || 0)}
              className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={onCreate}
            className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            Abhängigkeit erstellen
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClearSelection}
          className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          Auswahl zurücksetzen
        </button>
      )}
    </ToolResultPanel>
  );
}
