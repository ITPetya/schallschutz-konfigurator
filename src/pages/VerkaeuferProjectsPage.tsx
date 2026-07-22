import { listUsers } from "../auth/mockAuthStore";
import { listAllProjects } from "../projects/mockProjectStore";

const STALE_DAYS = 7;

// Verkaeufer sehen ALLE Kundenprojekte, unabhaengig vom Status - egal ob nur
// gespeichert oder schon angefragt (Jonas' Vorgabe 2026-07-23: "ob schon
// angefragt oder nur gespeichert, ist egal dabei") - damit lassen sich Leads
// erkennen, die seit einer Weile nicht mehr weiterbearbeitet wurden.
export function VerkaeuferProjectsPage() {
  const users = listUsers();
  const projects = [...listAllProjects()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function owner(ownerId: string) {
    return users.find((u) => u.id === ownerId);
  }

  return (
    <div data-tour="verkaeufer-projects-page" className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">Kundenprojekte</h1>
      <p className="mb-6 text-sm text-slate-500">
        Alle konfigurierten Kundenprojekte – angefragt oder nur gespeichert.
      </p>
      {projects.length === 0 ? (
        <p className="text-slate-500">Noch keine Kundenprojekte vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const o = owner(p.ownerId);
            const days = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const stale = days >= STALE_DAYS;
            return (
              <div
                key={p.id}
                className={`rounded-lg border p-4 shadow-sm ${stale ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-brand-dark">{p.name}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{p.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {o?.name ?? "Unbekannt"}
                  {o?.email ? ` · ${o.email}` : ""}
                  {o?.phone ? ` · ${o.phone}` : ""}
                  {o?.company ? ` · ${o.company.name}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Erstellt vor {days} {days === 1 ? "Tag" : "Tagen"}
                  {stale && (
                    <span className="ml-2 font-medium text-amber-700">
                      Möglicher Lead – seit {STALE_DAYS}+ Tagen keine Bewegung
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
