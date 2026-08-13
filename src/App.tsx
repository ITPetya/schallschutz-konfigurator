import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TourProvider } from "./tour/TourContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppShell } from "./layout/AppShell";
import { StartPage } from "./pages/StartPage";
import { LoadingIndicator } from "./components/LoadingIndicator";

// WorkspacePage (Baugruppen-Konfigurator, siehe dort) und InternalPage
// ziehen den gesamten three.js/r3f/drei/three-bvh-csg-Stack nach (>1MB
// minifiziert) - per Performance-Audit 2026-07-23 lag der VORHER 1,5MB-
// Bundle allein daran, dass App.tsx sie eager importiert hat, wodurch schon
// die Startseite (StartPage) und die Hilfeseite (die BEIDE gar keinen
// 3D-Viewer brauchen) den vollen 3D-Stack mitladen mussten. React.lazy()
// teilt sie in eigene Chunks auf, die erst beim tatsaechlichen Navigieren
// nachgeladen werden.
const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));
const InternalPage = lazy(() => import("./pages/InternalPage").then((m) => ({ default: m.InternalPage })));
const HilfePage = lazy(() => import("./pages/HilfePage").then((m) => ({ default: m.HilfePage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));
// Oeffentlicher, schreibgeschuetzter Viewer fuer die Handy-Variante (Jonas'
// Vorgabe 2026-07-28, siehe ProjectViewerPage.tsx) - eigener lazy Chunk aus
// demselben Grund wie WorkspacePage/InternalPage (zieht den 3D-Stack nach).
const ProjectViewerPage = lazy(() => import("./pages/ProjectViewerPage").then((m) => ({ default: m.ProjectViewerPage })));

// Jonas' Vorgabe 2026-07-23: kein Server/Login/Rollen mehr - reiner
// Client-Konfigurator, Konfigurationen werden als verschlüsselte Datei
// gespeichert/geladen statt in einer Datenbank (siehe config/configFileCodec.ts).
// /intern ist eine bewusst NICHT verlinkte, versteckte Seite fuer Mitarbeiter
// (siehe pages/InternalPage.tsx) - der fruehere Multi-Rollen-Stand
// (Kunde/Konstrukteur/Admin/Verkaeufer mit Mock-Backend) bleibt vollstaendig
// im Branch "archiv/rollen-mitarbeiter-backend-2026-07-23" erhalten.
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <TourProvider>
          <Suspense fallback={<LoadingIndicator loadType="route" />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<StartPage />} />
                <Route path="/projekt" element={<WorkspacePage />} />
                <Route path="/ansehen" element={<ProjectViewerPage />} />
                <Route path="/intern" element={<InternalPage />} />
                <Route path="/hilfe" element={<HilfePage />} />
                <Route path="/verlauf" element={<HistoryPage />} />
              </Route>
            </Routes>
          </Suspense>
        </TourProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
