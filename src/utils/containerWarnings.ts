import type { ContainerConfig } from "../config/types";
import type { Opening } from "../types/openings";
import { CONTAINER_SIZE_PRESETS } from "../constants/containerSizes";
import { OPENING_TYPES, STANDARD_DOOR_SIZES } from "../constants/openingTypes";
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

export const SONDER_DOOR_TEXT = "Sondertür (weicht von den Standardmaßen ab) – Sondereinbauten sind mit Aufpreis verbunden.";

// Jonas' Vorgabe 2026-08-11 ("Bauteile frei verstellbar"): Tueren sind jetzt
// IMMER frei in ihren Massen editierbar (siehe OpeningsPanel.tsx), es gibt
// keinen separaten "Standard vs. frei"-MODUS mehr, an dem sich eine
// Sonderausstattungs-Warnung festmachen liesse. "Sonder" ist deshalb
// WERTBASIERT definiert - eine Tür ist Sonder, wenn ihre AKTUELLEN Masse
// KEINEM bekannten Standardmass entsprechen (STANDARD_DOOR_SIZES in
// openingTypes.ts), exakt dieselbe Logik wie getDimensionWarning() beim
// Container (Praeset-Treffer = kein Hinweis, jede Abweichung = Hinweis) -
// auch eine urspruenglich als "Einzeltür 904×1918" angelegte Tuer wird
// Sonder, sobald sie z.B. um 5mm vergroessert wird. Exportiert, damit
// OpeningsPanel.tsx dieselbe Logik fuers Badge direkt am Bauteil nutzt statt
// sie zu duplizieren.
export function isSonderDoor(o: Opening): boolean {
  const t = OPENING_TYPES[o.kind];
  if (!t.isDoor) return false;
  return !STANDARD_DOOR_SIZES.some((s) => s.width === o.width && s.height === o.height);
}

export function getDoorWarnings(openings: Opening[]): ContainerWarning[] {
  const count = openings.filter(isSonderDoor).length;
  if (count === 0) return [];
  return [
    {
      severity: "orange",
      text: count === 1 ? SONDER_DOOR_TEXT : `${count}× Sondertür (weicht von den Standardmaßen ab) – Sondereinbauten sind mit Aufpreis verbunden.`,
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

// Jonas' Vorgabe 2026-08-11 (Anfrage-Vorschau-Modal, WorkspacePage.tsx): die
// "Ihr Projekt enthält XX Sonderheiten"-Liste dort muss jede einzelne
// Sonderheit anklickbar machen, um zum verursachenden Feld zu springen -
// dafuer braucht es mehr als nur den fertigen Text (getContainerWarnings
// unten), sondern auch eine grobe Kategorie, die sich auf einen Abschnitt in
// der Seitenleiste abbilden laesst (Grundeinstellungen/Erweiterte
// Einstellungen/Einbauten, siehe WorkspacePage.tsx's CATEGORY_TO_TOUR_ID).
export type WarningCategory = "size" | "wall" | "floor" | "soundClass" | "door" | "color";

export interface CategorizedContainerWarning {
  category: WarningCategory;
  warning: ContainerWarning;
}

// Einzige Stelle, die WIRKLICH alle Warnquellen aufsammelt - getContainerWarnings
// unten ist nur noch eine abgeleitete, kategorielose Sicht darauf, damit
// bestehende Aufrufer (Baugruppen-Sammel-Badge) unveraendert weiterlaufen.
export function getCategorizedContainerWarnings(config: ContainerConfig): CategorizedContainerWarning[] {
  const out: CategorizedContainerWarning[] = [];
  (["length", "width", "height"] as const).forEach((field) => {
    const w = getDimensionWarning(field, config.size[field]);
    if (w) out.push({ category: "size", warning: w });
  });
  const wallW = getWallThicknessWarning(config.wallThickness);
  if (wallW) out.push({ category: "wall", warning: wallW });
  const floorW = getFloorInsulationWarning(config.floorInsulated);
  if (floorW) out.push({ category: "floor", warning: floorW });
  getSoundClassWarnings(config.soundClass, config.wallThickness).forEach((w) => out.push({ category: "soundClass", warning: w }));
  getDoorWarnings(config.openings).forEach((w) => out.push({ category: "door", warning: w }));
  getColorWarnings(config).forEach((w) => out.push({ category: "color", warning: w }));
  return out;
}

// Alle Warnungen EINES Containers gesammelt (Jonas' Vorgabe 2026-08-10) -
// fuer den Sammel-Hinweis in der Baugruppen-Container-Liste.
export function getContainerWarnings(config: ContainerConfig): ContainerWarning[] {
  return getCategorizedContainerWarnings(config).map((c) => c.warning);
}
