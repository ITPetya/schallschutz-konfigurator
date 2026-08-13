import type { OpeningKind } from "../types/openings";

export type OpeningFamily = "door_single" | "door_double" | "vent_weather" | "cable" | "pipe";

// Jonas' Vorgabe 2026-08-13 ("Einbauten hinzufügen"-Assistent): beim
// Anlegen einer neuen Einbaute gibt es keine Trennung mehr zwischen
// "Standard" und "Sonder" - das war bisher eine Wahl zwischen z. B.
// "Einzeltür 904 × 1918" (fester Kind, category "standard") und "Einzeltür
// (frei nach Maß)" (category "free") schon BEIM ANLEGEN. Jetzt wählt man
// nur noch die Familie, die konkreten Maße kommen erst im Maße-Schritt
// (siehe OpeningFieldsEditor.tsx) über das "Standardmaße"-Dropdown - "Sonder"
// ergibt sich danach rein wertbasiert (siehe isSonderDoor in
// containerWarnings.ts), genau wie beim nachträglichen Bearbeiten in
// OpeningsPanel.tsx schon seit Jonas' Vorgabe 2026-08-11 ("Bauteile frei
// verstellbar").
//
// creationKind ist bewusst IMMER der frei verstellbare ("custom"/einzige)
// Kind einer Familie, NIE einer der alten festen Standard-Kinds
// (door_single_1918/2418/door_double) - die bleiben nur fürs Laden alter
// .sszkonfig/.sszprojekt-Dateien und fürs Bearbeiten bereits bestehender
// Einbauten relevant (siehe types/openings.ts, OPENING_TYPES in
// openingTypes.ts), werden aber beim NEUANLEGEN nicht mehr direkt vergeben.
export const OPENING_FAMILIES: Record<OpeningFamily, { label: string; creationKind: OpeningKind }> = {
  door_single: { label: "Einzeltür", creationKind: "door_custom_single" },
  door_double: { label: "Doppelflügeltür", creationKind: "door_custom_double" },
  vent_weather: { label: "Wetterschutzgitter", creationKind: "vent_weather" },
  cable: { label: "Kabeldurchführung", creationKind: "cable" },
  pipe: { label: "Rohrdurchführung", creationKind: "pipe" },
};
