import { isStorageAllowed } from "../config/storageConsent";
import { safeGetItem, safeRemoveItem, safeSetItem } from "../utils/safeLocalStorage";

// Merkt sich pro Browser (localStorage, gleiche Einschraenkung wie der
// restliche Mock-Layer), welche Tutorials schon automatisch gezeigt wurden -
// Jonas' Vorgabe 2026-07-22: automatisch nur beim ersten Mal, danach nur noch
// manuell ueber den "?"-Button abrufbar.
// Exportiert (statt modulintern), damit "Meine Daten löschen"
// (projectHistoryStore.ts) diesen Key mit entfernen kann.
export const SEEN_KEY = "ssk_tours_seen";

function loadSeen(): string[] {
  const raw = safeGetItem(SEEN_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function hasSeenTour(id: string): boolean {
  return loadSeen().includes(id);
}

export function markTourSeen(id: string) {
  // Nur bei erteilter Speicher-Einwilligung schreiben (siehe
  // ThemeContext.tsx fuer dieselbe Begruendung).
  if (!isStorageAllowed()) return;
  const seen = loadSeen();
  if (!seen.includes(id)) {
    seen.push(id);
    safeSetItem(SEEN_KEY, JSON.stringify(seen));
  }
}

// Jonas' Vorgabe 2026-08-12: "das Tutorial soll jederzeit wieder aufrufbar
// sein, und dann an der Stelle weitermachen, wo man gerade ist" - bisher
// setzte ein erneuter Aufruf ueber das "?"-Menue (AppShell.tsx: start()) IMMER
// auf Schritt 0 zurueck, auch wenn vorher schon Schritt 7 erreicht war.
// Haelt NUR den zuletzt erreichten Schritt fest (nicht IST die Tour gerade
// sichtbar) - TourContext.tsx entscheidet weiterhin selbst, WANN sie
// angezeigt wird, dieser Store speichert nur WO wieder eingestiegen wird.
// Wird bei echtem Abschluss (letzter Schritt, "Fertig") explizit geleert
// (siehe TourContext.tsx's next()) - ein bereits fertig durchlaufenes
// Tutorial soll beim naechsten manuellen Aufruf wieder von vorne beginnen,
// es gibt dann ja nichts mehr "fortzusetzen".
export const TOUR_PROGRESS_KEY = "ssk_tour_progress";

export interface TourProgress {
  tourId: string;
  stepIndex: number;
}

export function loadTourProgress(): TourProgress | null {
  const raw = safeGetItem(TOUR_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TourProgress>;
    if (typeof parsed.tourId === "string" && typeof parsed.stepIndex === "number") {
      return { tourId: parsed.tourId, stepIndex: parsed.stepIndex };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveTourProgress(progress: TourProgress) {
  if (!isStorageAllowed()) return;
  safeSetItem(TOUR_PROGRESS_KEY, JSON.stringify(progress));
}

export function clearTourProgress() {
  safeRemoveItem(TOUR_PROGRESS_KEY);
}
