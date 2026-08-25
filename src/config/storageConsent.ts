// Einwilligung fuer die technisch nicht zwingend notwendige, aber trotzdem
// rein lokale Zwischenspeicherung des Projekt-Entwurfs (siehe
// projectDraftStore.ts). Per TTDSG/DSGVO waere diese Speicherung als "unbedingt
// erforderlich" vermutlich ohnehin einwilligungsfrei zulaessig (sie dient
// ausschliesslich der Wiederherstellung der eigenen, gerade bearbeiteten
// Konfiguration und verlaesst nie den Browser) - Jonas moechte den Nutzern
// trotzdem eine bewusste Wahl geben: "Ja" ist vorausgewaehlt/Standard, ein
// klares "Nein" verhindert aber jede weitere Speicherung.
import { safeGetItem, safeSetItem } from "../utils/safeLocalStorage";

const CONSENT_KEY = "ssk_storage_consent";

export type StorageConsent = "granted" | "denied";

export function getStorageConsent(): StorageConsent | null {
  const raw = safeGetItem(CONSENT_KEY);
  return raw === "granted" || raw === "denied" ? raw : null;
}

export function setStorageConsent(consent: StorageConsent) {
  safeSetItem(CONSENT_KEY, consent);
}

// Bis zur ersten bewussten Entscheidung ("Ja"/"Nein" im Banner) gilt die
// Speicherung als erlaubt, entsprechend der vorausgewaehlten "Ja"-Option -
// erst ein aktives "Nein" schaltet sie ab.
export function isStorageAllowed(): boolean {
  return getStorageConsent() !== "denied";
}
