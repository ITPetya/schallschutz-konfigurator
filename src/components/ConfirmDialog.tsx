import { AlertDialogShell } from "./AlertDialogShell";
import { AnimatedButton } from "./AnimatedButton";
import { CircleXIcon } from "./icons/CircleXIcon";
import { CheckIcon } from "./icons/CheckIcon";

interface ConfirmDialogProps {
  open: boolean;
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
// "Meine Daten löschen", wo es nur ein echtes Ja/Nein gibt. Baut auf
// AlertDialogShell.tsx auf (animate-ui.com-Basis).
export function ConfirmDialog({ open, title, message, confirmLabel = "Ja", cancelLabel = "Nein", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialogShell open={open} onOpenChange={(v) => !v && onCancel()} title={title} message={message}>
      <div className="flex gap-2">
        <AnimatedButton
          type="button"
          onClick={onCancel}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
    </AlertDialogShell>
  );
}
