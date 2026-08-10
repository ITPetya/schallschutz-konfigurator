import { useState } from "react";
import { RAL_SPECIAL_COLORS, RAL_STANDARD_COLORS, type RalColor } from "../constants/ralColors";
import { AnimatedButton } from "./AnimatedButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./primitives/DropdownMenu";
import { Chevron } from "./icons/Chevron";
import { CircleAlertIcon } from "./icons/CircleAlertIcon";
import { SonderBadge } from "./SonderBadge";

interface DisplaySettingsPanelProps {
  insideColor: string;
  onInsideColorChange: (hex: string) => void;
  outsideColor: string;
  onOutsideColorChange: (hex: string) => void;
  insideUnpainted: boolean;
  onInsideUnpaintedChange: (v: boolean) => void;
  outsideNotes: string;
  onOutsideNotesChange: (v: string) => void;
  insideNotes: string;
  onInsideNotesChange: (v: string) => void;
}

// "Erweiterte Einstellungen" (Jonas' Vorgabe 2026-07-24, vorher "Darstellung")
// - der Ansicht-Stil (Realistisch/Schattiert mit Kanten), Hintergrund
// (Studio/Gelände) und Schatten-Toggle sind hier RAUS und leben jetzt als
// eigenes "Ansicht"-Panel im Viewer direkt neben "Schnitt" (siehe Scene.tsx,
// Jonas' Vorgabe 2026-07-24: "Gelände und Studio gehört auch zu Ansicht") -
// hier bleibt nur die Farbe/Sonderheiten: Außen-/Innenfarbe (bzw. "innen
// unlackiert" als Alternative) und zwei Sonderheiten-Notizen.
export function DisplaySettingsPanel({
  insideColor,
  onInsideColorChange,
  outsideColor,
  onOutsideColorChange,
  insideUnpainted,
  onInsideUnpaintedChange,
  outsideNotes,
  onOutsideNotesChange,
  insideNotes,
  onInsideNotesChange,
}: DisplaySettingsPanelProps) {
  return (
    <div className="space-y-4 text-sm">
      <ColorPicker label="Außenfarbe" value={outsideColor} onChange={onOutsideColorChange} />
      <NoteField label="Sonderheiten Außen" value={outsideNotes} onChange={onOutsideNotesChange} />

      <div>
        {/* Jonas' Vorgabe 2026-07-24: Alternative zur Innenfarbe. */}
        <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={insideUnpainted}
            onChange={(e) => onInsideUnpaintedChange(e.target.checked)}
          />
          Innen unlackiert
        </label>
        {!insideUnpainted && <ColorPicker label="Innenfarbe" value={insideColor} onChange={onInsideColorChange} />}
      </div>
      <NoteField label="Sonderheiten Innen" value={insideNotes} onChange={onInsideNotesChange} />
    </div>
  );
}

