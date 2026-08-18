import { createContext, useContext, useEffect, useMemo } from "react";
import type { BufferGeometry } from "three";
import type { Opening } from "../types/openings";

// Jonas' Fehlerbericht 2026-08-18 ("Container laden vollstaendig und dann
// verschwinden Bauteile wieder - Dach, Boden, vordere Wand usw."): staerkster
// Verdacht ist die Preset-Vorschau (StartPresetThumbnail.tsx) - die baut
// denselben <Container>/<Wall>/<CornerCasting> auf, faengt EINEN Snapshot
// ein und wird dann sofort wieder abgebaut (mounten-einfangen-unmounten in
// schneller Folge, seit den "weniger Lag"-Anpassungen sogar noch haeufiger).
// Weil dieser Cache MODUL-WEIT und damit APP-WEIT geteilt ist (v. a.
// CornerCasting.tsx's nur 8 feste Schluessel, die JEDER Container ueberall
// in der App benutzt), teilt sich eine kurzlebige Vorschau denselben
// Cache-Eintrag mit echten, dauerhaft sichtbaren Containern anderswo in der
// App. Obwohl das Ref-Counting fuer sich genommen korrekt aussieht (siehe
// useCachedGeometry unten), liess sich der genaue Ausloeser in dieser
// Umgebung nicht abschliessend nachstellen (kein funktionierendes WebGL) -
// statt weiter zu raten: dieser Scope-Context isoliert die Vorschau-Vorbauten
// komplett vom geteilten Cache, damit ihr schnelles Mounten/Unmounten NIE
// mehr mit echten, dauerhaften Containern interferieren kann, unabhaengig
// vom genauen Mechanismus. StartPresetThumbnail.tsx setzt ihn auf eine pro
// Mount eindeutige ID (useId()); ausserhalb einer Vorschau bleibt er null,
// das Verhalten fuer den echten Konfigurator ist dadurch unveraendert.
export const GeometryCacheScopeContext = createContext<string | null>(null);

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
  // Siehe GeometryCacheScopeContext-Kommentar oben - ausserhalb einer
  // Vorschau ist scope null, scopedKey === key (unveraendertes Verhalten).
  const scope = useContext(GeometryCacheScopeContext);
  const scopedKey = scope ? `${scope}:${key}` : key;

  const geometry = useMemo(() => {
    let entry = cache.get(scopedKey);
    if (!entry) {
      entry = { geometry: factory(), refCount: 0 };
      cache.set(scopedKey, entry);
    }
    entry.refCount += 1;
    return entry.geometry as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedKey]);

  useEffect(() => {
    return () => {
      const entry = cache.get(scopedKey);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        cache.delete(scopedKey);
        entry.geometry.dispose();
      }
    };
  }, [scopedKey]);

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
