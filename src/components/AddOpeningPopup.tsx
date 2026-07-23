import { useState } from "react";
import type { DoorHinge, Opening, OpeningKind, PanelId } from "../types/openings";
import { isKindAllowedOnPanel } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import type { ContainerSize } from "../constants/containerSizes";
import { verticalBounds } from "../utils/openingConstraints";
import { panelSpanV } from "../utils/panelGeometry";
import { XIcon } from "./icons/XIcon";
import { AnimatedButton } from "./AnimatedButton";

interface AddOpeningPopupProps {
  size: ContainerSize;
  onAdd: (opening: Opening) => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none";

// Popup zum Anlegen eines neuen Durchbruchs - liegt IM Viewer an der linken
// Seite (Jonas' Vorgabe 2026-07-22), nicht mehr als Dauerformular oben in
// der Seitenleiste. Ausgeloest durch den reinen "+"-Button in
// OpeningsPanel.tsx, der Zustand (offen/zu) lebt in App.tsx, weil das Popup
// im Viewer (main), der "+"-Button aber in der Seitenleiste sitzt.
export function AddOpeningPopup({ size, onAdd, onClose }: AddOpeningPopupProps) {
  const [panel, setPanel] = useState<PanelId>("left");
  const [kind, setKind] = useState<OpeningKind>("door_single_1918");
  const [hinge, setHinge] = useState<DoorHinge>("left");

  const availableKinds = Object.values(OPENING_TYPES).filter((t) => isKindAllowedOnPanel(t, panel));
  const typeDef = OPENING_TYPES[kind];

  function handlePanelChange(next: PanelId) {
    setPanel(next);
    // Der aktuell gewaehlte Typ ist auf dem neuen Panel evtl. nicht mehr
    // erlaubt (Tueren nicht auf Oben/Unten, Wetterschutzgitter nicht auf dem
    // Dach - Jonas' Vorgabe 2026-07-22/Fehlerbericht 2026-07-25) - dann auf
    // den ersten dort gueltigen Typ umschalten, statt einen unmoeglichen
    // ausgewaehlt zu lassen.
    if (!isKindAllowedOnPanel(typeDef, next)) {
      const fallback = Object.values(OPENING_TYPES).find((t) => isKindAllowedOnPanel(t, next));
      if (fallback) setKind(fallback.kind);
    }
  }

  function handleAdd() {
    const width = typeDef.fixedWidth ?? typeDef.defaultWidth ?? 100;
    const height = typeDef.fixedHeight ?? typeDef.defaultHeight ?? 100;
    // Standardvorgabe: Tueren sitzen am erlaubten Mindestabstand vom Boden
    // (170mm ueber der Unterkante), alles andere mittig auf der Panel-Spanne
    // - beides danach frei ueber die Positions-Eingabe in der Seitenleiste
    // anpassbar (innerhalb der erlaubten Grenzen).
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
    onClose();
  }

  return (
    <div className="absolute left-4 top-4 w-72 space-y-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-brand">
          Neuer Durchbruch
        </span>
        <AnimatedButton
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-red-500"
          aria-label="Schließen"
        >
          <XIcon size={16} />
        </AnimatedButton>
      </div>

      <select
        aria-label="Wand"
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

      <select aria-label="Durchbruch-Typ" value={kind} onChange={(e) => setKind(e.target.value as OpeningKind)} className={inputClass}>
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

      {typeDef.hasHinge && (
        <select aria-label="Bandseite" value={hinge} onChange={(e) => setHinge(e.target.value as DoorHinge)} className={inputClass}>
          <option value="left">DIN Links</option>
          <option value="right">DIN Rechts</option>
        </select>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
      >
        Hinzufügen
      </button>
    </div>
  );
}
