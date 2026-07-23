import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TourProvider } from "./tour/TourContext";
import { AppShell } from "./layout/AppShell";
import { StartPage } from "./pages/StartPage";

// KonfiguratorPage und InternalPage ziehen den gesamten three.js/r3f/drei/
// three-bvh-csg-Stack nach (>1MB minifiziert) - per Performance-Audit
// 2026-07-23 lag der VORHER 1,5MB-Bundle allein daran, dass App.tsx sie
// eager importiert hat, wodurch schon die Startseite (StartPage) und die
// Hilfeseite (die BEIDE gar keinen 3D-Viewer brauchen) den vollen 3D-Stack
// mitladen mussten. React.lazy() teilt sie in eigene Chunks auf, die erst
// beim tatsaechlichen Navigieren zu /konfigurator bzw. /intern nachgeladen
// werden.
const KonfiguratorPage = lazy(() => import("./pages/KonfiguratorPage").then((m) => ({ default: m.KonfiguratorPage })));
const InternalPage = lazy(() => import("./pages/InternalPage").then((m) => ({ default: m.InternalPage })));
const HilfePage = lazy(() => import("./pages/HilfePage").then((m) => ({ default: m.HilfePage })));
// ProjectPage (Baugruppen-Feature) ist reines SVG/DOM, kein 3D-Import - ein
// eigener lazy-Chunk lohnt sich trotzdem, damit StartPage/HilfePage sie
// nicht mitladen muessen, obwohl die meisten Besucher sie nie besuchen.
const ProjectPage = lazy(() => import("./pages/ProjectPage").then((m) => ({ default: m.ProjectPage })));

// Jonas' Vorgabe 2026-07-23: kein Server/Login/Rollen mehr - reiner
// Client-Konfigurator, Konfigurationen werden als verschlüsselte Datei
// gespeichert/geladen statt in einer Datenbank (siehe config/configFileCodec.ts).
// /intern ist eine bewusst NICHT verlinkte, versteckte Seite fuer Mitarbeiter
// (siehe pages/InternalPage.tsx) - der fruehere Multi-Rollen-Stand
// (Kunde/Konstrukteur/Admin/Verkaeufer mit Mock-Backend) bleibt vollstaendig
// im Branch "archiv/rollen-mitarbeiter-backend-2026-07-23" erhalten.
function App() {
  return (
    <BrowserRouter>
      <TourProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<StartPage />} />
              <Route path="/konfigurator" element={<KonfiguratorPage />} />
              <Route path="/projekt" element={<ProjectPage />} />
              <Route path="/intern" element={<InternalPage />} />
              <Route path="/hilfe" element={<HilfePage />} />
            </Route>
          </Routes>
        </Suspense>
      </TourProvider>
    </BrowserRouter>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      Lädt…
    </div>
  );
}

export default App;
