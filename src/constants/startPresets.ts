import type { ContainerConfig } from "../config/types";
import type { Opening } from "../types/openings";
import { RAL_STANDARD_COLORS } from "./ralColors";
import { DEFAULT_WALL_THICKNESS } from "./containerSizes";
import { DEFAULT_FLOOR_THICKNESS } from "./lcStandard";

export interface StartPreset {
  id: string;
  label: string;
  // Vorbelegte Farbe fuer die Vorschau/den ersten der drei Farbpunkte auf
  // der Preset-Karte (siehe StartPresetCard.tsx). Jonas' Fehlerbericht
  // 2026-08-18: "das gruen sieht komisch aus" - obwohl ALLE vier von Jonas
  // bereitgestellten echten Referenzdateien aussen RAL 6005 Moosgruen
  // nutzen, soll die STANDARD-Vorauswahl auf der Karte stattdessen RAL 7004
  // Signalgrau sein (deckt sich mit defaultContainerConfig.ts's Default fuer
  // einen komplett neuen, leeren Container - dort ist Grau schon lange der
  // Standard fuer Innen UND Aussen). Gruen bleibt als zweite, waehlbare
  // Standardfarbe bestehen, nur nicht mehr vorausgewaehlt.
  config: ContainerConfig;
}

const SIGNALGRAU = RAL_STANDARD_COLORS[1].hex; // RAL 7004 - jetzt Standard fuer Innen UND Aussen (siehe StartPreset-Kommentar oben).

function baseConfig(openings: Opening[]): ContainerConfig {
  return {
    size: { length: 0, width: 0, height: 0 }, // wird pro Preset unten ueberschrieben
    wallThickness: DEFAULT_WALL_THICKNESS,
    openings,
    insideColor: SIGNALGRAU,
    outsideColor: SIGNALGRAU,
    insideUnpainted: false,
    outsideNotes: "",
    insideNotes: "",
    soundClass: "standard",
    floorThickness: DEFAULT_FLOOR_THICKNESS,
    floorInsulated: false,
    partitionWalls: [],
  };
}

