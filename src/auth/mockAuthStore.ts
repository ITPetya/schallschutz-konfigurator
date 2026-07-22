import type { Role, User } from "./types";

// MOCK-Datenschicht (Jonas' Vorgabe 2026-07-22: "baue ein Grundgerüst") -
// alles hier liegt in localStorage, NICHT auf einem Server. Funktioniert
// nur innerhalb DIESES Browsers - ein Admin, der auf seinem Rechner einen
// Mitarbeiter anlegt, ist fuer den Konstrukteur auf einem ANDEREN Rechner
// unsichtbar. Fuer echten Mehrbenutzerbetrieb muss das durch ein echtes
// Backend (Auth + Datenbank, z. B. Supabase) ersetzt werden - siehe README.
const USERS_KEY = "ssk_users";
const SESSION_KEY = "ssk_session_user_id";

function loadUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return seedUsers();
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return seedUsers();
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Ein paar Demo-Konten, damit alle drei Rollen sofort testbar sind, ohne
// erst manuell einen Admin anlegen zu muessen (huhn-ei-Problem sonst: nur
// ein Admin kann Mitarbeiter anlegen, aber ohne Mitarbeiterverwaltung gibt
// es noch keinen Admin).
function seedUsers(): User[] {
  const seeded: User[] = [
    { id: "seed-admin", email: "admin@demo.de", name: "Admin Demo", role: "admin", password: "admin123" },
    { id: "seed-konstrukteur", email: "konstrukteur@demo.de", name: "Konstrukteur Demo", role: "konstrukteur", password: "bau123" },
    { id: "seed-kunde", email: "kunde@demo.de", name: "Kunde Demo", role: "kunde", password: "kunde123" },
  ];
  saveUsers(seeded);
  return seeded;
}

export function listUsers(): User[] {
  return loadUsers();
}

export function findUserByEmail(email: string): User | undefined {
  return loadUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function login(email: string, password: string): User | null {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) return null;
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function currentSessionUser(): User | null {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return loadUsers().find((u) => u.id === id) ?? null;
}

// Selbstregistrierung legt IMMER einen Kunden an (Jonas' Vorgabe 2026-07-22:
// Konstrukteur-/Admin-Rolle wird vom Admin vergeben, nicht selbst gewaehlt).
export function register(email: string, name: string, password: string): User | { error: string } {
  if (findUserByEmail(email)) return { error: "Diese E-Mail ist bereits registriert." };
  const user: User = { id: crypto.randomUUID(), email, name, role: "kunde", password };
  const users = loadUsers();
  users.push(user);
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

// Admin legt einen Mitarbeiter (Konstrukteur/Admin) direkt per E-Mail an -
// Jonas' Vorgabe 2026-07-22: "kann User anhand der E-Mail anlegen".
export function createEmployee(email: string, name: string, role: Role): User | { error: string } {
  if (findUserByEmail(email)) return { error: "Diese E-Mail ist bereits registriert." };
  const user: User = { id: crypto.randomUUID(), email, name, role, password: crypto.randomUUID().slice(0, 8) };
  const users = loadUsers();
  users.push(user);
  saveUsers(users);
  return user;
}

export function setUserRole(userId: string, role: Role) {
  const users = loadUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.role = role;
    saveUsers(users);
  }
}

export function deleteUser(userId: string) {
  saveUsers(loadUsers().filter((u) => u.id !== userId));
}
