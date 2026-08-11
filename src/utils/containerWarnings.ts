import type { ContainerConfig } from "../config/types";
import type { Opening } from "../types/openings";
import { CONTAINER_SIZE_PRESETS } from "../constants/containerSizes";
import { OPENING_TYPES } from "../constants/openingTypes";
import { RAL_STANDARD_COLORS } from "../constants/ralColors";
import { DEFAULT_SOUND_CLASS, LC_DIMENSION_LIMITS, LC_STANDARD_WALL_THICKNESS, SOUND_CLASSES, type SoundClass } from "../constants/lcStandard";

export type WarningSeverity = "orange" | "red";

export interface ContainerWarning {
  severity: WarningSeverity;
  text: string;
}

// Einzige Quelle fuer alle Sonderausstattungs-/Warntexte im Konfigurator
// (Jonas' Vorgabe 2026-08-10: "wenn an einem Container etwas Orange oder
// rot ist, soll das auch in der Baugruppe übertragen werden ... detailliert
// beschreiben welche Sachen das verursachen") - jedes einzelne Eingabefeld
// (ContainerSizeControls, SoundClassControls, OpeningsPanel,
// DisplaySettingsPanel) UND die Baugruppen-Liste (WorkspacePage.tsx,
// ContainerWarningBadge) ziehen ihre Texte von HIER, damit ein Container-
// Sammel-Hinweis in der Baugruppe garantiert dieselben Gruende nennt wie
// die einzelnen Badges am Container selbst.

const DIMENSION_LABELS: Record<"length" | "width" | "height", string> = { length: "Länge", width: "Breite", height: "Höhe" };

export function getDimensionWarning(field: "length" | "width" | "height", value: number): ContainerWarning | null {
  const limits = LC_DIMENSION_LIMITS[field];
  const label = DIMENSION_LABELS[field];
  if (value > limits.max) {
    return { severity: "orange", text: `${label}: Übermaß (Standard bis ${limits.max} mm) – führt zu Mehraufwand und Mehrkosten.` };
  }
  if (value < limits.min) {
    return { severity: "orange", text: `${label}: unterschreitet den Standardbereich (ab ${limits.min} mm) – Sonderanfertigung mit Mehrkosten.` };
  }
  const presetValues = CONTAINER_SIZE_PRESETS.map((p) => p[field]);
  if (!presetValues.includes(value)) {
    return { severity: "orange", text: `${label}: Sondermaß – mit Mehrkosten verbunden.` };
  }
  return null;
}

export function getWallThicknessWarning(wallThickness: number): ContainerWarning | null {
  if (wallThickness === LC_STANDARD_WALL_THICKNESS) return null;
  return {
    severity: "orange",
    text: `Wandstärke ${wallThickness} mm (Standard: ${LC_STANDARD_WALL_THICKNESS} mm) – Sonderausstattung mit Aufpreis.`,
  };
}

// Jonas' Vorgabe 2026-08-11: "Bodenisolierung" ist jetzt ein Boolean (siehe
// FLOOR_THICKNESS_MM/floorInsulated in lcStandard.ts/types.ts, ersetzt die
// vorherige 0/100-120mm-Eingabe) - ist sie manuell eingeschaltet, bleibt der
// bisherige Sonderausstattungs-Hinweis inhaltlich bestehen (echte
// Zusatzkosten fuer die Fuellung), nur an den Boolean angepasst statt an
// einen mm-Wert.
export function getFloorInsulationWarning(floorInsulated: boolean | undefined): ContainerWarning | null {
  if (!floorInsulated) return null;
  return { severity: "orange", text: "Bodenisolierung aktiv – optionale Sonderausstattung mit Aufpreis." };
}

