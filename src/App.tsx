import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TourProvider } from "./tour/TourContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppShell } from "./layout/AppShell";
import { StartPage } from "./pages/StartPage";
import { Progress, ProgressIndicator } from "./components/primitives/Progress";

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
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<StartPage />} />
                <Route path="/projekt" element={<WorkspacePage />} />
                <Route path="/intern" element={<InternalPage />} />
                <Route path="/hilfe" element={<HilfePage />} />
              </Route>
            </Routes>
          </Suspense>
        </TourProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Baut auf animate-ui.com's Progress-Primitive auf (Jonas' Vorgabe, siehe
// https://animate-ui.com/docs/components/radix/progress) statt des reinen
// "Lädt…"-Textes. Da fuer einen nachgeladenen Route-Chunk kein echter
// Fortschrittswert bekannt ist, naehert sich der Balken asymptotisch 90 %
// an (haelt dort, bis die Route tatsaechlich fertig geladen ist und dieser
// Fallback verschwindet) - dasselbe Prinzip wie z. B. YouTubes/NProgress'
// Ladebalken.
function RouteLoadingFallback() {
  const [value, setValue] = useState(15);

  useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => v + (90 - v) * 0.1);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400 dark:text-slate-500">
      <Progress value={value} className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <ProgressIndicator className="h-full w-full bg-brand" />
      </Progress>
      Lädt…
    </div>
  );
}

export default App;