// Jonas' Vorgabe 2026-07-24: "zwei Notizenfelder einblenden lassen können" -
// standardmaessig eingeklappt (nur ein "+ hinzufügen"-Link), damit die
// Seitenleiste nicht mit leeren Textfeldern zugestellt wird; klappt aber
// automatisch auf, falls beim Laden einer Datei bereits ein Text drinsteht.
function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(!!value);

  if (!visible) {
    return (
      <button type="button" onClick={() => setVisible(true)} className="text-xs font-medium text-brand hover:underline">
        + {label} hinzufügen
      </button>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

// Eigene Dropdown-Liste statt eines nativen <select> (Jonas' Vorgabe
// 2026-08-10: "Die Farben sollen nicht mehr zwischen Sonderfarben und
// Standardfarben so differenziert werden wie jetzt [ueber zwei Umschalt-
// Buttons], sondern eher in einer Dropdownliste mit zwei Bereichen getrennt
// durch eine dezente Linie. Oberhalb dann die Standardfarben und unterhalb
// die Sonderfarben, bei den Sonderfarben dann rechts auch ein oranges
// Ausrufezeichen mit der Info") - ein natives <select> kann kein Icon pro
// Zeile zeigen, deshalb radix-ui's DropdownMenu (dieselbe Basis wie
// ueberall sonst im Konfigurator). Das Ausrufezeichen IN der Liste ist rein
// visuell (kein eigener Klick-Popover - ein interaktiver Popover-Trigger
// verschachtelt in einem Radix-Menüeintrag fuehrt zu Fokus-/Select-
// Konflikten zwischen den beiden Radix-Primitives); der volle klickbare
// SonderBadge mit Erklaertext sitzt stattdessen an der AKTUELLEN Auswahl im
// Trigger-Button selbst (Jonas: "am besten wenn man sowas ausgewählt hat
// auch neben dem Auswahlfenster oder so").
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const all = [...RAL_STANDARD_COLORS, ...RAL_SPECIAL_COLORS];
  const current = all.find((c) => c.hex === value);
  const isSonderfarbe = !!current && !RAL_STANDARD_COLORS.some((c) => c.hex === value);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {/* SonderBadge sitzt bewusst AUSSERHALB des Trigger-<button>s, als
          Geschwister-Element (Jonas' Fehlerbericht 2026-08-10 an derselben
          Stelle in OpeningsPanel.tsx: ein interaktiver Popover-Trigger
          verschachtelt in einem ANDEREN Button ist ungueltiges HTML und
          fuehrt zu Klick-Konflikten - hier waere es sogar ein DropdownMenu-
          Trigger-Button UND ein Popover-Trigger-Button ineinander). */}
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* hoverScale/tapScale=1 (Jonas' Fehlerbericht 2026-08-10: "die
                Zoomanimation auf den Feldern für die Farbe ist komisch und
                too much") - der Standard-Zoom von AnimatedButton passt fuer
                kompakte Icon-Buttons, wirkt aber bei einem breiten,
                volle-Breite einnehmenden Zeilen-Button wie diesem unruhig
                und kollidiert leicht mit Nachbarelementen, siehe dieselbe
                Begruendung bei den Schnitt/Ansicht-Umschalt-Leisten in
                AnimatedButton.tsx. */}
            <AnimatedButton
              type="button"
              hoverScale={1}
              tapScale={1}
              className="flex min-w-0 flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-2 py-1 text-left text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <span className="h-5 w-5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: value }} aria-hidden />
              <span className="flex-1 truncate">{current ? `${current.code} – ${current.name}` : value}</span>
              <Chevron direction="down" className="shrink-0 text-slate-400" />
            </AnimatedButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="z-50 max-h-72 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {RAL_STANDARD_COLORS.map((c) => (
              <ColorMenuItem key={c.code} color={c} selected={c.hex === value} onSelect={() => onChange(c.hex)} />
            ))}
            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            {RAL_SPECIAL_COLORS.map((c) => (
              <ColorMenuItem key={c.code} color={c} selected={c.hex === value} sonder onSelect={() => onChange(c.hex)} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {isSonderfarbe && <SonderBadge text={`${current!.code} ${current!.name} – Sonderfarbe, mit Aufpreis gegenüber den Standardfarben.`} />}
      </div>
      {!current && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Aktuell: {value}</p>}
    </div>
  );
}

function ColorMenuItem({
  color,
  selected,
  sonder,
  onSelect,
}: {
  color: RalColor;
  selected: boolean;
  sonder?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700 ${
        selected ? "font-semibold text-brand-dark" : "text-ink dark:text-slate-100"
      }`}
    >
      <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: color.hex }} aria-hidden />
      <span className="flex-1 truncate">
        {color.code} – {color.name}
      </span>
      {sonder && (
        <span title="Sonderfarbe – mit Aufpreis verbunden" className="shrink-0 text-orange-500 dark:text-orange-400">
          <CircleAlertIcon size={14} />
        </span>
      )}
    </DropdownMenuItem>
  );
}
