import type { Tour } from "./types";

// Nur noch EIN Tutorial (Jonas' Vorgabe 2026-07-23: kein Login/Rollen mehr,
// also gibt es auch keine rollenspezifischen "erste Anmeldung"-Touren mehr -
// nur noch der Konfigurator selbst braucht eine Einfuehrung). Zeigt auf echte
// UI-Elemente ueber data-tour-Attribute, siehe TourOverlay.tsx.
export const CONFIGURATOR_TOUR_ID = "configurator";

export const TOURS: Record<string, Tour> = {
  [CONFIGURATOR_TOUR_ID]: {
    id: CONFIGURATOR_TOUR_ID,
    steps: [
      {
        selector: '[data-tour="tour-grundeinstellungen"]',
        title: "Grundeinstellungen",
        body: "Hier legst du Länge, Breite, Höhe und Wandstärke des Containers fest – alles in Millimetern.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="tour-darstellung"]',
        title: "Erweiterte Einstellungen",
        body: "Hier wählst du Studio oder Gelände als Hintergrund, legst die RAL-Farben innen/außen fest (oder „Innen unlackiert“ statt einer Farbe) und kannst zwei Notizfelder für Sonderheiten außen/innen einblenden.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="tour-einbauten"]',
        title: "Einbauten",
        body: "Hier siehst du alle platzierten Durchbrüche – Türen, Wetterschutzgitter, Kabel- und Rohrdurchführungen.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="add-opening"]',
        title: "Durchbruch hinzufügen",
        body: "Über dieses Plus öffnest du ein Formular, um Wand, Typ und Position eines neuen Durchbruchs festzulegen.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="section-view"]',
        title: "Schnitt",
        body: "Mit diesem Werkzeug schneidest du den Container entlang einer Achse auf, um ins Innere zu sehen.",
        placement: "top",
      },
      {
        selector: '[data-tour="view-style-panel"]',
        title: "Ansicht",
        body: "Hier wechselst du zwischen „Realistisch“ und „Schattiert mit Kanten“ und kannst Schatten ein-/ausschalten.",
        placement: "top",
      },
      // Die folgenden zwei Schritte erklaeren die Bedienung des 3D-Viewers
      // selbst (Jonas' Vorgabe 2026-07-25: "alles wie man den Viewer bedient,
      // also auch der ViewCube, Schnitte, Ansichte, vor und zurück, die
      // Steuerung etc. alles soll im Tutorial angezeigt werden").
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
        body: "Diese beiden Knöpfe machen Änderungen rückgängig (auch per Strg+Z) bzw. wiederholen sie (Strg+Y).",
        placement: "bottom",
      },
      {
        selector: '[data-tour="save-project"]',
        title: "Speichern",
        body: "„Speichern“ lädt diesen Container als Datei herunter – die kannst du später wieder laden.",
        placement: "top",
      },
    ],
  },
};
