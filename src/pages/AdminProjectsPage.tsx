import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { listUsers } from "../auth/mockAuthStore";
import { assignKonstrukteur, listAllProjects, setProjectStatus } from "../projects/mockProjectStore";
import type { ProjectStatus } from "../projects/types";

const STATUS_OPTIONS: ProjectStatus[] = ["angefragt", "in Bearbeitung", "fertig"];

// Konsolidierte Ansicht ALLER von Kunden angefragten Projekte (Jonas' Vorgabe
// 2026-07-22: "die Auflistung der Projekte ist nur einmal fuer ihn als Seite
// zusammengefasst"). Von hier aus weist der Admin Konstrukteure zu.
export function AdminProjectsPage() {
  const [version, setVersion] = useState(0);
  const navigate = useNavigate();
  const projects = listAllProjects();
  const users = listUsers();
  const konstrukteure = users.filter((u) => u.role === "konstrukteur");

  function ownerName(ownerId: string) {
    return users.find((u) => u.id === ownerId)?.name ?? "Unbekannt";
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">
        Alle angefragten Projekte
      </h1>
      {projects.length === 0 ? (
        <p className="text-slate-500">Noch keine Projekte angefragt.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-brand-dark">{p.name}</p>
                  <p className="text-xs text-slate-400">
                    Kunde: {ownerName(p.ownerId)} · {new Date(p.createdAt).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/konstrukteur/viewer/${p.id}`)}
                  className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Ansehen
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-500">
                  Status
                  <select
                    value={p.status}
                    onChange={(e) => {
                      setProjectStatus(p.id, e.target.value as ProjectStatus);
                      setVersion((v) => v + 1);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-slate-500">
                  Konstrukteur
                  <select
                    value={p.assignedKonstrukteurId ?? ""}
                    onChange={(e) => {
                      assignKonstrukteur(p.id, e.target.value || null);
                      setVersion((v) => v + 1);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-ink focus:border-brand focus:outline-none"
                  >
                    <option value="">Nicht zugewiesen</option>
                    {konstrukteure.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* setVersion erzwingt einen Re-Render nach localStorage-Aenderungen,
          da listAllProjects() nicht reaktiv ist - version selbst hat keine
          eigene Bedeutung, muss aber referenziert werden. */}
      <span className="hidden">{version}</span>
    </div>
  );
}
