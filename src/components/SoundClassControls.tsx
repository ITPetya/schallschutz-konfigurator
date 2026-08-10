import { SOUND_CLASSES, type SoundClass } from "../constants/lcStandard";
import { getSoundClassSelectionWarning, getSoundClassWallConflictWarning } from "../utils/containerWarnings";
import { SonderBadge } from "./SonderBadge";

interface SoundClassControlsProps {
  soundClass: SoundClass;
  wallThickness: number;
  onChange: (c: SoundClass) => void;
}

// Schallschutzklassen-Auswahl (Jonas' Vorgabe 2026-08-10: "Schalldämmung
// soll man bei der Konfiguration auch noch einstellen können") - vier
// Stufen (siehe lcStandard.ts), "Standard" ist im Grundpreis enthalten,
// alle anderen sind Sonderausstattung (SonderBadge). Ab "Silent" ist eine
// Mindest-Wandstärke ZWINGEND erforderlich (rote Warnung, nicht
// blockierend - Jonas: "die info würde z.B. dann in Rot angezeigt werden
// müssen"); fuer alle anderen Klassen ist die Richtdicke nur eine
// unverbindliche Empfehlung (orange statt roter Pflichthinweis). Texte
// kommen aus utils/containerWarnings.ts (einzige Quelle, auch fuer den
// Sammel-Hinweis in der Baugruppen-Liste).
export function SoundClassControls({ soundClass, wallThickness, onChange }: SoundClassControlsProps) {
  const selectionWarning = getSoundClassSelectionWarning(soundClass);
  const wallConflict = getSoundClassWallConflictWarning(soundClass, wallThickness);

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Schallschutzklasse
        {selectionWarning && <SonderBadge text={selectionWarning.text} />}
      </p>
      <div className="grid grid-cols-2 gap-1">
        {SOUND_CLASSES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`flex flex-col items-start rounded px-2 py-1.5 text-left ${
              c.id === soundClass
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            }`}
          >
            <span className="text-xs font-medium">{c.label}</span>
            <span className={`text-[10px] ${c.id === soundClass ? "text-white/80" : "text-slate-400 dark:text-slate-400"}`}>{c.rangeLabel}</span>
          </button>
        ))}
      </div>
      {wallConflict && (
        <p
          className={`mt-1.5 text-[11px] ${
            wallConflict.severity === "red" ? "font-medium text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
          }`}
        >
          {wallConflict.text}
        </p>
      )}
    </div>
  );
}
