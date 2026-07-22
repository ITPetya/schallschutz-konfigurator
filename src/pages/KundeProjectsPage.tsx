import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "../layout/AuthPopoverContext";
import { listProjectsForOwner } from "../projects/mockProjectStore";

// Jonas' Vorgabe 2026-07-22: Konfigurator funktioniert auch ohne Login, aber
// diese Seite (gespeicherte Projekte) zeigt ohne Login nur einen Hinweis.
export function KundeProjectsPage() {
  const { user } = useAuth();
  const { open: openAuth } = useAuthPopover();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-slate-500">Für gespeicherte Projekte bitte registrieren oder anmelden.</p>
        <button
          type="button"
          onClick={openAuth}
          className="rounded-full bg-brand px-6 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Registrieren oder anmelden
        </button>
      </div>
    );
  }

  const projects = listProjectsForOwner(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">
        Gespeicherte Projekte
      </h1>
      {projects.length === 0 ? (
        <p className="text-slate-500">
          Noch keine Projekte gespeichert. Im{" "}
          <button type="button" onClick={() => navigate("/konfigurator")} className="font-medium text-brand underline">
            Konfigurator
          </button>{" "}
          kann ein Projekt angefragt werden.
        </p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-brand-dark">{p.name}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{p.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Angelegt am {new Date(p.createdAt).toLocaleDateString("de-DE")} ·{" "}
                {p.assignedKonstrukteurId ? "Konstrukteur zugewiesen" : "Noch kein Konstrukteur zugewiesen"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
