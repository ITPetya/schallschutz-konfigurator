import { Link, Outlet } from "react-router-dom";
import { useTour } from "../tour/TourContext";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { TourOverlay } from "../tour/TourOverlay";

// Kein Login/Rollen mehr (Jonas' Vorgabe 2026-07-23) - die Kopfzeile ist auf
// das Nötigste reduziert: Titel (Link zur Startseite) links, "?"-Button
// rechts, der das einzige verbliebene Tutorial jederzeit erneut startet.
export function AppShell() {
  const { start: startTour } = useTour();

  return (
    <div className="flex h-full flex-col bg-white text-ink">
      <div className="h-1.5 bg-brand-light" />
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <Link to="/" className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer
        </Link>

        <button
          type="button"
          onClick={() => startTour(CONFIGURATOR_TOUR_ID)}
          aria-label="Hilfe / Tutorial"
          title="Tutorial starten"
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 text-xs font-bold text-slate-400 hover:border-brand hover:text-brand"
        >
          ?
        </button>
      </header>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <TourOverlay />
    </div>
  );
}
