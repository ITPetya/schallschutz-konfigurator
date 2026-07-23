import { useState } from "react";
import { Link, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useTour } from "../tour/TourContext";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { TourOverlay } from "../tour/TourOverlay";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Kein Login/Rollen mehr (Jonas' Vorgabe 2026-07-23) - die Kopfzeile ist auf
// das Nötigste reduziert: Titel (Link zur Startseite) links, "?"-Button
// rechts. Der "?"-Button oeffnet ein kleines Menü mit "Tutorial" (startet
// die Tour erneut) und "Hilfe" (Jonas' Vorgabe 2026-07-24: fuehrt zu einer
// Kontaktseite, die er spaeter verlinkt - siehe pages/HilfePage.tsx).
//
// ?embed=1 (Nacht-Session 2026-07-23, Vorgabe "auf anderen Webseiten
// einbettbar"): der Konfigurator selbst hat serverseitig KEINE
// X-Frame-Options/CSP-Sperre, ist also schon per <iframe> einbettbar - ohne
// diesen Modus wuerde die eingebettete Seite aber eine zweite, redundante
// Kopfzeile (Marke + Titel) INNERHALB der schon vorhandenen Kopfzeile der
// Gastseite zeigen. Im Embed-Modus faellt nur diese Kopfzeile weg, der
// "?"-Button (Tutorial/Hilfe) bleibt als kleiner schwebender Button
// erhalten, weil er auch eingebettet nuetzlich ist.
export function AppShell() {
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const embed = searchParams.get("embed") === "1";

  return (
    <div className="relative flex h-full flex-col bg-white text-ink">
      {!embed && (
        <>
          {/* Nur EINE horizontale Linie am oberen Rand (Jonas' Fehlerbericht
              2026-07-23) - der Header selbst hat bewusst KEINEN eigenen border-b
              mehr, das war die zweite Linie direkt darunter. */}
          <div className="h-1.5 bg-brand-light" />
          <header className="flex items-center justify-between px-4 py-2.5">
            <Link to="/" className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark">
              Schallschutz-Sondercontainer
            </Link>

            <HelpMenu
              open={helpMenuOpen}
              onToggle={() => setHelpMenuOpen((v) => !v)}
              onClose={() => setHelpMenuOpen(false)}
              onTutorial={() => startTour(CONFIGURATOR_TOUR_ID)}
              onHilfe={() => navigate("/hilfe")}
            />
          </header>
        </>
      )}
      {embed && (
        <div className="absolute right-3 top-3 z-40">
          <HelpMenu
            open={helpMenuOpen}
            onToggle={() => setHelpMenuOpen((v) => !v)}
            onClose={() => setHelpMenuOpen(false)}
            onTutorial={() => startTour(CONFIGURATOR_TOUR_ID)}
            onHilfe={() => navigate("/hilfe?embed=1")}
          />
        </div>
      )}

      <div className="min-h-0 flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <TourOverlay />
    </div>
  );
}

interface HelpMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onTutorial: () => void;
  onHilfe: () => void;
}

function HelpMenu({ open, onToggle, onClose, onTutorial, onHilfe }: HelpMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Hilfe"
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-xs font-bold text-slate-400 hover:border-brand hover:text-brand"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <nav className="absolute right-0 top-11 z-50 w-44 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => {
                onClose();
                onTutorial();
              }}
              className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
            >
              Tutorial
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onHilfe();
              }}
              className="block w-full rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100"
            >
              Hilfe
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
