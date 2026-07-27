import { AnimatedButton } from "./AnimatedButton";
import { CircleXIcon } from "./icons/CircleXIcon";
import { CheckIcon } from "./icons/CheckIcon";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Einfacher Ja/Nein-Bestaetigungsdialog (Jonas' Vorgabe 2026-07-24: statt
// window.confirm() ein richtiger Dialog) - im Unterschied zu
// ThreeOptionConfirmDialog OHNE dritte "Speichern"-Option, fuer Faelle wie
// "Meine Daten löschen", wo es nur ein echtes Ja/Nein gibt.
export function ConfirmDialog({ title, message, confirmLabel = "Ja", cancelLabel = "Nein", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">{title}</p>
        <p className="mb-4 text-sm text-slate-600">{message}</p>
        <div className="flex gap-2">
          <AnimatedButton
            type="button"
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            <CircleXIcon size={16} />
            {cancelLabel}
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700"
          >
            <CheckIcon size={16} />
            {confirmLabel}
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
}
