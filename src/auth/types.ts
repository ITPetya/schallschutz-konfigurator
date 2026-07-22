export type Role = "kunde" | "konstrukteur" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  // NUR fuers Mock-Grundgeruest - Klartext-Passwort in localStorage ist
  // KEINE echte Auth, siehe README/Backend-Hinweis. Ein echtes Backend
  // (z. B. Supabase Auth) muss das vor einem echten Einsatz ersetzen.
  password: string;
}
