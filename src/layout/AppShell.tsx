import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useTour } from "../tour/TourContext";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { TourOverlay } from "../tour/TourOverlay";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Kein Login/Rollen mehr (Jonas' Vorgabe 2026-07-23) - die Kopfzeile ist auf
// das Nötigste reduziert: Titel (Link zur Startseite) links, "?"-Button
// rechts. Der "?"-Button oeffnet ein kleines Menü mit "Tutorial" (startet
// die Tour erneut) und "Hilfe" (Jonas' Vorgabe 2026-07-24: fuehrt zu einer
// Kontaktseite, die er spaeter verlinkt - siehe pages/HilfePage.tsx).
export function AppShell() {
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      {/* Nur EINE horizontale Linie am oberen Rand (Jonas' Fehlerbericht
          2026-07-23) - der Header selbst hat bewusst KEINEN eigenen border-b
          mehr, das war die zweite Linie direkt darunter. */}
      <div className="h-1.5 bg-brand-light" />
      <header className="flex items-center justify-between px-4 py-2.5">
        <Link to="/" className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setHelpMenuOpen((v) => !v)}
            aria-label="Hilfe"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold text-slate-400 hover:border-brand hover:text-brand"
          >
            ?
          </button>
          {helpMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setHelpMenuOpen(false)} />
              <nav className="absolute right-0 top-11 z-50 w-44 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setHelpMenuOpen(false);
                    startTour(CONFIGURATOR_TOUR_ID);
                  }}
                  className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
                >
                  Tutorial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHelpMenuOpen(false);
                    navigate("/hilfe");
                  }}
                  className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
                >
                  Hilfe
                </button>
              </nav>
            </>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <TourOverlay />
    </div>
  );
}
