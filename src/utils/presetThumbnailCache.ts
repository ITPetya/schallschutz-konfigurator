// Jonas' Vorgabe 2026-08-18 ("Presets pre-loaden, damit die Karussell-
// Animation geschmeidig ist"): modul-weiter Cache fuer bereits erzeugte
// Preset-Vorschau-Snapshots (siehe StartPresetThumbnail.tsx) - ohne diesen
// Cache musste JEDES Mal, wenn eine Karte neu ins sichtbare Karussell-
// Fenster ruckt, ein komplett neuer CSG-Aufbau + Snapshot-Einfang laufen,
// selbst wenn dieselbe Karte vorher schon einmal sichtbar war. Schluessel
// ist `${presetId}:${outsideColor}` (siehe StartPresetCard.tsx) - derselbe
// Preset in einer ANDEREN Farbe braucht weiterhin einen eigenen Snapshot.
const cache = new Map<string, string>();

export function getCachedThumbnail(key: string): string | undefined {
  return cache.get(key);
}

export function setCachedThumbnail(key: string, dataUrl: string): void {
  cache.set(key, dataUrl);
}
