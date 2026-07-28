import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ProjectConfig } from "../config/projectTypes";
import { KonfiguratorPage } from "./KonfiguratorPage";
import { InternalProjectViewer } from "./InternalProjectViewer";
import { AnimatedButton } from "../components/AnimatedButton";
import { ArrowLeftIcon } from "../components/icons/ArrowLeftIcon";

// Oeffentlicher, schreibgeschuetzter Baugruppen-Viewer fuer die Handy-Variante
// (Jonas' Vorgabe 2026-07-28: "das Ding soll auf dem Handy nur ein Viewer
// sein" - Konfigurieren bleibt Laptop/PC/Tablet vorbehalten, siehe
// StartPage.tsx/useIsPhoneViewport.ts). Bewusst dieselben Bausteine wie der
// interne Mitarbeiter-Viewer (InternalPage.tsx: InternalProjectViewer +
// KonfiguratorPage fuers Reindrillen in einen einzelnen Container) statt
// eigener Logik - der einzige Unterschied ist der fehlende Zugangscode und
// der "Zurück zum Start"-Link statt der Datei-Auswahl (das Projekt kommt hier
// immer per Navigations-State von StartPage.tsx, nie durch eigenes Laden auf
// dieser Seite).
export function ProjectViewerPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeProject = (location.state as { project?: ProjectConfig } | null)?.project;
  const [drillInInstanceId, setDrillInInstanceId] = useState<string | null>(null);

  if (!routeProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Kein Projekt geladen.</p>
        <AnimatedButton
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 rounded-full bg-brand px-6 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          <ArrowLeftIcon size={16} />
          Zurück zum Start
        </AnimatedButton>
      </div>
    );
  }

  const drillInInstance = drillInInstanceId ? routeProject.instances.find((i) => i.id === drillInInstanceId) : undefined;
  if (drillInInstance) {
    return (
      <KonfiguratorPage
        initialConfig={drillInInstance.config}
        projectName={`${routeProject.name} – ${drillInInstance.label}`}
        onBack={() => setDrillInInstanceId(null)}
        backLabel="Zurück zur Baugruppe"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
        <AnimatedButton
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
        >
          <ArrowLeftIcon size={16} />
          Zurück zum Start
        </AnimatedButton>
      </div>
      <div className="min-h-0 flex-1">
        <InternalProjectViewer project={routeProject} onOpenInstance={setDrillInInstanceId} />
      </div>
    </div>
  );
}
