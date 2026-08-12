import { useState } from "react";
import { Link, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useTour } from "../tour/TourContext";
import { CONFIGURATOR_TOUR_ID } from "../tour/tourDefinitions";
import { TourOverlay } from "../tour/TourOverlay";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { StorageConsentBanner } from "../components/StorageConsentBanner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { clearProjectDraft } from "../config/projectHistoryStore";
import { AnimatedButton } from "../components/AnimatedButton";
import { CircleHelpIcon } from "../components/icons/CircleHelpIcon";
import { TrashIcon } from "../components/icons/TrashIcon";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/primitives/DropdownMenu";
import { ThemeToggle } from "../components/ThemeToggle";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletedMessage, setDeletedMessage] = useState(false);
  const [searchParams] = useSearchParams();
  const embed = searchParams.get("embed") === "1";

  function handleDeleteData() {
    clearProjectDraft();
    setShowDeleteConfirm(false);
    setDeletedMessage(true);
    window.setTimeout(() => setDeletedMessage(false), 4000);
  }

  return (
    <div className="relative flex h-full flex-col bg-white text-ink dark:bg-slate-900 dark:text-slate-100">
      {!embed && (
        <>
          {/* Nur EINE horizontale Linie am oberen Rand (Jonas' Fehlerbericht
              2026-07-23) - der Header selbst hat bewusst KEINEN eigenen border-b
              mehr, das war die zweite Linie direkt darunter. */}
          <div className="h-1.5 bg-brand-light" />
          <header className="flex items-center justify-between px-4 py-2.5">
            <Link to="/" className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark dark:text-brand-light">
              Container Studio
            </Link>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <HelpMenu
                onTutorial={() => startTour(CONFIGURATOR_TOUR_ID)}
                onHilfe={() => navigate("/hilfe")}
                onVerlauf={() => navigate("/verlauf")}
                onDeleteData={() => setShowDeleteConfirm(true)}
              />
            </div>
          </header>
        </>
      )}
      {embed && (
        <div className="absolute right-3 top-3 z-40 flex items-center gap-3">
          <ThemeToggle />
          <HelpMenu
            onTutorial={() => startTour(CONFIGURATOR_TOUR_ID)}
            onHilfe={() => navigate("/hilfe?embed=1")}
            onVerlauf={() => navigate("/verlauf")}
            onDeleteData={() => setShowDeleteConfirm(true)}
          />
        </div>
      )}

      <div className="min-h-0 flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <TourOverlay />
      <StorageConsentBanner />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Meine Daten löschen"
        message="Wirklich alle lokal zwischengespeicherten Projektdaten löschen? Das kann nicht rückgängig gemacht werden."
        confirmLabel="Ja, löschen"
        onConfirm={handleDeleteData}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {deletedMessage && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <p className="rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
            Deine Daten wurden gelöscht.
          </p>
        </div>
      )}
    </div>
  );
}

interface HelpMenuProps {
  onTutorial: () => void;
  onHilfe: () => void;
  onVerlauf: () => void;
  onDeleteData: () => void;
}

// Baut auf animate-ui.com's Dropdown-Menu-Primitive auf (Jonas' Vorgabe,
// siehe https://animate-ui.com/docs/components/radix/dropdown-menu) - der
// Button selbst (Trigger) verwaltet den Oeffnen/Schliessen-Zustand nicht
// mehr selbst, das uebernimmt jetzt Radix intern.
function HelpMenu({ onTutorial, onHilfe, onVerlauf, onDeleteData }: HelpMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedButton
          type="button"
          aria-label="Hilfe"
          data-tour="help-menu"
          className="flex items-center justify-center text-slate-400 hover:text-brand"
        >
          <CircleHelpIcon size={30} />
        </AnimatedButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={14}
        className="w-44 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <DropdownMenuItem
          onSelect={onTutorial}
          className="block cursor-pointer rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Tutorial
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onHilfe}
          className="block cursor-pointer rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Hilfe
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onVerlauf}
          className="block cursor-pointer rounded px-3 py-1.5 text-left text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Verlauf
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={onDeleteData}
          className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <TrashIcon size={15} />
          Meine Daten löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
