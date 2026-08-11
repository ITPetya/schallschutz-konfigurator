// Grenzwerte aus "Der LC Systems Standard für Container" (PDF, Stand
// 2026-08-10) - alle Masse in MILLIMETERN, konsistent mit dem Rest des
// Datenmodells (siehe containerSizes.ts). Dient als zentrale Quelle fuer
// die Sondermass-/Uebermass-Warnungen in ContainerSizeControls.tsx.

// "Länge von 1,00 - 18,00m / Breite von 1,00 - 4,50m / Höhe von 1,00 -
// 3,70m ... Optional weitere Sondermaße auf Anfrage" - Werte AUSSERHALB
// dieser Spannen sind kein Standardprodukt mehr, aber laut PDF trotzdem
// bestellbar ("auf Anfrage") - deshalb nur Warnung/Bestaetigung, kein
// hartes Blockieren (Jonas' Vorgabe 2026-08-10).
export const LC_DIMENSION_LIMITS = {
  length: { min: 1000, max: 18000 },
  width: { min: 1000, max: 4500 },
  height: { min: 1000, max: 3700 },
};

// "LC-C-Schienensystem ... RPI3 Steinwoll-Isolierung ... t=100mm" -
// Standard-Wandstaerke fuer Wand UND Dach, siehe DEFAULT_WALL_THICKNESS in
// containerSizes.ts. Jede Abweichung ist Sonderausstattung (Jonas' Vorgabe
// 2026-08-10: "Wandstärken sind 100 Standard, alles andere auch Sonder").
export const LC_STANDARD_WALL_THICKNESS = 100;

// Jonas' Klarstellung 2026-08-11 (Vormittag, siehe 52712bd): Bodendicke
// zunaechst als IMMER fixe 120mm-Konstante modelliert, keine Nutzereingabe
// mehr. Jonas' Korrektur SPAETER AM SELBEN TAG, nachdem er die Zusammenfassung
// gesehen hatte: die Bodenstaerke soll wieder ein frei einstellbares Feld
// sein, GENAU wie die Wandstaerke (siehe floorThickness auf ContainerConfig,
// types.ts) - keine feste Konstante mehr. DEFAULT_FLOOR_THICKNESS ist nur
// noch der Vorgabewert fuer neue Container (ContainerSizeControls.tsx,
// defaultContainerConfig.ts), keine erzwungene Groesse. Eigenstaendig statt
// von LC_STANDARD_WALL_THICKNESS abgeleitet, weil Boden- und Wand-/
// Dachdicke unabhaengig voneinander eingestellt werden (siehe Container.tsx:
// die Bodenplatte nutzt ihre eigene floorThickness, Wand/Dach weiterhin die
// separate wallThickness).
export const DEFAULT_FLOOR_THICKNESS = 120;

// "Standard" ohne Sonder-Hinweis sind laut Jonas fuer die Bodenstaerke genau
// diese zwei Werte (100mm = identisch zur Standard-Wandstaerke, 120mm = der
// bisherige Fixwert) - jede andere Dicke ist eine Sonderausstattung, exakt
// dasselbe Warnmuster wie bei der Wandstaerke (siehe getFloorThicknessWarning
// in containerWarnings.ts), nur mit zwei zulaessigen Werten statt einem.
export const LC_STANDARD_FLOOR_THICKNESSES = [100, 120];

// Jonas' Vorgabe 2026-08-11 (Korrektur): sobald die Bodenisolierung
// eingeschaltet wird - egal ob der Nutzer die Checkbox manuell anklickt oder
// sie durch einen Wechsel auf Silent/Silent-Plus automatisch aktiviert wird -
// soll eine zu duenne Bodenplatte automatisch auf 120mm angehoben werden
// (technisch braucht die Isolierung diese Mindeststaerke). Bewusst NUR
// EINSEITIG: bereits >=120mm bleibt unangetastet (kein ungefragtes
// Verkleinern), und das spaetere Abschalten der Isolierung setzt die Dicke
// NICHT zurueck - der Nutzer kann sie danach frei auf jeden Wert stellen.
export function bumpedFloorThickness(currentFloorThickness: number, insulated: boolean): number {
  if (!insulated) return currentFloorThickness;
  return currentFloorThickness < DEFAULT_FLOOR_THICKNESS ? DEFAULT_FLOOR_THICKNESS : currentFloorThickness;
}

