import { useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { clearProjectDraft } from "../config/projectHistoryStore";
import { getStorageConsent, setStorageConsent } from "../config/storageConsent";
import { CircleXIcon } from "./icons/CircleXIcon";
import { CheckIcon } from "./icons/CheckIcon";

// Einwilligungs-Banner fuer die lokale Zwischenspeicherung (siehe
// storageConsent.ts fuer die rechtliche Einordnung) - erscheint einmalig,
// bis der Nutzer sich bewusst entschieden hat. "Ja" ist die vorausgewaehlte,
// hervorgehobene Option; "Nein" loescht einen eventuell schon vorhandenen
// Zwischenstand sofort und verhindert jede weitere Speicherung.
export function StorageConsentBanner() {
  const [decided, setDecided] = useState(() => getStorageConsent() !== null);
  if (decided) return null;

  function handleAccept() {
    setStorageConsent("granted");
    setDecided(true);
  }

  function handleDecline() {
    setStorageConsent("denied");
    clearProjectDraft();
    setDecided(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dein Projekt wird automatisch nur in deinem Browser zwischengespeichert, damit bei einem
          Absturz oder Neuladen nichts verloren geht – diese Daten verlassen deinen Browser nicht.
          Möchtest du das erlauben?
        </p>
        <div className="flex shrink-0 gap-2">
          <AnimatedButton
            type="button"
            onClick={handleDecline}
            className="flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <CircleXIcon size={16} />
            Nein
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={handleAccept}
            className="flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            <CheckIcon size={16} />
            Ja, erlauben
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
}
