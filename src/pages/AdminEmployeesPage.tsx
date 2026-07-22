import { useState } from "react";
import { createEmployee, deleteUser, listUsers, setUserRole } from "../auth/mockAuthStore";
import type { Role, User } from "../auth/types";
import { roleLabel } from "../auth/roleLabels";
import { useAuth } from "../auth/AuthContext";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

type UserFilter = "mitarbeiter" | "kunden" | "alle";

const filterBtn = (active: boolean) =>
  `flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`;

function promotionWarning(newRole: Role): string {
  if (newRole === "admin") return "vollen administrativen Zugriff auf alle Kunden-, Projekt- und Mitarbeiterdaten";
  if (newRole === "konstrukteur") return "Zugriff auf zugeteilte Kundenprojekte inklusive aller technischen Details";
  return "Einsicht in alle Kundenprojekte inklusive Kontaktdaten";
}

// Mitarbeiterverwaltung (Jonas' Vorgabe 2026-07-22/23): Admin legt Konstrukteure/
// Verkaeufer/Admins direkt per E-Mail an oder aendert die Rolle bestehender
// Nutzer. Filter blendet Kunden standardmaessig aus (diese Seite ist primaer
// fuer Mitarbeiter gedacht), und ein Hochstufen eines Kundenkontos auf eine
// Mitarbeiterrolle erfordert eine explizite Sicherheitsbestaetigung.
export function AdminEmployeesPage() {
  const { user: currentUser } = useAuth();
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<UserFilter>("mitarbeiter");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("konstrukteur");
  const [error, setError] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ user: User; newRole: Role } | null>(null);

  const users = listUsers();
  const filteredUsers = users.filter((u) => {
    if (filter === "mitarbeiter") return u.role !== "kunde";
    if (filter === "kunden") return u.role === "kunde";
    return true;
  });

  function handleCreate() {
    const result = createEmployee(email, name, role);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEmail("");
    setName("");
    setError(null);
    setVersion((v) => v + 1);
  }

  function applyRoleChange(userId: string, newRole: Role) {
    setUserRole(userId, newRole);
    setVersion((v) => v + 1);
  }

  // Jonas' Vorgabe 2026-07-23: Sicherheitswarnung, wenn ein Kundenkonto auf
  // eine Mitarbeiterrolle hochgestuft wird (Admin/Konstrukteur/Verkaeufer).
  function handleRoleSelect(u: User, newRole: Role) {
    if (u.role === "kunde" && newRole !== "kunde") {
      setPendingPromotion({ user: u, newRole });
      return;
    }
    applyRoleChange(u.id, newRole);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">Mitarbeiter</h1>

      <div className="mb-8 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Neuen Mitarbeiter anlegen</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
          <option value="konstrukteur">Konstrukteur</option>
          <option value="verkaeufer">Verkäufer</option>
          <option value="admin">Admin</option>
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Anlegen
        </button>
      </div>

      <div className="mb-3 flex gap-1">
        <button type="button" className={filterBtn(filter === "mitarbeiter")} onClick={() => setFilter("mitarbeiter")}>
          Mitarbeiter
        </button>
        <button type="button" className={filterBtn(filter === "kunden")} onClick={() => setFilter("kunden")}>
          Kunden
        </button>
        <button type="button" className={filterBtn(filter === "alle")} onClick={() => setFilter("alle")}>
          Alle
        </button>
      </div>

      <div className="space-y-2">
        {filteredUsers.length === 0 && <p className="text-sm text-slate-400">Keine Konten in dieser Ansicht.</p>}
        {filteredUsers.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div>
              <p className="font-medium text-brand-dark">{u.name}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => handleRoleSelect(u, e.target.value as Role)}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none"
              >
                <option value="kunde">Kunde</option>
                <option value="konstrukteur">Konstrukteur</option>
                <option value="verkaeufer">Verkäufer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                disabled={u.id === currentUser?.id}
                onClick={() => {
                  deleteUser(u.id);
                  setVersion((v) => v + 1);
                }}
                className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
      <span className="hidden">{version}</span>

      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-600">Sicherheitswarnung</p>
            <p className="mb-4 text-sm text-slate-600">
              <strong>{pendingPromotion.user.name}</strong> ({pendingPromotion.user.email}) ist aktuell ein{" "}
              <strong>Kundenkonto</strong>. Als „{roleLabel(pendingPromotion.newRole)}“ erhält dieses Konto{" "}
              {promotionWarning(pendingPromotion.newRole)}. Bist du sicher?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingPromotion(null)}
                className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  applyRoleChange(pendingPromotion.user.id, pendingPromotion.newRole);
                  setPendingPromotion(null);
                }}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700"
              >
                Trotzdem hochstufen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
