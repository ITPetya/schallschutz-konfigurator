import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, TerrainDetail, ViewStyle } from "../context/DisplaySettingsContext";
import type { SoundClass } from "../constants/lcStandard";

// Kompletter Konfigurator-Zustand, wie er in eine .sszkonfig-Datei
// geschrieben/aus ihr gelesen wird (Jonas' Vorgabe 2026-07-23: kein Server,
// kein Konto - die Konfiguration lebt nur als Datei auf dem Rechner des
// Nutzers, siehe configFileCodec.ts).
export interface ContainerConfig {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  viewStyle: ViewStyle;
  background: BackgroundStyle;
  insideColor: string;
  outsideColor: string;
  // Optional (Jonas' Vorgabe 2026-07-24, nachtraeglich hinzugefuegt) - vor
  // dieser Datei gespeicherte .sszkonfig-Dateien haben das Feld nicht,
  // KonfiguratorPage faellt dann auf true zurueck.
  shadowsEnabled?: boolean;
  // Ebenfalls nachtraeglich (Jonas' Vorgabe 2026-07-25): 4 Detailstufen fuer
  // den Gelände-Hintergrund - alte Dateien haben das Feld nicht, faellt dann
  // auf "low" zurueck (der bisherige, unveraenderte Gelände-Look).
  terrainDetail?: TerrainDetail;
  // Ebenfalls nachtraeglich (Jonas' Vorgabe 2026-07-24): "innen unlackiert"
  // als Alternative zur Innenfarbe, plus zwei freie Notizfelder fuer
  // Sonderwuensche - alle optional aus demselben Altdatei-Kompatibilitaetsgrund.
  insideUnpainted?: boolean;
  outsideNotes?: string;
  insideNotes?: string;
  // Ebenfalls nachtraeglich (Jonas' Vorgabe 2026-08-10): die
  // Schallschutzklasse (Standard/Schallschutz/Silent/Silent-Plus), faellt
  // auf "standard" zurueck, wenn eine alte Datei das Feld nicht hat.
  soundClass?: SoundClass;
  // Jonas' Klarstellung 2026-08-11 (Vormittag, 52712bd): kurzzeitig durch
  // eine fixe 120mm-Konstante ersetzt. Jonas' Korrektur SPAETER AM SELBEN
  // TAG: die Bodenstaerke ist wieder ein frei einstellbares Feld, GENAU wie
  // wallThickness - kein fester Wert mehr. Optional aus dem ueblichen
  // Altdatei-Kompatibilitaetsgrund - Dateien von vor dieser Korrektur (egal
  // ob mit dem alten freien Feld oder aus der kurzen 120mm-Fix-Phase) haben
  // das Feld nicht oder einen veralteten Wert, faellt dann auf
  // DEFAULT_FLOOR_THICKNESS (120mm, lcStandard.ts) zurueck.
  floorThickness?: number;
  // Nach wie vor: ist die Bodenplatte (jetzt variabler Dicke) hohl oder mit
  // Isolierung gefuellt? Optional aus dem ueblichen
  // Altdatei-Kompatibilitaetsgrund - alte Dateien haben ihn nicht, faellt
  // dann auf defaultFloorInsulated(soundClass) zurueck (siehe lcStandard.ts).
  floorInsulated?: boolean;
}
