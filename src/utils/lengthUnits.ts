// Jonas' Vorgabe 2026-08-10: Haupt-/Sekundäreinheit im Messwerkzeug, "alle
// normalen metrischen und imperialen Einheiten" - deckt die ueblichen
// Bau-/Konstruktionsmasse ab (kein Meilen/Yard-Exotenkram noetig).
export type LengthUnit = "mm" | "cm" | "m" | "in" | "ft";

export const LENGTH_UNIT_OPTIONS: { value: LengthUnit; label: string }[] = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
  { value: "m", label: "m" },
  { value: "in", label: "in (Zoll)" },
  { value: "ft", label: "ft (Fuß)" },
];

const METERS_PER_UNIT: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
};

// Sinnvolle Nachkommastellen je Einheit, damit z. B. mm nicht mit
// Nachkommastellen protzt und m/ft nicht auf ganze Zahlen gerundet werden.
const DECIMALS: Record<LengthUnit, number> = {
  mm: 0,
  cm: 1,
  m: 3,
  in: 2,
  ft: 3,
};

export function metersToUnit(meters: number, unit: LengthUnit): number {
  return meters / METERS_PER_UNIT[unit];
}

export function formatLength(meters: number, unit: LengthUnit): string {
  const value = metersToUnit(meters, unit);
  return `${value.toFixed(DECIMALS[unit])} ${unit}`;
}

// Sinnvolle Vorbelegung fuer die Sekundäreinheit, wenn sie gerade erst
// eingeschaltet wird - metrisch <-> imperial gewechselt, statt z. B. "mm"
// als Sekundäreinheit zu "mm" als Haupteinheit vorzuschlagen.
const METRIC_UNITS: readonly LengthUnit[] = ["mm", "cm", "m"];
export function defaultSecondaryUnit(primary: LengthUnit): LengthUnit {
  return METRIC_UNITS.includes(primary) ? "in" : "mm";
}
