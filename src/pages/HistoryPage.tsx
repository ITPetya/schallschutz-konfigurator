import { useNavigate } from "react-router-dom";
import { getHistoryEntries, MAX_HISTORY_ENTRIES, type ProjectHistoryEntry } from "../config/projectHistoryStore";
import { AnimatedButton } from "../components/AnimatedButton";
import { ArrowRightIcon } from "../components/icons/ArrowRightIcon";
import { usePageSubtitle } from "../context/PageTitleContext";

// "?"-Menü -> "Verlauf" (Jonas' Vorgabe 2026-07-28: "unter dem ?-Button soll
// man dann den Verlauf aufrufen können"). Zeigt die bis zu MAX_HISTORY_ENTRIES
// zuletzt offenen Projekte (siehe projectHistoryStore.ts) - "Öffnen" navigiert
// mit der jeweiligen Eintrags-id zurück ins editierbare /projekt, sodass
// WEITER in genau diesen Eintrag geschrieben wird statt einen neuen anzulegen.
export function HistoryPage() {
  usePageSubtitle("Verlauf");
  const navigate = useNavigate();
  const entries = getHistoryEntries();

  function handleOpen(entry: ProjectHistoryEntry) {
    navigate("/projekt", { state: { project: entry.project, historyId: entry.id } });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark dark:text-brand-light">
        Verlauf
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Zuletzt bearbeitete Projekte, automatisch in diesem Browser zwischengespeichert.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Noch kein zwischengespeichertes Projekt vorhanden.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-ink dark:text-slate-100">{entry.project.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {entry.project.instances.length} Container · zuletzt bearbeitet {formatUpdatedAt(entry.updatedAt)}
                </p>
              </div>
              <AnimatedButton
                type="button"
                onClick={() => handleOpen(entry)}
                className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand hover:text-brand-dark"
              >
                Öffnen
                <ArrowRightIcon size={13} />
              </AnimatedButton>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        Begrenzt auf die letzten {MAX_HISTORY_ENTRIES} Projekte – ältere Stände fallen automatisch raus.
      </p>
    </div>
  );
}

function formatUpdatedAt(updatedAt: number): string {
  return new Date(updatedAt).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
