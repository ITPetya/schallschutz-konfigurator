import { useEffect, useMemo } from "react";
import type { BufferGeometry } from "three";
import type { Opening } from "../types/openings";

// Modul-weiter, referenzgezaehlter Cache fuer CSG-berechnete Geometrien
// (Jonas' Vorgabe 2026-08-18: "Lags ohne Detailverlust fixen"). Mehrere
// Container-Instanzen (Baugruppen-Ansicht) oder wiederholt aufgerufene
// Bauteile (Eckbeschlaege - siehe CornerCasting.tsx) mit IDENTISCHER
// Eingabe erzeugen exakt dieselbe CSG-Ausschnittgeometrie - ohne diesen
// Cache wuerde jede Instanz sie unabhaengig neu berechnen, weil jedes
// React-useMemo an SEINE EIGENE Komponenteninstanz gebunden ist, nicht
// ueber Geschwister-Instanzen hinweg geteilt wird. Ref-Counting statt eines
// simplen permanenten Caches, weil z. B. Wandgeometrien (anders als die nur
// 8 fixen Eckbeschlag-Formen) unbegrenzt viele verschiedene Schluessel haben
// koennen (jede Container-Groesse/Durchbruch-Kombination) - ungenutzte
// Eintraege muessen wieder freigegeben werden, sonst waechst der Speicher
// unbegrenzt waehrend einer laengeren Bearbeitungssitzung.
interface CacheEntry {
  geometry: BufferGeometry;
  refCount: number;
}

const cache = new Map<string, CacheEntry>();

// Acquire passiert SYNCHRON im useMemo (greift/erzeugt + zaehlt sofort hoch,
// noetig damit der Rueckgabewert schon im selben Render korrekt ist),
// Release im useEffect-Cleanup (feuert sowohl bei Schluesselwechsel als auch
// beim Unmount). Reihenfolge bei einem Schluesselwechsel: das NEUE useMemo
// laeuft zuerst (haelt den neuen Eintrag schon), danach erst das ALTE
// Cleanup (baut den alten Eintrag ab) - dadurch wird eine Geometrie NIE
// disposed, waehrend sie noch (auch nur kurzzeitig) in Benutzung ist.
export function useCachedGeometry<T extends BufferGeometry>(key: string, factory: () => T): T {
  const geometry = useMemo(() => {
    let entry = cache.get(key);
    if (!entry) {
      entry = { geometry: factory(), refCount: 0 };
      cache.set(key, entry);
    }
    entry.refCount += 1;
    return entry.geometry as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    return () => {
      const entry = cache.get(key);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        cache.delete(key);
        entry.geometry.dispose();
      }
    };
  }, [key]);

  return geometry;
}

// Stabiler Cache-Schluessel-Teil fuer eine Durchbruch-Liste - OHNE die `id`
// (rein zur Identifikation eines platzierten Durchbruchs, hat keinerlei
// Einfluss auf seine tatsaechliche Form/Position) - zwei visuell identische
// Konfigurationen sollen auch dann denselben Cache-Treffer landen, wenn ihre
// Durchbrueche zufaellig unterschiedliche IDs tragen (z. B. bei zukuenftigen
// "Container duplizieren"-Funktionen, die IDs neu vergeben koennten).
export function openingsCacheKey(openings: Opening[]): string {
  return JSON.stringify(openings.map(({ id: _id, ...rest }) => rest));
}
