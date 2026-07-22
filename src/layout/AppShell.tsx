import { useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "./AuthPopoverContext";
import { AuthPopover } from "./AuthPopover";

// Oben links: Menu-Button zurueck zur Hauptseite, sobald eingeloggt zusaetzlich
// die rollenspezifischen Seiten (Jonas' Vorgabe 2026-07-22: "der button soll
// aber erstmal nirgendwo hinfuehren [ohne Login]"). Oben rechts: rundes,
// nicht ausgefuelltes Profil-Icon, das das Login/Registrieren-Fenster oeffnet.
export function AppShell() {
  const { user } = useAuth();
  const { isOpen: authOpen, open: openAuth } = useAuthPopover();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function go(path: string) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="h-1.5 bg-brand-light" />
      <header className="relative flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menü"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <nav className="absolute left-0 top-11 z-50 w-64 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
                <MenuItem onClick={() => go("/")}>Hauptseite</MenuItem>
                {user && (
                  <>
                    <MenuItem onClick={() => go("/konfigurator")}>Konfigurator</MenuItem>
                    {user.role === "kunde" && <MenuItem onClick={() => go("/projekte")}>Gespeicherte Projekte</MenuItem>}
                    {user.role === "konstrukteur" && (
                      <MenuItem onClick={() => go("/konstrukteur/projekte")}>Zugeteilte Projekte</MenuItem>
                    )}
                    {user.role === "admin" && (
                      <>
                        <div className="my-1 border-t border-slate-200" />
                        <p className="px-3 pt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p>
                        <MenuItem onClick={() => go("/admin/projekte")}>Alle Projekte</MenuItem>
                        <MenuItem onClick={() => go("/admin/mitarbeiter")}>Mitarbeiter</MenuItem>
                        <MenuItem onClick={() => go("/admin/standards")}>Standards</MenuItem>
                      </>
                    )}
                  </>
                )}
              </nav>
            </>
          )}
        </div>

        <Link to="/" className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={openAuth}
            aria-label="Konto"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 hover:border-brand hover:text-brand"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" />
            </svg>
          </button>
          {authOpen && <AuthPopover />}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100">
      {children}
    </button>
  );
}
