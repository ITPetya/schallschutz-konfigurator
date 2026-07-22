import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TourProvider } from "./tour/TourContext";
import { AppShell } from "./layout/AppShell";
import { StartPage } from "./pages/StartPage";
import { KonfiguratorPage } from "./pages/KonfiguratorPage";
import { InternalPage } from "./pages/InternalPage";

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
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<StartPage />} />
            <Route path="/konfigurator" element={<KonfiguratorPage />} />
            <Route path="/intern" element={<InternalPage />} />
          </Route>
        </Routes>
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