// Jonas' Vorgabe 2026-08-11: "Alle Schallschutzklassen sollen ohne
// orangenes Ausrufezeichen sein, das möchten wir ja verkaufen" - der
// bisherige Sonder-Hinweis PRO AUSWAHL (jede Klasse ausser Standard war
// orange markiert) ist komplett entfernt, ebenso die orange "waere
// empfohlen"-Andeutung fuer Standard/Schallschutz unten in
// getSoundClassWallConflictWarning - beides wirkte wie eine Verkaufsbremse
// fuer Produkte, die aktiv verkauft werden sollen. Die ROTE Pflichtwarnung
// bleibt: ab Silent/Silent-Plus ist eine Mindest-Wandstaerke technisch
// zwingend, das ist keine Verkaufs-Reibung, sondern eine harte technische
// Anforderung.
export function getSoundClassWallConflictWarning(soundClass: SoundClass | undefined, wallThickness: number): ContainerWarning | null {
  const spec = SOUND_CLASSES.find((c) => c.id === (soundClass ?? DEFAULT_SOUND_CLASS)) ?? SOUND_CLASSES[0];
  if (spec.minWallThicknessRequired !== undefined && wallThickness < spec.minWallThicknessRequired) {
    return {
      severity: "red",
      text: `Für Schallschutzklasse ${spec.label} ist eine Wandstärke von mindestens ${spec.minWallThicknessRequired} mm zwingend erforderlich (aktuell ${wallThickness} mm).`,
    };
  }
  return null;
}

export function getSoundClassWarnings(soundClass: SoundClass | undefined, wallThickness: number): ContainerWarning[] {
  return [getSoundClassWallConflictWarning(soundClass, wallThickness)].filter((w): w is ContainerWarning => w !== null);
}

export const SONDER_DOOR_TEXT = "Sondertür (frei nach Maß) – Sondereinbauten sind mit Aufpreis verbunden.";

function isSonderDoor(o: Opening): boolean {
  const t = OPENING_TYPES[o.kind];
  return !!t.isDoor && t.category === "free";
}

export function getDoorWarnings(openings: Opening[]): ContainerWarning[] {
  const count = openings.filter(isSonderDoor).length;
  if (count === 0) return [];
  return [
    {
      severity: "orange",
      text: count === 1 ? SONDER_DOOR_TEXT : `${count}× Sondertür (frei nach Maß) – Sondereinbauten sind mit Aufpreis verbunden.`,
    },
  ];
}

function isStandardRal(hex: string): boolean {
  return RAL_STANDARD_COLORS.some((c) => c.hex === hex);
}

export function getColorWarnings(config: ContainerConfig): ContainerWarning[] {
  const out: ContainerWarning[] = [];
  if (!isStandardRal(config.outsideColor)) {
    out.push({ severity: "orange", text: `Außenfarbe ${config.outsideColor} – Sonderfarbe, mit Aufpreis gegenüber den Standardfarben.` });
  }
  if (!config.insideUnpainted && !isStandardRal(config.insideColor)) {
    out.push({ severity: "orange", text: `Innenfarbe ${config.insideColor} – Sonderfarbe, mit Aufpreis gegenüber den Standardfarben.` });
  }
  return out;
}

// Alle Warnungen EINES Containers gesammelt (Jonas' Vorgabe 2026-08-10) -
// fuer den Sammel-Hinweis in der Baugruppen-Container-Liste.
export function getContainerWarnings(config: ContainerConfig): ContainerWarning[] {
  const out: ContainerWarning[] = [];
  (["length", "width", "height"] as const).forEach((field) => {
    const w = getDimensionWarning(field, config.size[field]);
    if (w) out.push(w);
  });
  const wallW = getWallThicknessWarning(config.wallThickness);
  if (wallW) out.push(wallW);
  const floorW = getFloorInsulationWarning(config.floorInsulated);
  if (floorW) out.push(floorW);
  out.push(...getSoundClassWarnings(config.soundClass, config.wallThickness));
  out.push(...getDoorWarnings(config.openings));
  out.push(...getColorWarnings(config));
  return out;
}
