import { useRef, useState } from "react";
import { decodeConfig } from "../config/configFileCodec";
import type { ContainerConfig } from "../config/types";
import { KonfiguratorPage } from "./KonfiguratorPage";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

// "Geheime" interne Seite fuer Mitarbeiter (Jonas' Vorgabe 2026-07-23) - NICHT
// in Menü/Navigation verlinkt, nur ueber die direkte URL (/intern) erreichbar.
// Der Zugangscode ist EIN CLIENT-SEITIGER Text-Vergleich, keine echte Auth
// (es gibt keinen Server) - das ist eine Abschreckung gegen zufaellige
// Besucher, kein Schutz gegen jemanden, der den JS-Code liest. Nach
// Freischaltung kann eine .sszkonfig-Datei geladen und in derselben
// schreibgeschuetzten Detailansicht wie frueher der Konstrukteur-Viewer
// betrachtet werden.
const ACCESS_CODE = "ssk-intern-2026";

export function InternalPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);

  const [config, setConfig] = useState<ContainerConfig | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUnlock() {
    if (codeInput === ACCESS_CODE) {
      setUnlocked(true);
      setAccessError(null);
    } else {
      setAccessError("Falscher Zugangscode.");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const decoded = await decodeConfig(file);
      setConfig(decoded);
      setFileName(file.name.replace(/\.sszkonfig$/i, ""));
      setLoadError(null);
    } catch {
      setLoadError("Datei konnte nicht gelesen werden – ist es eine gültige .sszkonfig-Datei?");
    }
  }

  if (!unlocked) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Interner Bereich</p>
          <p className="text-sm text-slate-500">Nur für Mitarbeiter.</p>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Zugangscode"
            className={inputClass}
          />
          {accessError && <p className="text-xs text-red-600">{accessError}</p>}
          <button
            type="button"
            onClick={handleUnlock}
            className="w-full rounded-full bg-brand px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            Bestätigen
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-500">Konfigurationsdatei (.sszkonfig) laden, um die Details anzusehen.</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-brand px-6 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Datei auswählen
        </button>
        <input ref={fileInputRef} type="file" accept=".sszkonfig" onChange={handleFileSelected} className="hidden" />
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      </div>
    );
  }

  return <KonfiguratorPage initialConfig={config} projectName={fileName ?? "Kundenkonfiguration"} />;
}
