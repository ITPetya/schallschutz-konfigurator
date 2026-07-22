import { useState } from "react";
import { createEmployee, deleteUser, listUsers, setUserRole } from "../auth/mockAuthStore";
import type { Role } from "../auth/types";
import { useAuth } from "../auth/AuthContext";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

// Mitarbeiterverwaltung (Jonas' Vorgabe 2026-07-22): Admin legt Konstrukteure/
// Admins direkt per E-Mail an oder aendert die Rolle bestehender Nutzer.
export function AdminEmployeesPage() {
  const { user: currentUser } = useAuth();
  const [version, setVersion] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("konstrukteur");
  const [error, setError] = useState<string | null>(null);

  const users = listUsers();

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

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div>
              <p className="font-medium text-brand-dark">{u.name}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => {
                  setUserRole(u.id, e.target.value as Role);
                  setVersion((v) => v + 1);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none"
              >
                <option value="kunde">Kunde</option>
                <option value="konstrukteur">Konstrukteur</option>
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
    </div>
  );
}
