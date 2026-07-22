// Positionsauswahl bei der Kunden-Registrierung (Jonas' Vorgabe 2026-07-23).
// Bei den drei unternehmensrelevanten Positionen werden zusaetzlich
// Unternehmensangaben (Firma, Adresse, Groesse) abgefragt.
export const POSITION_OPTIONS = ["Einkauf", "Projektleitung", "Geschäftsführung", "Sonstige"] as const;
export type Position = (typeof POSITION_OPTIONS)[number];

export const COMPANY_RELEVANT_POSITIONS: Position[] = ["Einkauf", "Projektleitung", "Geschäftsführung"];

export function needsCompanyInfo(position: string): boolean {
  return (COMPANY_RELEVANT_POSITIONS as string[]).includes(position);
}

export const COMPANY_SIZE_OPTIONS = ["1–10 Mitarbeiter", "11–50 Mitarbeiter", "51–200 Mitarbeiter", "201–500 Mitarbeiter", "über 500 Mitarbeiter"];
