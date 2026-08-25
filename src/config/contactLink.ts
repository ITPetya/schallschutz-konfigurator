// `let` statt `const`, damit eine Kunden-Shell diesen Wert per postMessage-
// Handshake ueberschreiben kann (applyEmbedStandardConfig in
// embedStandardConfig.ts) - siehe dort fuer die volle Begruendung.
export let CONTACT_URL = "https://lc.systems/kontakt/";

export function setContactUrl(url: string): void {
  CONTACT_URL = url;
}
