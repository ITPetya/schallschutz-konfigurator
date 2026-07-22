import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getProject } from "../projects/mockProjectStore";
import { KonfiguratorPage } from "./KonfiguratorPage";

// Read-only Viewer fuer ein zugeteiltes Projekt (Jonas' Vorgabe 2026-07-22).
// Zugriff nur fuer den zugewiesenen Konstrukteur oder einen Admin.
export function KonstrukteurViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const project = id ? getProject(id) : undefined;

  if (!project) {
    return <p className="p-8 text-slate-500">Projekt wurde nicht gefunden.</p>;
  }
  if (user?.role !== "admin" && project.assignedKonstrukteurId !== user?.id) {
    return <p className="p-8 text-slate-500">Dieses Projekt ist dir nicht zugeteilt.</p>;
  }

  return <KonfiguratorPage mode="readonly" initialConfig={project.config} projectName={project.name} />;
}
