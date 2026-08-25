// Wendet die per Kunden-Shell mitgelieferte Konfiguration an (2026-08-25).
// Hintergrund: Jonas will nicht auf die Website-Baukaesten seiner Kunden
// angewiesen sein, um am Quellcode etwas zu aendern - stattdessen soll jeder
// Kunde die fuer ihn relevanten Geschaeftswerte direkt in seiner eigenen
// embed-shell-Datei eintragen (siehe embed-shell/index.html im selben Repo),
// die App liest sie beim Start per postMessage aus. Kommt ueber denselben
// Handshake wie der Zugriffs-Schluessel (embedGate.ts) - ein Kunde ohne
// eigene Anpassungen laesst alle Felder weg und bekommt einfach die
// LC-Systems-Standardwerte.
//
// Bewusst NUR einmalig beim App-Start angewendet, keine laufende
// Reaktivitaet - passt zum Modell "Kunde traegt seine Werte einmal in die
// Shell ein", nicht "Werte aendern sich waehrend der Sitzung".

import { applyLcStandardOverrides, type LcStandardOverrides } from "../constants/lcStandard";
import { setRequestEmail } from "./requestEmail";
import { setContactUrl } from "./contactLink";
import { setInternalAreaUrl } from "./embedContext";

export interface EmbedStandardConfig extends LcStandardOverrides {
  requestEmail?: string;
  contactUrl?: string;
  // Ziel-URL fuer "Interner Bereich" im "?"-Menue (siehe embedContext.ts) -
  // NICHT gesetzt = Button bleibt unsichtbar (Standard, passend fuer
  // oeffentliche Kundenseiten). LC Systems' eigene Shells setzen hier ihre
  // jeweils tatsaechlich passende Adresse, z.B. "https://hayse.de/intern".
  internalAreaUrl?: string;
}

export function applyEmbedStandardConfig(config: unknown): void {
  if (!config || typeof config !== "object") return;
  const c = config as Partial<EmbedStandardConfig>;

  if (typeof c.requestEmail === "string" && c.requestEmail.trim() !== "") {
    setRequestEmail(c.requestEmail);
  }
  if (typeof c.contactUrl === "string" && c.contactUrl.trim() !== "") {
    setContactUrl(c.contactUrl);
  }
  if (typeof c.internalAreaUrl === "string" && c.internalAreaUrl.trim() !== "") {
    setInternalAreaUrl(c.internalAreaUrl);
  }
  applyLcStandardOverrides(c);
}
