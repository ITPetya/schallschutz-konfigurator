import { useState } from "react";
import { AnimatedButton } from "./AnimatedButton";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";

export interface GrundeinstellungenResult {
  name: string;
  standort?: string;
}

interface GrundeinstellungenOverlayProps {
  onSubmit: (result: GrundeinstellungenResult) => void;
}

// Overlay beim ERSTEN Einstieg in ein neues Projekt (Jonas' Vorgabe
// 2026-07-25: "soll ein Overlay-Fenster aufpoppen, welches ein paar
// Grundeinstellungen abfragt") - fragt Bezeichnung und optional einen
// Standort ab; Größe/Farbe gehören inzwischen zu den einzelnen Containern
// innerhalb des Projekts und werden dort beim Anlegen/Bearbeiten festgelegt.
// Erscheint NICHT, wenn schon ein sinnvolles (nicht-leeres) Projekt im Cache
// liegt, siehe WorkspacePage.tsx für die genaue Bedingung.
export function GrundeinstellungenOverlay({ onSubmit }: GrundeinstellungenOverlayProps) {
  const [name, setName] = useState("Neues Projekt");
  const [standort, setStandort] = useState("");

  function handleSubmit() {
    onSubmit({ name, standort: standort.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">Grundeinstellungen</p>
        <p className="mb-4 text-sm text-slate-600">Wie soll dein Projekt heißen?</p>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Bezeichnung</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Standort (optional)</span>
          <input
            value={standort}
            onChange={(e) => setStandort(e.target.value)}
            placeholder="z. B. Musterstadt"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>

        <AnimatedButton
          type="button"
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Weiter
          <ArrowRightIcon size={16} />
        </AnimatedButton>
      </div>
    </div>
  );
}
