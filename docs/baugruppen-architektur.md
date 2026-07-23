# Baugruppen (Mehrcontainer-Projekte) – Architekturentwurf

Stand: 2026-07-23 (Nacht-Session). Status: **Entwurf, nicht implementiert.**

## Warum ein Entwurf statt fertigem Code

Der Wunsch ("Projekte mit mehreren Containern zusammenstellen, Baugruppen-Funktion,
Kollisionsvermeidung") ist ein neues Feature mit eigenem Datenmodell und einer
neuen Szene-Ebene über dem bestehenden Einzelcontainer-Konfigurator – realistisch
mehrere Tage Arbeit, kein Feature, das man "nebenbei" in derselben Nacht neben
Bugfixes und einer Performance-Runde sauber fertigstellt. Blind draufloscoden
hätte ein hohes Risiko gehabt, am Ende weder das eine noch das andere fertig zu
haben. Dieser Entwurf legt die Entscheidungen fest, die schwer rückgängig zu
machen sind (Datenmodell, Dateiformat, Kollisionslogik), damit die eigentliche
Implementierung darauf aufbauen kann, statt sie unterwegs neu zu erfinden.

## Kernidee

Ein **Projekt** ("Baugruppe") ist eine Menge platzierter Container-Instanzen in
einem gemeinsamen Bodenplan. Jede Instanz referenziert eine vollständige
`ContainerConfig` (das bestehende Format aus `config/types.ts` – Größe, Wände,
Durchbrüche, Farben, alles) plus eine Position/Rotation in der Projekt-Ebene.
Die Detailplanung eines einzelnen Containers bleibt **exakt der bestehende
Konfigurator** – keine Parallel-Implementierung, sondern Wiederverwendung.

```ts
// src/config/projectTypes.ts (neu)
export interface ContainerInstance {
  id: string;
  label: string;              // "Büro", "Lager 1", frei vergeben
  config: ContainerConfig;    // 1:1 das bestehende Format
  position: { x: number; z: number }; // Bodenebene, Meter, Projekt-Ursprung
  rotationY: number;          // Grad, nur Rotation um die Hochachse (0/90/180/270 + frei)
}

export interface ProjectConfig {
  formatVersion: 1;
  name: string;
  instances: ContainerInstance[];
}
```

`formatVersion` von Anfang an, damit spätere Änderungen (z. B. Verbindungswege,
Rampen) nicht wieder die stillschweigende "optionales Feld, alte Dateien haben
es nicht"-Krücke brauchen, die `ContainerConfig` inzwischen mehrfach hat.

## Dateiformat

Neue Endung `.sszprojekt`, gleiche Bauweise wie `configFileCodec.ts` (AES-GCM,
gleicher Ehrlichkeitshinweis zur Verschlüsselung – reiner Editier-Schutz, keine
echte Vertraulichkeit, weil es keinen Server gibt). Eine `ProjectConfig` ist
vollständig eigenständig: alle enthaltenen Container-Konfigurationen sind
eingebettet, keine externen Referenzen auf einzelne `.sszkonfig`-Dateien. Das
hält "eine Datei = ein Projekt, überall geöffnet, keine fehlenden Abhängigkeiten"
– passend zum bestehenden "keine Datenbank, keine Server"-Prinzip.

Import-Weg für Bestandskonfigurationen: ein "Container aus Datei hinzufügen"-
Knopf im Projekt-Editor liest eine bestehende `.sszkonfig` per
`decodeConfig()` (unverändert wiederverwendet) und legt sie als neue
`ContainerInstance` mit einer Default-Position ab.

## UI/UX

Neue Route `/projekt` (Analog-Struktur zu `/konfigurator`, eigener lazy-Chunk
genau wie jetzt schon für `KonfiguratorPage` eingerichtet – siehe
`App.tsx`/Performance-Commit dieser Nacht):

- **Ebenen-Ansicht** (von oben, orthografisch): jede platzierte Instanz als
  Rechteck (Grundriss `size.length × size.width`), frei per Drag verschiebbar
  und in 90°-Schritten drehbar (Snap optional an, Freihand per Modifier-Taste).
  Deutlich einfacher zu bedienen als freies Ziehen in der vollen 3D-Perspektive
  und ausreichend, weil Container nur auf einer gemeinsamen Bodenebene stehen –
  keine Höhen-Interaktion nötig.
- **3D-Vorschau** daneben oder umschaltbar: alle Instanzen als einfache Boxen
  (nicht die volle Durchbruch-Geometrie – Performance, siehe unten), zur
  räumlichen Kontrolle.
- Klick auf eine Instanz in der Ebenen-Ansicht → öffnet den **bestehenden**
  Konfigurator (heutige `KonfiguratorPage`) in einem Modal/Panel für genau
  diese Instanz, Änderungen schreiben zurück in `instance.config`. Kein
  zweiter Konfigurator, eine Wiederverwendung.
- Speichern/Laden analog zum bestehenden "Speichern"/"Anfragen"-Muster, nur mit
  `.sszprojekt` statt `.sszkonfig`.

## Kollisionsvermeidung

Bewusst **kein** allgemeiner 3D-Physik-/Kollisionslöser – overkill für
achsparallele Quader auf einer gemeinsamen Ebene. Stattdessen:

1. Jede Instanz hat einen Grundriss (Rechteck `length × width`, um
   `rotationY` gedreht).
2. Bei jeder Bewegung: **Separating Axis Theorem (SAT)** für 2D-Rechtecke
   (auch bei freier Rotation exakt und billig – kein Bounding-Circle-
   Näherungsfehler) gegen alle anderen Instanzen.
3. Zusätzlich ein konfigurierbarer **Mindestabstand** (z. B. 500mm) statt
   reiner Kante-an-Kante-Berührung – reale Container brauchen Zugangsraum,
   nicht nur "berühren sich nicht".
4. Visuelles Feedback: Instanz während des Ziehens rot einfärben bei
   Kollision, Drop wird verhindert (zurück zur letzten gültigen Position) statt
   überlappende Zustände überhaupt zuzulassen – einfacher zu verstehen als ein
   nachträglicher Fehlerhinweis.

SAT-Rechtecktest ist O(n) pro Bewegung gegen alle anderen Instanzen – für
die realistische Größenordnung (Baugruppen aus vermutlich <20 Containern)
ohne jede Optimierung schnell genug; ein räumlicher Index lohnt sich hier nicht.

## Performance-Überlegung (Verbindung zur heutigen Perf-Runde)

Die volle CSG-Geometrie (Durchbrüche, `three-bvh-csg`) für *jeden* Container
in der Projekt-Übersicht gleichzeitig zu berechnen wäre teuer und meistens
unnötig, solange man nur die Anordnung plant. Empfehlung: in der
Projekt-Ansicht standardmäßig nur einfache Boxen rendern (Maße aus
`config.size`, keine Durchbruch-Geometrie), volle Geometrie erst für die
Instanz laden, die gerade im Detail-Modal bearbeitet wird. Genau das Muster,
das die heutige `React.lazy()`-Aufteilung schon vorbereitet (schwere 3D-Chunks
nur laden, wenn wirklich gebraucht).

## Einbettung (`?embed=1`)

Die Projekt-Ansicht sollte denselben Embed-Modus respektieren (Header
ausblenden), ohne Sonderfall – `AppShell.tsx` prüft den Query-Parameter schon
routenunabhängig.

## Geschätzter Aufwand (grobe Einordnung, kein Commitment)

- Datenmodell + Dateiformat + Codec: klein, sehr ähnlich zu Bestehendem.
- Ebenen-Ansicht mit Drag/Rotate + SAT-Kollision: der eigentliche Kern,
  mittlerer Aufwand (neue Interaktionslogik, keine Wiederverwendung möglich).
- Integration des bestehenden Konfigurators als Detail-Modal: klein bis
  mittel, abhängig davon, wie viel `KonfiguratorPage` intern an globalem
  State (Kontext-Provider) statt Props hängt – das ist der Teil, der beim
  eigentlichen Implementieren zuerst geprüft werden sollte.
- Persistenz/Speichern/Laden: klein.

Realistische Grössenordnung: mehrere Arbeitstage für eine solide erste
Version, nicht Stunden.
