import { DownloadIcon } from "./icons/DownloadIcon";
import { CircleXIcon } from "./icons/CircleXIcon";
import { CheckIcon } from "./icons/CheckIcon";

interface ThreeOptionConfirmDialogProps {
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
}

// Herausgezogen aus KonfiguratorPage.tsx' "Zurücksetzen"-Dialog (Jonas'
// Vorgabe 2026-07-24: statt window.confirm() ein richtiger Dialog mit drei
// Optionen). Wird jetzt auch fuer den Moduswechsel-Sicherheitshinweis
// wiederverwendet (Nacht-Session 2026-07-23) - gleiche drei Optionen, gleiche
// Faerbung/Bedeutung (Nein/Ja/Speichern-und-Ja), nur Texte unterscheiden sich.
export function ThreeOptionConfirmDialog({
  title,
  message,
  primaryLabel,
  onPrimary,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Nein",
}: ThreeOptionConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">{title}</p>
        <p className="mb-4 text-sm text-slate-600">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            <DownloadIcon size={16} />
            {primaryLabel}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              <CircleXIcon size={16} />
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700"
            >
              <CheckIcon size={16} />
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
