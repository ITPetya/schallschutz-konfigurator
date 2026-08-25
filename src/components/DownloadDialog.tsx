import { useState } from "react";
import { AlertDialogShell } from "./AlertDialogShell";
import { AnimatedButton } from "./AnimatedButton";
import { InfoBadge } from "./InfoBadge";
import { DownloadIcon } from "./icons/DownloadIcon";
import { LoadingIcon } from "./LoadingIcon";

export interface DownloadFormatOption {
  id: string;
  label: string;
  // Erklaerungstext im InfoBadge-Popover (Jonas' Vorgabe 2026-08-25: "ein
  // Infobutton für jedes Format, wo erklärt wird, wofür welches Format gut
  // ist").
  info: string;
  onDownload: () => void | Promise<void>;
}

interface DownloadDialogProps {
  open: boolean;
  onClose: () => void;
  formats: DownloadFormatOption[];
}

// Ersetzt die vorherigen getrennten "Speichern"/"Als GLB herunterladen"-
// Buttons durch EINEN "Herunterladen"-Button, der dieses Popup oeffnet
// (Jonas' Vorgabe 2026-08-25) - Format-Liste wird von aussen uebergeben
// (KonfiguratorPage.tsx/InternalProjectViewer.tsx entscheiden, welche
// Formate zum jeweiligen Typ passen: .sszkonfig nur bei Einzelcontainer,
// .sszprojekt nur bei Baugruppe, GLB/spaeter 3D-PDF/STEP bei beiden). Jede
// Zeile ein eigener Download-Button + graues Info-Badge daneben (NIE
// ineinander verschachtelt, siehe SonderBadge.tsx's wiederkehrende Falle),
// eigener Lade-/Fehlerzustand pro Zeile, damit ein langsamer GLB-Export
// nicht die Datei-Formate blockiert.
export function DownloadDialog({ open, onClose, formats }: DownloadDialogProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleDownload(format: DownloadFormatOption) {
    setLoadingId(format.id);
    setErrorId(null);
    try {
      await format.onDownload();
    } catch {
      setErrorId(format.id);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AlertDialogShell open={open} onOpenChange={(v) => !v && onClose()} title="Herunterladen" message="Format auswählen.">
      <div className="space-y-2">
        {formats.map((format) => (
          <div key={format.id}>
            <div className="flex items-center gap-2">
              <AnimatedButton
                type="button"
                onClick={() => handleDownload(format)}
                disabled={loadingId === format.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {loadingId === format.id ? <LoadingIcon active kind="saving" size={16} /> : <DownloadIcon size={16} />}
                {format.label}
              </AnimatedButton>
              <InfoBadge text={format.info} />
            </div>
            {errorId === format.id && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Export fehlgeschlagen.</p>}
          </div>
        ))}
        <AnimatedButton
          type="button"
          onClick={onClose}
          className="w-full rounded-full px-3 py-1.5 text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          Abbrechen
        </AnimatedButton>
      </div>
    </AlertDialogShell>
  );
}
