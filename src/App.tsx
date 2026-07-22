import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AuthPopoverProvider } from "./layout/AuthPopoverContext";
import { TourProvider } from "./tour/TourContext";
import { AppShell } from "./layout/AppShell";
import { RequireRole } from "./layout/RequireRole";
import { StartPage } from "./pages/StartPage";
import { KonfiguratorPage } from "./pages/KonfiguratorPage";
import { KundeProjectsPage } from "./pages/KundeProjectsPage";
import { KonstrukteurProjectsPage } from "./pages/KonstrukteurProjectsPage";
import { KonstrukteurViewerPage } from "./pages/KonstrukteurViewerPage";
import { AdminProjectsPage } from "./pages/AdminProjectsPage";
import { AdminEmployeesPage } from "./pages/AdminEmployeesPage";
import { AdminStandardsPage } from "./pages/AdminStandardsPage";

// 3 Rollenbereiche (Jonas' Vorgabe 2026-07-22: Kunde/Konstrukteur/Admin) -
// reines Mock-Grundgeruest, siehe auth/mockAuthStore.ts und
// projects/mockProjectStore.ts fuer die localStorage-Einschraenkung.
function App() {
  return (
    <AuthProvider>
      <AuthPopoverProvider>
        <BrowserRouter>
          <TourProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<StartPage />} />
                <Route path="/konfigurator" element={<KonfiguratorPage />} />
                <Route path="/projekte" element={<KundeProjectsPage />} />
                <Route
                  path="/konstrukteur/projekte"
                  element={
                    <RequireRole roles={["konstrukteur"]}>
                      <KonstrukteurProjectsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/konstrukteur/viewer/:id"
                  element={
                    <RequireRole roles={["konstrukteur"]}>
                      <KonstrukteurViewerPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/projekte"
                  element={
                    <RequireRole roles={["admin"]}>
                      <AdminProjectsPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/mitarbeiter"
                  element={
                    <RequireRole roles={["admin"]}>
                      <AdminEmployeesPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/standards"
                  element={
                    <RequireRole roles={["admin"]}>
                      <AdminStandardsPage />
                    </RequireRole>
                  }
                />
              </Route>
            </Routes>
          </TourProvider>
        </BrowserRouter>
      </AuthPopoverProvider>
    </AuthProvider>
  );
}

export default App;
