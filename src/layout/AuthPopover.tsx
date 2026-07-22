import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "./AuthPopoverContext";
import { useTour } from "../tour/TourContext";
import { hasSeenTour } from "../tour/tourStore";
import { firstLoginTourIdForRole } from "../tour/tourDefinitions";
import { roleLabel } from "../auth/roleLabels";
import { COMPANY_SIZE_OPTIONS, needsCompanyInfo, POSITION_OPTIONS } from "../constants/positions";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

// Login-/Registrieren-Fenster, das "aus dem Icon" oben rechts erscheint
// (Jonas' Vorgabe 2026-07-22). Zeigt bei eingeloggtem Nutzer stattdessen
// Name/Rolle + Abmelden. Registrierung ist AUSSCHLIESSLICH fuer Kunden
// (Jonas' Vorgabe 2026-07-23) - Mitarbeiter/Admin/Verkaeufer werden nur vom
// Admin manuell angelegt (AdminEmployeesPage), nicht ueber dieses Formular.
export function AuthPopover() {
  const { user, login, logout, register } = useAuth();
  const { isOpen, close } = useAuthPopover();
  const { start: startTour } = useTour();
  const [tab, setTab] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<string>("Sonstige");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companySize, setCompanySize] = useState(COMPANY_SIZE_OPTIONS[0]);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const showCompanyFields = needsCompanyInfo(position);

  function resetFields() {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setPosition("Sonstige");
    setCompanyName("");
    setCompanyAddress("");
    setCompanySize(COMPANY_SIZE_OPTIONS[0]);
    setError(null);
  }

  // Startet die "erste Anmeldung"-Tour fuer die jeweilige Rolle automatisch,
  // aber nur einmal pro Browser (Jonas' Vorgabe 2026-07-22) - der manuelle
  // "?"-Button in AppShell funktioniert unabhaengig davon jederzeit.
  function maybeStartFirstLoginTour(role: Parameters<typeof firstLoginTourIdForRole>[0]) {
    const tourId = firstLoginTourIdForRole(role);
    if (tourId && !hasSeenTour(tourId)) startTour(tourId);
  }

  function handleLogin() {
    const loggedIn = login(email, password);
    if (!loggedIn) {
      setError("E-Mail oder Passwort ist falsch.");
      return;
    }
    resetFields();
    close();
    maybeStartFirstLoginTour(loggedIn.role);
  }

  function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Bitte alle Pflichtfelder ausfüllen.");
      return;
    }
    if (showCompanyFields && (!companyName.trim() || !companyAddress.trim())) {
      setError("Bitte Unternehmensangaben vervollständigen.");
      return;
    }
    const result = register({
      email,
      password,
      firstName,
      lastName,
      phone,
      position,
      company: showCompanyFields ? { name: companyName, address: companyAddress, size: companySize } : undefined,
    });
    if (typeof result === "string") {
      setError(result);
      return;
    }
    resetFields();
    close();
    maybeStartFirstLoginTour(result.role);
  }

  return (
    <>
      {/* Klick ausserhalb schliesst das Popover. */}
      <div className="fixed inset-0 z-40" onClick={close} />
      <div className="absolute right-0 top-12 z-50 max-h-[85vh] w-96 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
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

            {tab === "login" ? (
              <>
                <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                <input
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400">
                  Die Registrierung ist für Kunden. Mitarbeiterkonten werden von einem Admin angelegt.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                  <input type="text" placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                </div>
                <input type="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                <input type="tel" placeholder="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                <label className="block text-xs text-slate-500">
                  Position
                  <select value={position} onChange={(e) => setPosition(e.target.value)} className={`${inputClass} mt-0.5`}>
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                {showCompanyFields && (
                  <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-500">Unternehmensangaben</p>
                    <input
                      type="text"
                      placeholder="Firmenname"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Firmenadresse"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className={inputClass}
                    />
                    <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className={inputClass}>
                      {COMPANY_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <input
                  type="password"
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </>
            )}

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
