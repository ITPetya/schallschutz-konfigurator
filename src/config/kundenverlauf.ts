import { getHistoryEntries } from "./projectHistoryStore";
import type { ContainerConfig } from "./types";
import { OPENING_TYPES } from "../constants/openingTypes";
import { SOUND_CLASSES } from "../constants/lcStandard";

// Komprimierte Zusammenfassung EINES vergangenen Verlaufs-Eintrags (Jonas'
// Vorgabe 2026-08-17: "kurze Infos zu den Einbauten") - bewusst NICHT die
// volle ContainerConfig jedes vergangenen Projekts, nur die fuers Lead-
// Signal relevanten Eckdaten. Wird beim Download/Anfragen eingebettet (siehe
// configFileCodec.ts/projectFileCodec.ts), NIE Teil des live editierten
// Zustands.
export interface KundenverlaufEintrag {
  projektName: string;
  standort?: string;
  zuletztBearbeitet: number;
  container: {
    label: string;
    groesse: string;
    schallschutzklasse?: string;
    einbauten: string[];
  }[];
}

function summarizeEinbauten(config: ContainerConfig): string[] {
  const counts = new Map<string, number>();
  for (const o of config.openings) {
    const label = OPENING_TYPES[o.kind].label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => (count > 1 ? `${label} ×${count}` : label));
}

// Liest den bereits vorhandenen lokalen Projekt-Verlauf (projectHistoryStore.ts,
// bis zu MAX_HISTORY_ENTRIES Eintraege) und verdichtet ihn - respektiert
// automatisch die Speicher-Einwilligung, weil getHistoryEntries() bei
// abgelehnter Einwilligung ohnehin nie befuellt wurde.
export function buildKundenverlauf(): KundenverlaufEintrag[] {
  return getHistoryEntries().map((entry) => ({
    projektName: entry.project.name,
    standort: entry.project.standort,
    zuletztBearbeitet: entry.updatedAt,
    container: entry.project.instances.map((inst) => ({
      label: inst.label,
      groesse: `${inst.config.size.length} × ${inst.config.size.width} × ${inst.config.size.height} mm`,
      schallschutzklasse: SOUND_CLASSES.find((c) => c.id === inst.config.soundClass)?.label,
      einbauten: summarizeEinbauten(inst.config),
    })),
  }));
}
