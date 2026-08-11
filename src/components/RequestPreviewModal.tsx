import { useMemo, useState } from "react";
import { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from "./primitives/Dialog";
import { AnimatedButton } from "./AnimatedButton";
import { Chevron } from "./icons/Chevron";
import { DownloadIcon } from "./icons/DownloadIcon";
import { SendIcon } from "./icons/SendIcon";
import { CircleXIcon } from "./icons/CircleXIcon";
import { LoadingIcon } from "./LoadingIcon";
import type { ContainerInstance } from "../config/projectTypes";
import { getCategorizedContainerWarnings, type WarningCategory } from "../utils/containerWarnings";

interface RequestPreviewModalProps {
  open: boolean;
  projectName: string;
  standort?: string;
  instances: ContainerInstance[];
  savingProject?: boolean;
  onClose: () => void;
  onSave: () => void;
  onSend: () => void;
  // Springt in die Detailbearbeitung der genannten Instanz und klappt dort
  // den Abschnitt auf, der die jeweilige Sonderheit verursacht (siehe
  // WorkspacePage.tsx's CATEGORY_TO_TOUR_ID) - schliesst dabei automatisch
  // dieses Modal (Aufrufer-Verantwortung).
  onJumpToWarning: (instanceId: string, category: WarningCategory) => void;
}

// Jonas' Vorgabe 2026-08-11: bevor eine Anfrage WIRKLICH abgeschickt wird,
// erst eine Vorschau mit den wichtigsten Projektdaten zeigen, statt (wie
// bisher) direkt beim Klick auf "Anfragen" die E-Mail zu oeffnen. Die
// bestehende Sonderheiten-Maschinerie (containerWarnings.ts) liefert dafuer
// bereits alles, was noetig ist - hier nur neu zusammengestellt zu einer
// anklickbaren, aufklappbaren Liste PRO CONTAINER.
export function RequestPreviewModal({
  open,
  projectName,
  standort,
  instances,
  savingProject,
  onClose,
  onSave,
  onSend,
  onJumpToWarning,
}: RequestPreviewModalProps) {
  const [expanded, setExpanded] = useState(false);

  // Bei JEDEM Oeffnen neu berechnet (kein Memo-Cache ueber `open` hinweg
  // noetig) - Warnungen sind reine Ableitungen aus dem aktuellen `instances`-
  // Stand, billig genug fuer eine Handvoll Container.
  const perInstanceWarnings = useMemo(
    () => instances.map((inst) => ({ inst, warnings: getCategorizedContainerWarnings(inst.config) })),
    [instances],
  );
  const totalCount = perInstanceWarnings.reduce((sum, { warnings }) => sum + warnings.length, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/40" />
        {/* Jonas' Vorgabe 2026-08-11: "muss immer echten Abstand zum oberen/
            unteren Bildschirmrand behalten und beim Aufklappen scrollbar
            werden, statt ueber den Bildschirm hinauszuwachsen" -
            max-h-[90vh] + overflow-y-auto ist bereits das etablierte Muster
            im Projekt fuer genau diesen Fall (siehe
            GrundeinstellungenOverlay.tsx), hier unveraendert uebernommen. */}
        <DialogContent className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800">
            <DialogTitle className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Anfrage prüfen</DialogTitle>
            <DialogDescription className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Diese Angaben werden mit deiner Anfrage übermittelt. Prüfe sie kurz, bevor du sie abschickst.
            </DialogDescription>

            <dl className="mb-4 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              <dt className="text-slate-400 dark:text-slate-500">Projekt</dt>
              <dd className="truncate">{projectName}</dd>
              {standort && (
                <>
                  <dt className="text-slate-400 dark:text-slate-500">Standort</dt>
                  <dd className="truncate">{standort}</dd>
                </>
              )}
              <dt className="text-slate-400 dark:text-slate-500">Container</dt>
              <dd>{instances.length}</dd>
            </dl>

            <ul className="mb-4 space-y-1 text-sm">
              {instances.map((inst, i) => (
                <li key={inst.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 dark:bg-slate-900">
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {i + 1}. {inst.label}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {inst.config.size.length} × {inst.config.size.width} × {inst.config.size.height} mm
                  </span>
                </li>
              ))}
            </ul>

            {/* "Ihr Projekt enthält XX Sonderheiten" - anklickbar/aufklappbar
                (Jonas' Vorgabe 2026-08-11), nur wenn es ueberhaupt welche
                gibt. Bei 0 lieber eine kurze, positive Bestaetigung statt
                einer leeren/toten Zeile. */}
            {totalCount > 0 ? (
              <div className="mb-2">
                <AnimatedButton
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 rounded bg-orange-50 px-2.5 py-2 text-left text-sm font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200"
                >
                  <span>
                    Ihr Projekt enthält {totalCount} {totalCount === 1 ? "Sonderheit" : "Sonderheiten"}
                  </span>
                  <Chevron direction={expanded ? "up" : "down"} />
                </AnimatedButton>
                {expanded && (
                  <ul className="mt-1.5 space-y-1">
                    {perInstanceWarnings.flatMap(({ inst, warnings }) =>
                      warnings.map((w, i) => (
                        <li key={`${inst.id}-${i}`}>
                          <button
                            type="button"
                            onClick={() => onJumpToWarning(inst.id, w.category)}
                            className={`flex w-full items-start gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 ${
                              w.warning.severity === "red" ? "text-red-700 dark:text-red-300" : "text-orange-800 dark:text-orange-200"
                            }`}
                          >
                            <span
                              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${w.warning.severity === "red" ? "bg-red-500" : "bg-orange-500"}`}
                            />
                            <span>
                              <span className="font-semibold">{inst.label}:</span> {w.warning.text}
                            </span>
                          </button>
                        </li>
                      )),
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Ihr Projekt enthält keine Sonderheiten.</p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <AnimatedButton
                  type="button"
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <CircleXIcon size={16} />
                  Weiter Bearbeiten
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  onClick={onSave}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                >
                  {savingProject ? <LoadingIcon active kind="saving" size={16} /> : <DownloadIcon size={16} />}
                  Speichern
                </AnimatedButton>
              </div>
              <AnimatedButton
                type="button"
                onClick={onSend}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
              >
                <SendIcon size={16} />
                Anfragen
              </AnimatedButton>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