// Jonas' Vorgabe 2026-08-18 ("Presets fuer die Startseite"): acht Karten,
// vier davon (7m/9,6m/20 Fuß/40 Fuß) 1:1 aus den von Jonas per Upload
// bereitgestellten ECHTEN .sszprojekt-Referenzdateien uebernommen (Masse +
// Durchbrueche exakt wie dort konfiguriert, per fileCrypto.ts entschluesselt
// geprueft) - die anderen vier (12m/15m/18m/10 Fuß) sind von mir ergaenzt,
// da Jonas dafuer keine Referenzdatei mitgeschickt hat: 12m/15m/18m setzen
// den Groessen-Abstand der metrischen Familie (7m/9,6m/12m, Querschnitt
// durchgehend 2990x2990mm - 12m deckt sich mit dem bereits bestehenden
// CONTAINER_SIZE_PRESETS-Eintrag in containerSizes.ts) folgerichtig fort,
// 10 Fuß nutzt die offizielle ISO-668-Aussenmasse (2991x2438x2591mm) -
// exakt derselbe Querschnitt (2438x2591mm), den auch die von Jonas
// gelieferten 20-Fuß-/40-Fuß-Dateien fuer ihre jeweilige Fuß-Familie
// verwenden. Openings der vier ergaenzten Presets orientieren sich an der
// naechstliegenden echten Referenz derselben Familie, bewusst schlicht
// gehalten (keine erfundenen Sonderdurchbrueche) - reine Startpunkte, die
// beim Klick auf "Konfigurieren" ohnehin voll editierbar sind.
export const START_PRESETS: StartPreset[] = [
  {
    id: "10ft",
    label: "10 Fuß",
    config: {
      ...baseConfig([
        { id: "preset-10ft-door", kind: "door_custom_single", panel: "front", u: 0, v: 170, width: 904, height: 1918, hinge: "left" },
      ]),
      size: { length: 2991, width: 2438, height: 2591 },
    },
  },
  {
    id: "20ft",
    label: "20 Fuß",
    // Exakt aus a98738c5-20_Fu_.sszprojekt uebernommen.
    config: {
      ...baseConfig([
        { id: "preset-20ft-door-1", kind: "door_custom_double", panel: "front", u: 0, v: 170, width: 2000, height: 2000 },
        { id: "preset-20ft-door-2", kind: "door_custom_single", panel: "left", u: -1500, v: 170, width: 904, height: 1918, hinge: "left" },
      ]),
      size: { length: 6058, width: 2438, height: 2591 },
    },
  },
  {
    id: "40ft",
    label: "40 Fuß",
    // Exakt aus 9828d5f7-40_Fu_.sszprojekt uebernommen.
    config: {
      ...baseConfig([
        { id: "preset-40ft-door-1", kind: "door_custom_double", panel: "front", u: 0, v: 170, width: 2000, height: 2000 },
        { id: "preset-40ft-door-2", kind: "door_custom_single", panel: "left", u: -2000, v: 170, width: 904, height: 1918, hinge: "left" },
        { id: "preset-40ft-door-3", kind: "door_custom_single", panel: "left", u: 0, v: 170, width: 904, height: 1918, hinge: "left" },
      ]),
      size: { length: 12192, width: 2438, height: 2591 },
    },
  },
  {
    id: "7m",
    label: "7m",
    // Exakt aus 99223af2-7m.sszprojekt uebernommen.
    config: {
      ...baseConfig([
        { id: "preset-7m-door", kind: "door_double", panel: "front", u: 0, v: 170, width: 2234, height: 2530 },
        { id: "preset-7m-side-door", kind: "door_single_1918", panel: "left", u: -1500, v: 170, width: 904, height: 1918 },
        { id: "preset-7m-vent", kind: "vent_weather", panel: "left", u: 2500, v: 600, width: 411, height: 411 },
        { id: "preset-7m-cable", kind: "cable", panel: "back", u: -1000, v: 2500, width: 250, height: 250 },
      ]),
      size: { length: 7000, width: 2990, height: 2990 },
    },
  },
  {
    id: "9_6m",
    label: "9,6m",
    // Exakt aus 8eb8121c-96m.sszprojekt uebernommen.
    config: {
      ...baseConfig([
        { id: "preset-96m-door", kind: "door_double", panel: "front", u: 0, v: 170, width: 2234, height: 2530 },
        { id: "preset-96m-side-door-1", kind: "door_single_1918", panel: "left", u: 2500, v: 170, width: 904, height: 1918 },
        { id: "preset-96m-side-door-2", kind: "door_single_1918", panel: "left", u: 0, v: 170, width: 904, height: 1918 },
        { id: "preset-96m-vent", kind: "vent_weather", panel: "left", u: 2500, v: 600, width: 411, height: 411 },
        { id: "preset-96m-cable", kind: "cable", panel: "back", u: -1000, v: 2500, width: 250, height: 250 },
      ]),
      size: { length: 9600, width: 2990, height: 2990 },
    },
  },
  {
    id: "12m",
    label: "12m",
    config: {
      ...baseConfig([
        { id: "preset-12m-door", kind: "door_double", panel: "front", u: 0, v: 170, width: 2234, height: 2530 },
        { id: "preset-12m-side-door-1", kind: "door_single_1918", panel: "left", u: 3000, v: 170, width: 904, height: 1918 },
        { id: "preset-12m-side-door-2", kind: "door_single_1918", panel: "left", u: 0, v: 170, width: 904, height: 1918 },
      ]),
      size: { length: 12000, width: 2990, height: 2990 },
    },
  },
  {
    id: "15m",
    label: "15m",
    config: {
      ...baseConfig([
        { id: "preset-15m-door", kind: "door_double", panel: "front", u: 0, v: 170, width: 2234, height: 2530 },
        { id: "preset-15m-side-door-1", kind: "door_single_1918", panel: "left", u: 4000, v: 170, width: 904, height: 1918 },
        { id: "preset-15m-side-door-2", kind: "door_single_1918", panel: "left", u: 0, v: 170, width: 904, height: 1918 },
      ]),
      size: { length: 15000, width: 2990, height: 2990 },
    },
  },
  {
    id: "18m",
    label: "18m",
    config: {
      ...baseConfig([
        { id: "preset-18m-door", kind: "door_double", panel: "front", u: 0, v: 170, width: 2234, height: 2530 },
        { id: "preset-18m-side-door-1", kind: "door_single_1918", panel: "left", u: 5000, v: 170, width: 904, height: 1918 },
        { id: "preset-18m-side-door-2", kind: "door_single_1918", panel: "left", u: 0, v: 170, width: 904, height: 1918 },
      ]),
      size: { length: 18000, width: 2990, height: 2990 },
    },
  },
];
