import { useRef, useState } from "react";
import { decodeConfig, CONFIG_FILE_EXTENSION } from "../config/configFileCodec";
import { decodeProject, PROJECT_FILE_EXTENSION } from "../config/projectFileCodec";
import type { ContainerConfig } from "../config/types";
import type { ProjectConfig } from "../config/projectTypes";
import { KonfiguratorPage } from "./KonfiguratorPage";
import { InternalProjectViewer } from "./InternalProjectViewer";
import { usePageSubtitle } from "../context/PageTitleContext";

// "Interne" Seite fuer Mitarbeiter (Jonas' Vorgabe 2026-07-23) - NICHT in
// Menü/Navigation verlinkt, nur ueber die direkte URL (/intern) erreichbar.
// Bewusst OHNE Zugangscode (Jonas' Vorgabe 2026-07-29: "es werden ja keine
// sensiblen Daten preisgegeben, es ist ja nur eine einfachere Variante des
// Viewers" - ein fruehrer clientseitiger Code-Vergleich war ohnehin keine
// echte Auth, siehe Git-Historie). Nach dem Laden einer .sszkonfig-/
// .sszprojekt-Datei erscheint dieselbe schreibgeschuetzte Detailansicht wie
// frueher der Konstrukteur-Viewer.
export function InternalPage() {
  usePageSubtitle("Interner Viewer");
  const [config, setConfig] = useState<ContainerConfig | null>(null);
  // Baugruppen jetzt gleichwertig ladbar (Jonas' Vorgabe 2026-07-25: "soll
  // man Baugruppen auch genauso gleichwertig wie einzelne Container laden
  // können, aber man soll auch die einzelnen Container aus den Baugruppen
  // öffnen können") - drillInInstanceId zeigt dann einen einzelnen Container
  // AUS der geladenen Baugruppe im selben schreibgeschuetzten Detail-Viewer.
  const [project, setProject] = useState<ProjectConfig | null>(null);
  const [drillInInstanceId, setDrillInInstanceId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isProject = file.name.endsWith(PROJECT_FILE_EXTENSION);
    try {
      if (isProject) {
        const decoded = await decodeProject(file);
        setProject(decoded);
        setConfig(null);
      } else {
        const decoded = await decodeConfig(file);
        setConfig(decoded);
        setProject(null);
      }
      setDrillInInstanceId(null);
      setFileName(file.name.replace(/\.(sszkonfig|sszprojekt)$/i, ""));
      setLoadError(null);
    } catch {
      setLoadError(
        isProject
          ? "Datei konnte nicht gelesen werden – ist es eine gültige .sszprojekt-Datei?"
          : "Datei konnte nicht gelesen werden – ist es eine gültige .sszkonfig-Datei?",
      );
    }
  }

  if (!config && !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Konfigurationsdatei (.sszkonfig) oder Baugruppen-Projekt (.sszprojekt) laden, um die Details anzusehen.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-brand px-6 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Datei auswählen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={`${CONFIG_FILE_EXTENSION},${PROJECT_FILE_EXTENSION}`}
          onChange={handleFileSelected}
          className="hidden"
        />
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      </div>
    );
  }

  if (project) {
    const drillInInstance = drillInInstanceId ? project.instances.find((i) => i.id === drillInInstanceId) : undefined;
    if (drillInInstance) {
      return (
        <KonfiguratorPage
          initialConfig={drillInInstance.config}
          projectName={`${fileName ?? project.name} – ${drillInInstance.label}`}
          onBack={() => setDrillInInstanceId(null)}
          backLabel="Zurück zur Baugruppe"
          kundenverlauf={project.kundenverlauf}
        />
      );
    }
    return (
      <InternalProjectViewer
        project={project}
        fileName={fileName ?? undefined}
        onOpenInstance={setDrillInInstanceId}
        kundenverlauf={project.kundenverlauf}
      />
    );
  }

  return <KonfiguratorPage initialConfig={config!} projectName={fileName ?? "Kundenkonfiguration"} kundenverlauf={config!.kundenverlauf} />;
}
