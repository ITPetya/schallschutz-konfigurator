import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { BackgroundStyle, ViewStyle } from "../context/DisplaySettingsContext";

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
}