// Sichtbarer Unterschied im 3D-Modell zwischen isoliertem (gefuelltem) und
// hohlem Boden (Jonas' Vorgabe 2026-08-11: "muss sich sichtbar im 3D-Modell
// niederschlagen") - angewendet auf die Innenflaeche (Oberseite) der
// Bodenplatte in Container.tsx/Wall.tsx. Warmer, wollartiger Farbton fuer
// gefuellte Isolierung (angelehnt an Steinwolle, siehe auch die
// C-Schienen-Isolierung an Wand/Dach), kuehleres Grau fuer die hohle
// Kammer (wirkt wie eine offene Stahl-/Blechkammer ohne Fuellung).
export const FLOOR_INSULATED_COLOR = "#d8b878";
export const FLOOR_HOLLOW_COLOR = "#94a3b8";

export type SoundClass = "standard" | "schallschutz" | "silent" | "silentPlus";

// Bodenisolierung ist standardmaessig AN, sobald die Schallschutzklasse
// Silent oder Silent-Plus ist (fuer diese Klassen ohnehin praktisch
// erforderlich, um die angegebene Daemmwirkung zu erreichen), sonst AUS -
// bleibt aber in JEDE Richtung frei manuell umschaltbar (Jonas' Vorgabe
// 2026-08-11: "kann man auch für alle anderen manuell aktivieren", "kann
// man beim Silent auch wieder deaktivieren"). Nur der DEFAULT beim Wechsel
// der Schallschutzklasse haengt hiervon ab, nicht eine dauerhafte Kopplung.
export function defaultFloorInsulated(soundClass: SoundClass): boolean {
  return soundClass === "silent" || soundClass === "silentPlus";
}

export interface SoundClassSpec {
  id: SoundClass;
  label: string;
  rangeLabel: string;
  // "Ab Silent ist eine Mindestdicke der Wandstärke von 100 zwingend
  // erforderlich" (Jonas' Vorgabe 2026-08-10) - fuer alle anderen Klassen
  // ist 100mm nur eine unverbindliche Richtdicke, siehe minWallThicknessHint.
  minWallThicknessRequired?: number;
}

// "Es gibt folgende Auswahlen: Standard (34-36 dB), Schallschutz (42-45
// dB), Silent (45-47 dB), Silent-Plus (49-52 dB)" (Jonas' Vorgabe
// 2026-08-10, ergaenzt die im PDF nur grob skizzierten zwei Stufen
// "bewertet 42-45 dB / optional bis 52 dB").
export const SOUND_CLASSES: SoundClassSpec[] = [
  { id: "standard", label: "Standard", rangeLabel: "R'w 34–36 dB" },
  { id: "schallschutz", label: "Schallschutz", rangeLabel: "R'w 42–45 dB" },
  { id: "silent", label: "Silent", rangeLabel: "R'w 45–47 dB", minWallThicknessRequired: 100 },
  { id: "silentPlus", label: "Silent-Plus", rangeLabel: "R'w 49–52 dB", minWallThicknessRequired: 100 },
];

// Jonas' Vorgabe 2026-08-11 (Korrektur): ein WECHSEL der Schallschutzklasse
// soll eine zu duenne Wandstaerke aktiv korrigieren, nicht nur weiterhin rot
// anmahnen (siehe getSoundClassWallConflictWarning in containerWarnings.ts,
// die Warnung bleibt zusaetzlich bestehen - z. B. falls der Nutzer die
// Wandstaerke danach manuell wieder verkleinert). Bewusst NUR beim
// Klassenwechsel angewendet (siehe onChange in WorkspacePage.tsx), nicht bei
// jeder Wandstaerken-Eingabe selbst - manuelles Unterschreiten nach dem
// Wechsel bleibt moeglich, erzeugt dann eben wieder die rote Warnung.
export function bumpedWallThickness(currentWallThickness: number, soundClass: SoundClass): number {
  const spec = SOUND_CLASSES.find((c) => c.id === soundClass);
  const min = spec?.minWallThicknessRequired;
  if (min === undefined) return currentWallThickness;
  return currentWallThickness < min ? min : currentWallThickness;
}

export const DEFAULT_SOUND_CLASS: SoundClass = "standard";

// "für alle Schallangaben ist 100mm als Richtdicke nötig, ansonsten kann
// es sein, dass die Schallschutzklasse nicht erreicht wird" (Jonas' Vorgabe
// 2026-08-10) - unverbindliche Empfehlung fuer Standard/Schallschutz, im
// Unterschied zur zwingenden Vorgabe ab Silent (minWallThicknessRequired).
export const LC_SOUND_WALL_THICKNESS_HINT = 100;
