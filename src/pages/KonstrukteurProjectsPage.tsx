import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listAllProjects, listProjectsForKonstrukteur } from "../projects/mockProjectStore";

// Konstrukteur sieht seine zugeteilten Projekte; Admin (der auch hierher
// navigieren kann, siehe RequireRole) sieht stattdessen alle - fuer den
// Admin ist die konsolidierte Ansicht ohnehin AdminProjectsPage, diese Seite
// bleibt aber nutzbar, falls er sich eine einzelne Konstrukteur-Sicht ansehen
// will (Jonas' Vorgabe 2026-07-22: "er kann alle Seiten sehen, auch Seiten
// eines Konstrukteurs").
export function KonstrukteurProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const projects = user.role === "admin" ? listAllProjects() : listProjectsForKonstrukteur(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">
        Zugeteilte Projekte
      </h1>
      {projects.length === 0 ? (
        <p className="text-slate-500">Aktuell sind keine Projekte zugeteilt.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="font-medium text-brand-dark">{p.name}</p>
                <p className="text-xs text-slate-400">Status: {p.status}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/konstrukteur/viewer/${p.id}`)}
                className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
              >
                Ansehen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
