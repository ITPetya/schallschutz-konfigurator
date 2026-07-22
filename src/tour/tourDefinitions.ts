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
        route: "/konfigurator",
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
      {
        selector: '[data-tour="save-project"]',
        title: "Speichern & Anfragen",
        body: "„Speichern“ lädt deine Konfiguration als Datei herunter – die kannst du später wieder laden. „Anfragen“ öffnet zusätzlich eine E-Mail, an die du die Datei anhängst.",
        placement: "top",
      },
    ],
  },
};
