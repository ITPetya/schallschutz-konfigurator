// Haelt fest, ob die aktuelle Einbettung eine White-Label-Kundenseite ist
// oder LC Systems' eigene Shell (hayse.de) - gesetzt einmalig beim Start
// durch applyEmbedStandardConfig() (embedStandardConfig.ts), aus demselben
// postMessage-Handshake wie die Geschaeftswerte-Konfiguration.
//
// Grund fuer diese eigene, winzige Datei statt einfach ein Feld in
// lcStandard.ts: das ist keine Geschaeftswert-Ueberschreibung, sondern
// Metadaten UEBER die Einbettung selbst - wird u.a. genutzt, um den
// "Interner Bereich"-Menuepunkt im "?"-Menue (AppShell.tsx) auszublenden,
// wenn die App gerade auf der Website eines Kunden laeuft. Ohne das wuerde
// ein Kunden-Besucher einen Link zu LC Systems' eigenem, nicht-oeffentlichem
// Mitarbeiterbereich im Hilfemenue sehen (2026-08-25 bewusst verhindert,
// bevor es passieren konnte).

let isWhiteLabelCustomer = false;

export function setIsWhiteLabelCustomer(value: boolean): void {
  isWhiteLabelCustomer = value;
}

export function getIsWhiteLabelCustomer(): boolean {
  return isWhiteLabelCustomer;
}
