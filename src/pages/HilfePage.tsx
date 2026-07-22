import { CONTACT_URL } from "../config/contactLink";

// Jonas' Vorgabe 2026-07-24: "?"-Menü -> "Hilfe" fuehrt hierher. Der
// eigentliche Kontakt-Link ist ein Platzhalter (siehe config/contactLink.ts),
// Jonas verlinkt die echte Seite spaeter.
export function HilfePage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="mb-3 font-heading text-xl font-bold uppercase tracking-wide text-brand-dark">Hilfe &amp; Kontakt</h1>
      <p className="mb-6 text-sm text-slate-500">
        Fragen zum Konfigurator oder zu einer Anfrage? Melde dich gerne bei uns.
      </p>
      <a
        href={CONTACT_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-full bg-brand px-6 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
      >
        Kontakt aufnehmen
      </a>
    </div>
  );
}
