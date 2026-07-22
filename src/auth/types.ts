// "verkaeufer" (Verkäufer) sieht alle Kundenprojekte zur Lead-Erkennung -
// Jonas' Vorgabe 2026-07-23. Kein "kaufmaennischer" Sonderfall von Admin,
// eigene Rolle mit eigener Seite/eigenen Rechten.
export type Role = "kunde" | "konstrukteur" | "admin" | "verkaeufer";

export interface CompanyInfo {
  name: string;
  address: string;
  size: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  // NUR fuers Mock-Grundgeruest - Klartext-Passwort in localStorage ist
  // KEINE echte Auth, siehe README/Backend-Hinweis. Ein echtes Backend
  // (z. B. Supabase Auth) muss das vor einem echten Einsatz ersetzen.
  password: string;
  // Nur bei Kunden-Selbstregistrierung erfasst (Jonas' Vorgabe 2026-07-23) -
  // bei manuell angelegten Mitarbeitern/Admins/Verkaeufern nicht gesetzt.
  firstName?: string;
  lastName?: string;
  phone?: string;
  position?: string;
  company?: CompanyInfo;
}

// Eingabedaten der Kunden-Registrierung (Jonas' Vorgabe 2026-07-23: "es
// sollen wirklich nur Kundenregistrierung drüber laufen" - Mitarbeiter/Admin
// werden ausschliesslich manuell per createEmployee() angelegt, siehe
// mockAuthStore.ts).
export interface CustomerRegistrationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
  // Nur gesetzt, wenn position eine unternehmensrelevante Position ist
  // (siehe constants/positions.ts: COMPANY_RELEVANT_POSITIONS).
  company?: CompanyInfo;
}
