// Wo die "Interner Bereich"-Verknuepfung im "?"-Menue (layout/AppShell.tsx)
// hinfuehren soll - gesetzt einmalig beim Start durch
// applyEmbedStandardConfig() (embedStandardConfig.ts), aus demselben
// postMessage-Handshake wie die Geschaeftswerte-Konfiguration.
//
// 2026-08-25, zweite Version: die erste Version hatte die Ziel-URL fest im
// App-Code auf "https://hayse.de/intern" verdrahtet UND standardmaessig
// sichtbar geschaltet (nur per isWhiteLabelCustomer-Flag ausblendbar). Beides
// falsch, wie sich beim konkreten Durchdenken von Jonas' BL-Media-Plan zeigte:
// (1) sobald die Shell nicht auf hayse.de/ selbst, sondern z.B. unter
// hayse.de/konfigurator liegt, stimmt eine fest verdrahtete Ziel-URL nicht
// mehr - jede Shell muss ihre EIGENE, tatsaechlich passende Adresse mitgeben.
// (2) der Button soll NICHT standardmaessig sichtbar sein - eine oeffentliche
// Kundenseite (wie die geplante /konfigurator-Unterseite bei BL-Media) hat
// gar keinen Grund, ueberhaupt einen Verweis auf LC Systems' internen Bereich
// zu zeigen. Jetzt: Standard ist UNSICHTBAR (kein Wert gesetzt), eine Shell
// muss aktiv eine echte URL mitgeben, damit der Button ueberhaupt erscheint -
// siehe embed-shell/index.html (LC Systems' eigene Root-Shell, setzt den
// Wert) vs. die an BL-Media weitergegebene Konfigurator-Unterseite (setzt ihn
// NICHT, Button bleibt weg).

let internalAreaUrl: string | null = null;

export function setInternalAreaUrl(url: string): void {
  internalAreaUrl = url;
}

export function getInternalAreaUrl(): string | null {
  return internalAreaUrl;
}
