// localStorage.getItem/setItem/removeItem koennen eine ECHTE Exception
// werfen, nicht nur fehlschlagen - z.B. blockiert Safaris ITP (Intelligent
// Tracking Prevention) den Storage-Zugriff fuer Cross-Origin-iframes
// komplett, und schon der Zugriff auf den Getter wirft dann. Bisher war app-
// weit nur der SCHREIBZUGRIFF try/catch-geschuetzt (siehe z.B.
// projectHistoryStore.ts), die Lesezugriffe nicht - folgenlos, solange die
// App immer als First-Party-Seite lief. Seit 2026-08-25 kann dieselbe App
// aber in einer fremden Website eingebettet laufen (siehe embedGate.ts/
// embed-shell/index.html) - dort waere ein ungeschuetzter Lesezugriff (z.B.
// storageConsent.ts's getStorageConsent(), das app-weit als erstes bei jedem
// Render aufgerufen wird) ein Absturz beim allerersten Laden gewesen, nicht
// nur ein Fallback auf Standardwerte. Zentrale Stelle statt an 10+ Stellen
// einzeln try/catch nachzuruesten.

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Speicher voll/deaktiviert/blockiert - lautlos ignorieren, wie bisher.
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // s.o.
  }
}
