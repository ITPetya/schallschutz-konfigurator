import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "./AuthPopoverContext";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

// Login-/Registrieren-Fenster, das "aus dem Icon" oben rechts erscheint
// (Jonas' Vorgabe 2026-07-22). Zeigt bei eingeloggtem Nutzer stattdessen
// Name/Rolle + Abmelden.
export function AuthPopover() {
  const { user, login, logout, register } = useAuth();
  const { isOpen, close } = useAuthPopover();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function resetFields() {
    setEmail("");
    setName("");
    setPassword("");
    setError(null);
  }

  function handleLogin() {
    if (!login(email, password)) {
      setError("E-Mail oder Passwort ist falsch.");
      return;
    }
    resetFields();
    close();
  }

  function handleRegister() {
    const err = register(email, name, password);
    if (err) {
      setError(err);
      return;
    }
    resetFields();
    close();
  }

  return (
    <>
      {/* Klick ausserhalb schliesst das Popover. */}
      <div className="fixed inset-0 z-40" onClick={close} />
      <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
        {user ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-brand-dark">{user.name}</p>
            <p className="text-xs text-slate-500">
              {user.email} · {roleLabel(user.role)}
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                close();
              }}
              className="w-full rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Abmelden
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium ${
                  tab === "login" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setError(null);
                }}
                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium ${
                  tab === "register" ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                Registrieren
              </button>
            </div>

            <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            {tab === "register" && (
              <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            )}
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="button"
              onClick={tab === "login" ? handleLogin : handleRegister}
              className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
            >
              {tab === "login" ? "Anmelden" : "Registrieren"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function roleLabel(role: "kunde" | "konstrukteur" | "admin") {
  if (role === "admin") return "Admin";
  if (role === "konstrukteur") return "Konstrukteur";
  return "Kunde";
}
