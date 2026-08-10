import { LC_SOUND_WALL_THICKNESS_HINT, SOUND_CLASSES, type SoundClass } from "../constants/lcStandard";
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
// Wandstärke von mindestens 100mm ZWINGEND erforderlich (rote Warnung,
// nicht blockierend - Jonas: "die info würde z.B. dann in Rot angezeigt
// werden müssen"); fuer alle anderen Klassen ist 100mm nur eine
// unverbindliche Richtdicke (orange Empfehlung statt roter Pflichthinweis).
export function SoundClassControls({ soundClass, wallThickness, onChange }: SoundClassControlsProps) {
  const active = SOUND_CLASSES.find((c) => c.id === soundClass) ?? SOUND_CLASSES[0];
  const requiredWall = active.minWallThicknessRequired;
  const mandatoryViolation = requiredWall !== undefined && wallThickness < requiredWall;
  const adviceHint = !mandatoryViolation && wallThickness < LC_SOUND_WALL_THICKNESS_HINT;

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Schallschutzklasse
        {active.id !== "standard" && (
          <SonderBadge text={`${active.label} (${active.rangeLabel}) – Sonderausstattung mit Aufpreis gegenüber der Standardklasse.`} />
        )}
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
      {mandatoryViolation && (
        <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
          Für {active.label} ist eine Wandstärke von mindestens {requiredWall} mm zwingend erforderlich (aktuell {wallThickness} mm).
        </p>
      )}
      {adviceHint && (
        <p className="mt-1.5 text-[11px] text-orange-600 dark:text-orange-400">
          Für alle Schallschutzklassen wird eine Wandstärke von mindestens {LC_SOUND_WALL_THICKNESS_HINT} mm empfohlen, sonst wird die Klasse ggf.
          nicht erreicht.
        </p>
      )}
    </div>
  );
}
