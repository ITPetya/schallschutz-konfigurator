import { useState } from "react";
import type { Opening } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { TrashIcon } from "./icons/TrashIcon";
import { AnimatedButton } from "./AnimatedButton";
import { SonderBadge } from "./SonderBadge";
import { SONDER_DOOR_TEXT, isSonderDoor } from "../utils/containerWarnings";
import { OpeningFieldsEditor } from "./OpeningFieldsEditor";

interface OpeningsPanelProps {
  size: ContainerSize;
  openings: Opening[];
  onUpdate: (id: string, patch: Partial<Opening>) => void;
  onRemove: (id: string) => void;
}

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
        <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Durchbrüche platziert.</p>
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          // Jonas' Vorgabe 2026-08-11: Doppelklick auf einen Bauteil-Eintrag
          // soll dessen Detail-/Editierpanel "ausklappen" - Einzelklick tut
          // das (als Auf-/Zuklapp-TOGGLE) bereits, es gibt hier keine andere,
          // konkurrierende Einzelklick-Aktion (z. B. Auswahl im 3D-Viewport)
          // zum Kollidieren. Additiv statt eines zweiten, widerspruechlichen
          // Mechanismus: erzwingt explizit AUFgeklappt statt zu togglen -
          // ein Doppelklick loest im Browser zuerst zwei einzelne onClick
          // (auf/zu/auf) UND danach dieses onDoubleClick aus, das den
          // Endzustand deterministisch auf "offen" fixiert, egal wie die
          // beiden Zwischen-Toggles gerade standen.
          onDoubleClick={() => setExpanded(true)}
          className="flex flex-1 cursor-pointer items-center justify-between text-left"
        >
          <span className="font-medium text-brand-dark">{typeDef.label}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{PANEL_LABELS[o.panel]}</span>
        </button>
        {isSonderDoor(o) && <SonderBadge text={SONDER_DOOR_TEXT} />}
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
          <OpeningFieldsEditor opening={o} size={size} onChange={(patch) => onUpdate(o.id, patch)} />
        </div>
      )}
    </div>
  );
}
