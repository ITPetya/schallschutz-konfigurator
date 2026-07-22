import type { Role } from "./types";

// Zentral statt in jeder Komponente einzeln dupliziert (war vorher lokal in
// AuthPopover.tsx) - jetzt auch von AdminEmployeesPage fuer die
// Sicherheitswarnung beim Hochstufen gebraucht (Jonas' Vorgabe 2026-07-23).
export function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "konstrukteur") return "Konstrukteur";
  if (role === "verkaeufer") return "Verkäufer";
  return "Kunde";
}
