// `let` statt `const`, damit eine Kunden-Shell diesen Wert per postMessage-
// Handshake ueberschreiben kann (applyEmbedStandardConfig in
// embedStandardConfig.ts) - siehe dort fuer die volle Begruendung.
export let REQUEST_EMAIL = "info@lc.systems";

export function setRequestEmail(email: string): void {
  REQUEST_EMAIL = email;
}
