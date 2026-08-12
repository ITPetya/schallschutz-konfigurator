import type { Tour } from "./types";

// Nur noch EIN Tutorial (Jonas' Vorgabe 2026-07-23: kein Login/Rollen mehr,
// also gibt es auch keine rollenspezifischen "erste Anmeldung"-Touren mehr -
// nur noch der Konfigurator selbst braucht eine Einfuehrung). Zeigt auf echte
// UI-Elemente ueber data-tour-Attribute, siehe TourOverlay.tsx.
//
// Ueberarbeitung 2026-08-11 (Jonas: "das Tutorial ist stehen geblieben,
// viele neuere Features fehlen komplett, insgesamt soll es interaktiver
// werden"): kompletter Neuaufbau der Schrittliste, gegen den TATSAECHLICHEN
// heutigen Funktionsumfang geprueft (nicht gegen die aelteren, teils
// veralteten Architektur-/Handoff-Dokumente - siehe die widerspruechlichen
// Funde unten). Zwei Abschnitte in EINEM flachen Array (kein eigener
// Typ-/Datenstruktur-Split - TourContext.tsx/TourOverlay.tsx behandeln die
// Anwesenheit von waitForEvent bereits exakt als dieses Signal, ein
// zusaetzliches Feld/Interface haette nur denselben Zustand zweimal codiert):
//
// 1. KERNABLAUF (erste 9 Schritte, jeder mit waitForEvent) - erzwingt eine
//    ECHTE Aktion, bevor es weitergeht: Projekt anlegen -> Container
//    hinzufuegen -> Detail bearbeiten -> Groesse/Wand-/Bodenstaerke aendern ->
//    Schallschutzklasse wechseln -> Durchbruch hinzufuegen. "Weiter" bleibt
//    ueberall zusaetzlich als manueller Ausweg nutzbar (z. B. wenn schon ein
//    Projekt/Container existiert und der Schritt technisch schon erfuellt
//    waere).
// 2. FEATURE-TOUR (restliche Schritte) - leichtgewichtige Pointer-outs ohne
//    waitForEvent fuer Werkzeuge, die entweder keinen sinnvollen einzelnen
//    "Ereignis"-Moment haben (z. B. Kamera drehen, ein Panel oeffnen) oder
//    deren Verdrahtung mit notifyEvent() unverhaeltnismaessig viele weitere
//    Dateien angefasst haette (Scene.tsx/ProjectScene3D.tsx muessten dafuer
//    selbst useTour() importieren, bisher bewusst nur auf Seiten-Ebene
//    verdrahtet, siehe WorkspacePage.tsx/StartPage.tsx) - Messen, Schnitt,
//    Ansicht, ViewCube/Kamera, Rueckgaengig/Wiederholen, Speichern,
//    Baugruppen-Liste, Ausrichten, Anfrage-Vorschau, "?"-Menue. Die drei
//    Viewer-Werkzeuge (Messen/Schnitt/Ansicht/ViewCube/Undo-Redo) werden
//    absichtlich EINMAL erklaert, nicht zweimal fuer Einzelcontainer- und
//    Baugruppen-Ansicht getrennt: ViewerToolbar.tsx ist dieselbe Komponente
//    in Scene.tsx UND ProjectScene3D.tsx, die data-tour-Anker sind dadurch
//    in beiden Ansichten identisch vorhanden.
//
// Waehrend der Ueberarbeitung im echten Code (nicht nur in den Docs)
// gegengepruefte Widersprueche zu den bestehenden Architektur-/Handoff-
// Dokumenten (docs/baugruppen-architektur.md, docs/session-handoff-2026-07-25.md):
// - KEIN Einzel-/Ensemble-"Modus" mehr, der irgendwo umschaltbar waere -
//   siehe StartPage.tsx's eigener Kommentar: "Seit dem Zusammenlegen von
//   Einzel-/Ensemble-Modus gibt es nur noch EINEN Einstieg". "Einzel" ist
//   inzwischen einfach "eine Baugruppe mit genau einem Container" - die
//   Doku beschreibt faelschlich noch einen dauerhaften Umschalt-Button.
// - GrundeinstellungenOverlay.tsx fragt NUR NOCH Bezeichnung + Standort ab,
//   NICHT mehr Groesse/Farbe (die sitzen inzwischen ausschliesslich beim
//   einzelnen Container in "Grundeinstellungen" waehrend der
//   Detailbearbeitung) - die Doku beschreibt noch die aeltere Variante mit
//   Groessen-/Farb-Presets im Overlay selbst.
export const CONFIGURATOR_TOUR_ID = "configurator";

