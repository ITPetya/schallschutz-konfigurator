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
  // Jonas' Klarstellung 2026-08-11: die Bodenplatte ist IMMER 120mm dick
  // (siehe FLOOR_THICKNESS_MM in lcStandard.ts) - das vorherige
  // floorThickness-Feld (0/100-120mm, frei eingebbar) ist damit hinfaellig
  // und wurde ENTFERNT, es gibt keine Nutzer-editierbare Bodendicke mehr.
  // Stattdessen nur noch dieser Boolean: ist die feste 120mm-Platte hohl
  // oder mit Isolierung gefuellt? Optional aus dem ueblichen
  // Altdatei-Kompatibilitaetsgrund - alte Dateien (auch solche mit dem
  // inzwischen entfernten floorThickness-Feld) haben ihn nicht, faellt dann
  // auf defaultFloorInsulated(soundClass) zurueck (siehe lcStandard.ts).
  floorInsulated?: boolean;
}
