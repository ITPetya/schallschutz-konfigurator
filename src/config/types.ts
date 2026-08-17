import type { ContainerSize } from "../constants/containerSizes";
import type { Opening } from "../types/openings";
import type { SoundClass } from "../constants/lcStandard";
import type { PartitionWallConfig } from "../types/partitionWall";
import type { KundenverlaufEintrag } from "./kundenverlauf";

// Kompletter Konfigurator-Zustand, wie er in eine .sszkonfig-Datei
// geschrieben/aus ihr gelesen wird (Jonas' Vorgabe 2026-07-23: kein Server,
// kein Konto - die Konfiguration lebt nur als Datei auf dem Rechner des
// Nutzers, siehe configFileCodec.ts).
//
// Jonas' Vorgabe 2026-08-14: viewStyle/background/shadowsEnabled/
// terrainDetail sind bewusst KEINE Felder mehr hier - reine
// Betrachtungseinstellungen ("wie schaue ich mir das gerade an"), keine
// Produkteigenschaft, sollen deshalb nicht mit in die Datei gespeichert
// werden und beim Laden "kleben bleiben", sondern als Browser-Praeferenz
// pro Nutzer gelten (siehe config/viewPreferencesStore.ts,
// hooks/useViewPreferences.ts). Alte .sszkonfig/.sszprojekt-Dateien haben
// diese Felder im JSON noch stehen - unschaedlich, wird beim Decode einfach
// nicht mehr gelesen.
export interface ContainerConfig {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  insideColor: string;
  outsideColor: string;
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
  // Ebenfalls nachtraeglich (Jonas' Vorgabe 2026-08-14): optionale Trennwaende,
  // die den Innenraum entlang der Laenge unterteilen (siehe
  // types/partitionWall.ts, PartitionWall.tsx). Optional aus dem ueblichen
  // Altdatei-Kompatibilitaetsgrund - alte Dateien haben das Feld nicht, faellt
  // dann auf eine leere Liste zurueck (keine Trennwaende).
  partitionWalls?: PartitionWallConfig[];
  // Jonas' Vorgabe 2026-08-17: beim Download/Anfragen automatisch eingebetter
  // lokaler Verlauf frueherer Konfigurationen dieses Browsers (siehe
  // kundenverlauf.ts) - NUR fuer den internen Viewer relevant
  // (showKundenverlauf-Prop in KonfiguratorPage.tsx/InternalProjectViewer.tsx),
  // in der normalen Bearbeitung (WorkspacePage.tsx) weder gesetzt noch
  // gelesen. Optional wie alle nachtraeglichen Felder - alte Dateien haben es
  // nicht.
  kundenverlauf?: KundenverlaufEintrag[];
}
