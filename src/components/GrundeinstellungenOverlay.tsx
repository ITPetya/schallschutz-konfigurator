import { useState } from "react";
import { Dialog, DialogOverlay, DialogPortal, DialogContent, DialogTitle, DialogDescription } from "./primitives/Dialog";
import { AnimatedButton } from "./AnimatedButton";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";

export interface GrundeinstellungenResult {
  name: string;
  standort?: string;
}

interface GrundeinstellungenOverlayProps {
  open: boolean;
  onSubmit: (result: GrundeinstellungenResult) => void;
}

// Overlay beim ERSTEN Einstieg in ein neues Projekt (Jonas' Vorgabe
// 2026-07-25: "soll ein Overlay-Fenster aufpoppen, welches ein paar
// Grundeinstellungen abfragt") - fragt Bezeichnung und optional einen
// Standort ab; Größe/Farbe gehören inzwischen zu den einzelnen Containern
// innerhalb des Projekts und werden dort beim Anlegen/Bearbeiten festgelegt.
// Erscheint NICHT, wenn schon ein sinnvolles (nicht-leeres) Projekt im Cache
// liegt, siehe WorkspacePage.tsx für die genaue Bedingung. Baut auf
// animate-ui.com's Dialog-Primitive auf (Jonas' Vorgabe, siehe
// https://animate-ui.com/docs/components/radix/dialog) - Escape/Klick
// daneben schliessen es bewusst NICHT (siehe onEscapeKeyDown/
// onPointerDownOutside unten), weil eine Bezeichnung Pflicht ist, bevor es
// weitergeht.
export function GrundeinstellungenOverlay({ open, onSubmit }: GrundeinstellungenOverlayProps) {
  const [name, setName] = useState("Neues Projekt");
  const [standort, setStandort] = useState("");

  function handleSubmit() {
    onSubmit({ name, standort: standort.trim() || undefined });
  }

  return (
    <Dialog open={open}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800">
            <DialogTitle className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">
              Grundeinstellungen
            </DialogTitle>
            <DialogDescription className="mb-4 text-sm text-slate-600 dark:text-slate-300">Wie soll dein Projekt heißen?</DialogDescription>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Bezeichnung</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Standort (optional)</span>
              <input
                value={standort}
                onChange={(e) => setStandort(e.target.value)}
                placeholder="z. B. Musterstadt"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <AnimatedButton
              type="button"
              data-tour="grundeinstellungen-submit"
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
            >
              Weiter
              <ArrowRightIcon size={16} />
            </AnimatedButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
