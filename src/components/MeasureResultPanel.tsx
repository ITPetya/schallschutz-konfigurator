import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { MeasurePoint } from "../utils/measurePoints";
import { CopyButton } from "./CopyButton";
import { AnimatedButton } from "./AnimatedButton";
import { SettingsIcon } from "./icons/SettingsIcon";
import { ArrowLeftIcon } from "./icons/ArrowLeftIcon";
import { formatLength, defaultSecondaryUnit, LENGTH_UNIT_OPTIONS, type LengthUnit } from "../utils/lengthUnits";
import type { UnitPreferences } from "../config/unitPreferencesStore";

interface MeasureResultPanelProps {
  active: boolean;
  selected: MeasurePoint[]; // 0, 1 oder 2 Punkte
  unitPrefs: UnitPreferences;
  onChangeUnitPrefs: (prefs: UnitPreferences) => void;
}

// Jonas' Vorgabe 2026-08-10: das Messen-Panel soll aus dem "Messen"-Button
// selbst entstehen/expandieren, nicht (wie zuerst gebaut) unten links bei
// Schnitt/Ansicht auftauchen - deshalb hier direkt neben dem Button in
// ViewerToolbar.tsx gerendert statt in SectionAndViewPanel.tsx. Wächst von
// rechts (transformOrigin) ein/aus, passend zur Button-Position am rechten
// Viewer-Rand.
//
// Kopfzeile mit Einstellungen-Umschalter (Jonas' Vorgabe 2026-08-10): ersetzt
// im SELBEN Popup die Messwerte durch eine kleine Einheiten-Auswahl statt
// eines eigenen Dialogs - ein Zurueck-Pfeil dort fuehrt wieder zur normalen
// Anzeige.
export function MeasureResultPanel({ active, selected, unitPrefs, onChangeUnitPrefs }: MeasureResultPanelProps) {
  const [view, setView] = useState<"measure" | "settings">("measure");

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="measure-panel"
          initial={{ opacity: 0, x: 12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ transformOrigin: "right center" }}
          className="w-64 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800/95"
        >
          <div className="mb-2 flex items-center justify-between">
            {view === "settings" ? (
              <>
                <HeaderIconButton onClick={() => setView("measure")} label="Zurück zu den Messwerten">
                  <ArrowLeftIcon size={14} />
                </HeaderIconButton>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Einstellungen</span>
                <span className="h-6 w-6" aria-hidden />
              </>
            ) : (
              <>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Messen</span>
                <HeaderIconButton onClick={() => setView("settings")} label="Einheiten-Einstellungen">
                  <SettingsIcon size={15} />
                </HeaderIconButton>
              </>
            )}
          </div>

          {view === "settings" ? (
            <UnitSettings prefs={unitPrefs} onChange={onChangeUnitPrefs} />
          ) : selected.length < 2 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.length === 0 ? "Ersten Punkt anklicken" : "Zweiten Punkt anklicken"}
            </p>
          ) : (
            <MeasureResultRows a={selected[0].position} b={selected[1].position} prefs={unitPrefs} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeaderIconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <AnimatedButton
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      hoverScale={1.1}
      tapScale={0.9}
      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-brand dark:text-slate-400"
    >
      {children}
    </AnimatedButton>
  );
}

// Jonas' Vorgabe 2026-08-10: Haupt- und optionale Sekundäreinheit
// (metrisch/imperial frei wählbar), Sekundäreinheit links neben dem
// eigentlichen Wert, NUR hier im Panel (nicht in der In-Viewer-Bemaßung).
function UnitSettings({ prefs, onChange }: { prefs: UnitPreferences; onChange: (p: UnitPreferences) => void }) {
  const secondaryOn = prefs.secondary !== null;
  return (
    <div className="space-y-3 text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-slate-500 dark:text-slate-400">Haupteinheit</span>
        <UnitSelect value={prefs.primary} onChange={(unit) => onChange({ ...prefs, primary: unit })} />
      </label>

      <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <input
          type="checkbox"
          checked={secondaryOn}
          onChange={(e) =>
            onChange({ ...prefs, secondary: e.target.checked ? defaultSecondaryUnit(prefs.primary) : null })
          }
        />
        Sekundäreinheit anzeigen
      </label>

      {secondaryOn && (
        <UnitSelect value={prefs.secondary!} onChange={(unit) => onChange({ ...prefs, secondary: unit })} />
      )}
    </div>
  );
}

function UnitSelect({ value, onChange }: { value: LengthUnit; onChange: (unit: LengthUnit) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LengthUnit)}
      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-ink dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
    >
      {LENGTH_UNIT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Jonas' Vorgabe 2026-08-10: "es sollen immer Abstaende in X,Y,Z Richtung
// gegeben werden und der direkte Abstand" - Betraege je Achse (nicht
// vorzeichenbehaftet, reine Distanz "wie weit auseinander") plus der
// euklidische Direktabstand als letzte, hervorgehobene Zeile.
function MeasureResultRows({ a, b, prefs }: { a: [number, number, number]; b: [number, number, number]; prefs: UnitPreferences }) {
  const dxM = Math.abs(a[0] - b[0]);
  const dyM = Math.abs(a[1] - b[1]);
  const dzM = Math.abs(a[2] - b[2]);
  const directM = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  return (
    <div className="space-y-1 text-xs">
      <MeasureRow label="X" meters={dxM} prefs={prefs} />
      <MeasureRow label="Y" meters={dyM} prefs={prefs} />
      <MeasureRow label="Z" meters={dzM} prefs={prefs} />
      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5 font-semibold text-brand-dark dark:border-slate-700 dark:text-brand-light">
        <span>Direkt</span>
        <ValueWithCopy meters={directM} prefs={prefs} label="Direkten Abstand kopieren" />
      </div>
    </div>
  );
}

// Copy-Symbol ist im Panel IMMER sichtbar (Jonas' Vorgabe 2026-08-10: "das
// Symbol soll in dem Fenster immer sein") - anders als die In-Viewer-
// Beschriftung (MeasureDistanceLabel.tsx), wo es erst beim Hover einblendet.
function MeasureRow({ label, meters, prefs }: { label: string; meters: number; prefs: UnitPreferences }) {
  return (
    <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <ValueWithCopy meters={meters} prefs={prefs} label={`${label}-Abstand kopieren`} />
    </div>
  );
}

function ValueWithCopy({ meters, prefs, label }: { meters: number; prefs: UnitPreferences; label: string }) {
  const primaryText = formatLength(meters, prefs.primary);
  const secondaryText = prefs.secondary ? formatLength(meters, prefs.secondary) : null;
  return (
    <span className="flex items-center gap-1.5">
      {secondaryText && <span className="text-slate-400 dark:text-slate-500">{secondaryText}</span>}
      {primaryText}
      <CopyButton value={primaryText} label={label} />
    </span>
  );
}
