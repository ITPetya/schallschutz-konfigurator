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
        // Kein "route" mehr hier (Nacht-Session 2026-07-25): /konfigurator
        // und /projekt rendern seit dem Workspace-Merge dieselbe Seite ohne
        // echte Navigation dazwischen - ein erzwungenes navigate() wuerde
        // hier nur die URL-Leiste verstellen, ohne den tatsaechlichen Modus
        // zu aendern (siehe WorkspacePage.tsx), also weglassen statt falsch
        // benutzen. Der Auto-Start dieser Tour ist ohnehin auf den
        // Einzelcontainer-Modus beschraenkt (siehe dort).
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
      {
        selector: '[data-tour="save-project"]',
        title: "Speichern & Anfragen",
        body: "„Speichern“ lädt deine Konfiguration als Datei herunter – die kannst du später wieder laden. „Anfragen“ öffnet zusätzlich eine E-Mail, an die du die Datei anhängst.",
        placement: "top",
      },
    ],
  },
};