export const TOURS: Record<string, Tour> = {
  [CONFIGURATOR_TOUR_ID]: {
    id: CONFIGURATOR_TOUR_ID,
    steps: [
      // ---------- 1. Kernablauf (interaktiv, erwartet echte Aktionen) ----------
      {
        route: "/",
        selector: '[data-tour="start-configuration"]',
        title: "Projekt starten",
        body: "Klicke auf „Konfiguration starten“, um ein neues Projekt zu beginnen.",
        placement: "bottom",
        waitForEvent: "project-started",
      },
      {
        selector: '[data-tour="grundeinstellungen-submit"]',
        title: "Projekt benennen",
        body: "Vergib eine Bezeichnung (und optional einen Standort) für dein Projekt und klicke auf „Weiter“. Größe und Farbe legst du gleich pro Container fest, nicht hier.",
        placement: "top",
        waitForEvent: "project-created",
      },
      {
        selector: '[data-tour="add-container"]',
        title: "Container hinzufügen",
        body: "Über dieses Plus fügst du einen neuen Container zu deinem Projekt hinzu – daneben kannst du auch eine bereits gespeicherte Container-Datei laden. Ein Projekt kann beliebig viele Container enthalten (das ist die Baugruppe); auch mit nur einem einzigen funktioniert alles genauso. Probier es gleich aus.",
        placement: "bottom",
        waitForEvent: "container-added",
      },
      {
        selector: '[data-tour="edit-instance"]',
        title: "Container bearbeiten",
        body: "Klicke auf „Detail bearbeiten“, um diesen Container im Detail zu konfigurieren. Tipp: Ein Doppelklick auf den Container – hier in der Liste oder direkt im 3D-Viewer – öffnet ihn genauso direkt.",
        placement: "bottom",
        waitForEvent: "instance-editing-opened",
      },
      {
        selector: '[data-tour="tour-grundeinstellungen"]',
        title: "Größe, Wand- & Bodenstärke",
        body: "Hier legst du Länge, Breite, Höhe, Wandstärke und Bodenstärke fest – alles in Millimetern. Die „Vorlage…“-Auswahl füllt Standardmaße vor. Weichst du davon ab, zeigt ein Ausrufezeichen einen Sonderausstattungs-Hinweis. Ändere probeweise einen der Werte.",
        placement: "bottom",
        waitForEvent: "size-changed",
      },
      {
        selector: '[data-tour="tour-soundclass"]',
        title: "Schallschutzklasse & Bodenisolierung",
        body: "Standard, Schallschutz, Silent oder Silent-Plus – je höher die Klasse, desto mehr Dämmwirkung. Ab Silent ist eine Mindest-Wandstärke technisch nötig; wechselst du hierhin, werden Wand- und ggf. Bodenstärke automatisch passend angehoben (danach bleibst du trotzdem frei, beides manuell zu ändern). Die Bodenisolierung (hohl oder gefüllt) kannst du unabhängig davon jederzeit selbst umschalten. Wähle probeweise eine andere Klasse.",
        placement: "bottom",
        waitForEvent: "soundclass-changed",
      },
      {
        selector: '[data-tour="tour-darstellung"]',
        title: "Erweiterte Einstellungen",
        body: "Hier legst du die RAL-Farben innen/außen fest (Standardfarben oder die volle RAL-Classic-Palette als Sonderfarbe) oder wählst „Innen unlackiert“ statt einer Farbe – dazu zwei freie Notizfelder für Sonderwünsche außen/innen.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="tour-einbauten"]',
        title: "Einbauten",
        body: "Hier siehst du alle platzierten Durchbrüche – Türen, Wetterschutzgitter, Kabel- und Rohrdurchführungen. Ein Klick auf einen Eintrag klappt ihn auf, ein Doppelklick tut dasselbe direkt. Aufgeklappt sind Position und Maße frei editierbar; die „Standardmaße…“-Auswahl füllt bekannte Maße nur zur schnellen Vorlage vor.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="add-opening"]',
        title: "Durchbruch hinzufügen",
        body: "Über dieses Plus öffnest du ein Formular, um Wand, Typ und Position eines neuen Durchbruchs festzulegen. Füge probeweise eine Tür hinzu – Maße kannst du direkt danach in der „Einbauten“-Liste frei anpassen.",
        placement: "bottom",
        waitForEvent: "opening-added",
      },

      // ---------- 2. Feature-Tour (Pointer-outs, "Weiter" führt weiter) ----------
      {
        selector: '[data-tour="tool-measure"]',
        title: "Messen",
        body: "Wie in einem CAD-Programm: Klicke zwei Messpunkte (Ecken, Durchbruch-Mitten/-Ränder) nacheinander an, um ihren Abstand zu sehen – im Panel wechselst du zwischen „Direkt“ (reine Distanz) und „XYZ“ (achsenparallele Bemaßungslinien) und stellst Haupt-/Sekundäreinheit ein. Auch Innenmaße sind messbar: Innenpunkte tauchen automatisch auf, sobald du sie durch eine Schnittansicht oder einen echten Durchbruch tatsächlich einsehen kannst – genau wie bei einer intakten Wand bleibt ein verdeckter Punkt sonst unsichtbar.",
        placement: "top",
      },
      {
        selector: '[data-tour="section-view"]',
        title: "Schnitt",
        body: "Mit diesem Werkzeug schneidest du den Container entlang einer Achse (V/H, R/L oder O/U) auf, um ins Innere zu sehen – „Richtung wechseln“ dreht um, welche Hälfte sichtbar bleibt.",
        placement: "top",
      },
      {
        selector: '[data-tour="view-style-panel"]',
        title: "Ansicht",
        body: "Hier wechselst du zwischen „Realistisch“ und „Schattiert mit Kanten“, zwischen Studio- und Gelände-Hintergrund (mit vier Detailstufen) und kannst Schatten ein-/ausschalten.",
        placement: "top",
      },
      // Die folgenden Schritte erklaeren die Bedienung des 3D-Viewers selbst
      // (Jonas' Vorgabe 2026-07-25: "alles wie man den Viewer bedient, also
      // auch der ViewCube, Schnitte, Ansichte, vor und zurück, die Steuerung
      // etc. alles soll im Tutorial angezeigt werden").
      {
        // Home-Button sitzt direkt neben diesem Anker (Jonas' Vorgabe
        // 2026-07-25: "der Home Button sollte wie bei Inventor ausgeführt
        // sein und auch da beim Viewcube") - deshalb hier mit erklaert,
        // obwohl der Anker selbst nur den ViewCube markiert.
        selector: '[data-tour="viewcube-anchor"]',
        title: "Ansicht drehen & zurücksetzen",
        body: "Mit der linken Maustaste drehst du die Ansicht, mit der mittleren Maustaste (oder zwei Fingern am Handy/Tablet) verschiebst du sie, und mit dem Mausrad (oder zwei Fingern zum Zoomen) vergrößerst/verkleinerst du. Der Würfel springt zu einer Standardansicht (z. B. „Oben“), sobald du auf eine Seite klickst – der Haus-Knopf daneben setzt die Kamera auf die Ausgangsansicht zurück.",
        placement: "top",
      },
      {
        // Oben rechts im Viewer (Jonas' Vorgabe 2026-07-25: "die vor und
        // zurück Buttons sollten oben rechts im Viewer sein") - bewusst
        // getrennt vom Home-Button beim ViewCube, siehe ViewerToolbar.tsx.
        selector: '[data-tour="viewer-toolbar"]',
        title: "Rückgängig & Wiederholen",
        body: "Diese beiden Knöpfe machen Änderungen rückgängig (auch per Strg+Z) bzw. wiederholen sie (Strg+Y) – das funktioniert für den ganzen Container, nicht nur ein einzelnes Feld.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="save-project"]',
        title: "Speichern",
        body: "„Speichern“ lädt diesen einen Container als Datei herunter – die kannst du später wieder laden. „Zurücksetzen“ ganz unten verwirft alle Änderungen an diesem Container.",
        placement: "top",
      },
      {
        selector: '[data-tour="back-to-project"]',
        title: "Zurück zur Baugruppe",
        body: "Über diesen Button kommst du jederzeit zurück zur Projekt-Übersicht mit allen Containern – deine Änderungen sind dabei schon automatisch übernommen. Probier's gleich aus, im Anschluss zeigen wir dir die Übersicht.",
        placement: "bottom",
        waitForEvent: "back-to-baugruppe",
      },
      {
        selector: '[data-tour="tour-baugruppe-list"]',
        title: "Baugruppen-Übersicht",
        body: "Alle Container deines Projekts stehen hier aufgelistet – und gleichzeitig als 3D-Objekte im Viewer, die du dort per Ziehen frei verschieben und drehen kannst (ein Mindestabstand zwischen Containern wird automatisch eingehalten). Ein oranges oder rotes Ausrufezeichen an einem Eintrag zeigt Sonderausstattungen/Pflichthinweise an. Doppelklick auf einen Eintrag (oder direkt im Viewer) öffnet ihn ebenso wie „Detail bearbeiten“ – die Werkzeuge Messen/Schnitt/Ansicht/ViewCube/Rückgängig von eben funktionieren hier genauso.",
        placement: "bottom",
      },
      {
        // Jonas' Vorgabe 2026-08-12: "Ausrichten" ist jetzt ein Werkzeug im
        // Viewer (wie Messen/Schnitt/Ansicht), nicht mehr eine feste
        // Seitenleisten-Sektion mit Dropdowns - deshalb hierher verschoben
        // (der Anker sitzt jetzt am Werkzeug-Button in ViewerToolbar.tsx,
        // nicht mehr an der Seitenleisten-Sektion, die erst nach der ersten
        // erstellten Abhaengigkeit ueberhaupt erscheint) und placement "top"
        // wie die anderen Werkzeug-Buttons in derselben Saeule.
        selector: '[data-tour="tour-ausrichten"]',
        title: "Ausrichten",
        body: "Sobald du mindestens zwei Container hast: hier zwei Seitenflächen anklicken (wie beim Messen) – die erste bleibt stehen, die zweite wird „Passend“ (mit Abstand daneben) oder „Fluchtend“ (auf einer Linie) danach ausgerichtet. Das bleibt aktiv – bewegst du den ersten Container später, zieht der zweite automatisch mit. Links in der Seitenleiste erscheint dafür ein „Abhängigkeiten“-Tab, in dem du nur noch den Abstand nachjustieren kannst.",
        placement: "top",
      },
      {
        selector: '[data-tour="tour-project-request"]',
        title: "Speichern, Laden & Anfragen",
        body: "„Speichern“ lädt die komplette Baugruppe (alle Container) als eine Datei herunter, „Laden“ öffnet eine gespeicherte Datei wieder. „Anfragen“ zeigt zuerst eine Vorschau mit allen Sonderausstattungen/Pflichthinweisen deines Projekts – jede davon ist anklickbar und springt direkt zum verursachenden Feld – bevor die eigentliche E-Mail-Anfrage losgeschickt wird.",
        placement: "top",
      },
      {
        selector: '[data-tour="help-menu"]',
        title: "Das war's!",
        body: "Dieses Tutorial findest du jederzeit hier im „?“-Menü wieder – dort auch: „Hilfe“ (Kontakt), „Verlauf“ deiner zuletzt bearbeiteten Projekte, und „Meine Daten löschen“, falls du alle lokal zwischengespeicherten Daten entfernen willst. Viel Erfolg mit deinem Container!",
        placement: "bottom",
      },
    ],
  },
};
