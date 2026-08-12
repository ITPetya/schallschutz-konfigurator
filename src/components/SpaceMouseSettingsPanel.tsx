import { ToolResultPanel } from "./ToolResultPanel";
import { DEFAULT_SPACEMOUSE_SENSITIVITY, MIN_SPACEMOUSE_SENSITIVITY, MAX_SPACEMOUSE_SENSITIVITY } from "../config/spaceMouseSettingsStore";

interface SpaceMouseSettingsPanelProps {
  active: boolean;
  deviceName: string | null;
  sensitivity: number;
  onSensitivityChange: (v: number) => void;
  onDisconnect: () => void;
}

// Jonas' Vorgabe 2026-08-12: der "SpaceMouse verbinden"-Button oeffnet, sobald
// ein Geraet verbunden ist, dieses Panel statt sofort zu trennen - "genauso
// wie Messen/Ansicht/Schnitt" (siehe ToolResultPanel.tsx fuer die gemeinsame
// Wachse-aus-dem-Button-Animation und ViewerToolbar.tsx fuer die
// Kollisionsvermeidung mit den anderen gleichzeitig offenen Panels). Trennen
// ist dafuer als eigener Button HIER hinein gewandert, statt weiterhin der
// direkte Klick-Effekt des Buttons zu sein.
export function SpaceMouseSettingsPanel({ active, deviceName, sensitivity, onSensitivityChange, onDisconnect }: SpaceMouseSettingsPanelProps) {
  return (
    <ToolResultPanel active={active}>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">SpaceMouse</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{deviceName ?? "Gerät"} verbunden</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Empfindlichkeit</span>
            <span className="font-semibold text-brand-dark dark:text-brand-light">{sensitivity.toFixed(1)}×</span>
          </span>
          <input
            type="range"
            min={MIN_SPACEMOUSE_SENSITIVITY}
            max={MAX_SPACEMOUSE_SENSITIVITY}
            step={0.1}
            value={sensitivity}
            onChange={(e) => onSensitivityChange(Number(e.target.value))}
            className="w-full accent-brand"
            aria-label="SpaceMouse-Empfindlichkeit"
          />
        </label>

        {sensitivity !== DEFAULT_SPACEMOUSE_SENSITIVITY && (
          <button
            type="button"
            onClick={() => onSensitivityChange(DEFAULT_SPACEMOUSE_SENSITIVITY)}
            className="text-xs font-medium text-brand hover:underline"
          >
            Zurücksetzen (1.0×)
          </button>
        )}

        <button
          type="button"
          onClick={onDisconnect}
          className="w-full rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Trennen
        </button>
      </div>
    </ToolResultPanel>
  );
}
