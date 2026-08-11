import { SOUND_CLASSES, type SoundClass } from "../constants/lcStandard";
import { getSoundClassWallConflictWarning } from "../utils/containerWarnings";

interface SoundClassControlsProps {
  soundClass: SoundClass;
  wallThickness: number;
  onChange: (c: SoundClass) => void;
  // Jonas' Vorgabe 2026-08-11: die Bodenisolierung (hohl/gefuellt) gehoert
  // inhaltlich zur Schallschutzklasse (ihr Standardwert haengt davon ab) und
  // sitzt deshalb in DIESER Sektion, nicht bei den Groessen-/
  // Wandstaerke-Feldern (ContainerSizeControls.tsx). Die Bodenstaerke selbst
  // (floorThickness) ist seit Jonas' Korrektur spaeter am selben Tag wieder
  // frei einstellbar und lebt bei ContainerSizeControls - hier nur zur
  // Anzeige im Checkbox-Label, damit die Zahl nicht hartcodiert veraltet.
  floorThickness: number;
  floorInsulated: boolean;
  onFloorInsulatedChange: (v: boolean) => void;
}

// Schallschutzklassen-Auswahl (Jonas' Vorgabe 2026-08-10: "Schalldämmung
// soll man bei der Konfiguration auch noch einstellen können") - vier
// Stufen (siehe lcStandard.ts). Jonas' Vorgabe 2026-08-11: als Dropdown
// statt vier einzelner Buttons (mirror des Vorlage-Dropdowns in
// ContainerSizeControls.tsx), weil mit weiteren Stufen vier separate
// Buttons unuebersichtlich wuerden. Ausserdem: KEIN oranger
// Sonderausstattungs-Hinweis mehr fuer die Auswahl selbst (Jonas: "Alle
// Schallschutzklassen sollen ohne orangenes Ausrufezeichen sein, das
// möchten wir ja verkaufen") - nur noch die ROTE Pflichtwarnung, wenn die
// Wandstaerke fuer Silent/Silent-Plus technisch nicht ausreicht (siehe
// containerWarnings.ts).
export function SoundClassControls({ soundClass, wallThickness, onChange, floorThickness, floorInsulated, onFloorInsulatedChange }: SoundClassControlsProps) {
  const wallConflict = getSoundClassWallConflictWarning(soundClass, wallThickness);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Schallschutzklasse</p>
      <select
        value={soundClass}
        onChange={(e) => onChange(e.target.value as SoundClass)}
        className="w-full rounded-full border border-slate-300 bg-white px-3 py-1.5 text-ink shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        {SOUND_CLASSES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} ({c.rangeLabel})
          </option>
        ))}
      </select>
      {wallConflict && <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">{wallConflict.text}</p>}

      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={floorInsulated} onChange={(e) => onFloorInsulatedChange(e.target.checked)} />
        Bodenisolierung ({floorThickness} mm Bodenplatte gefüllt statt hohl)
      </label>
    </div>
  );
}
