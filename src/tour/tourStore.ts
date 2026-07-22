// Merkt sich pro Browser (localStorage, gleiche Einschraenkung wie der
// restliche Mock-Layer), welche Tutorials schon automatisch gezeigt wurden -
// Jonas' Vorgabe 2026-07-22: automatisch nur beim ersten Mal, danach nur noch
// manuell ueber den "?"-Button abrufbar.
const SEEN_KEY = "ssk_tours_seen";

function loadSeen(): string[] {
  const raw = localStorage.getItem(SEEN_KEY);
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
  const seen = loadSeen();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}
