import type { Role } from "../auth/types";
import type { Tour } from "./types";

// Vier Tutorials (Jonas' Vorgabe 2026-07-22): Konfigurator unangemeldet,
// sowie je einmal "erste Anmeldung" fuer Kunde/Konstrukteur/Admin. Zeigt auf
// echte UI-Elemente ueber data-tour-Attribute, siehe TourOverlay.tsx.
export const TOURS: Record<string, Tour> = {
  "configurator-guest": {
    id: "configurator-guest",
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
        title: "Darstellung",
        body: "Hier wechselst du zwischen „Realistisch“ und „Schattiert mit Kanten“, wählst Studio oder Gelände als Hintergrund und legst die RAL-Farben innen/außen fest.",
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
        title: "Schnittansicht",
        body: "Mit diesem Werkzeug schneidest du den Container entlang einer Achse auf, um ins Innere zu sehen.",
        placement: "top",
      },
      {
        selector: '[data-tour="save-project"]',
        title: "Projekt speichern",
        body: "Der Konfigurator funktioniert komplett ohne Anmeldung. Um eine Konfiguration zu speichern und anzufragen, ist ein kostenloses Konto nötig.",
        placement: "top",
      },
    ],
  },
  "kunde-first-login": {
    id: "kunde-first-login",
    steps: [
      {
        selector: '[data-tour="menu-button"]',
        title: "Menü",
        body: "Willkommen! Über dieses Menü erreichst du jederzeit den Konfigurator und deine gespeicherten Projekte.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-konfigurator"]',
        forceMenuOpen: true,
        title: "Konfigurator",
        body: "Hier baust du deine individuelle Containerkonfiguration.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-projekte"]',
        forceMenuOpen: true,
        title: "Gespeicherte Projekte",
        body: "Hier findest du alle Projekte, die du angefragt hast – inklusive Status und ob schon ein Konstrukteur zugewiesen ist.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="save-project"]',
        route: "/konfigurator",
        title: "Projekt anfragen",
        body: "Sobald deine Konfiguration passt, speicherst und beantragst du sie hier unter einem Namen.",
        placement: "top",
      },
    ],
  },
  "konstrukteur-first-login": {
    id: "konstrukteur-first-login",
    steps: [
      {
        selector: '[data-tour="menu-button"]',
        title: "Menü",
        body: "Willkommen! Über dieses Menü erreichst du deine zugeteilten Projekte.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-konstrukteur-projekte"]',
        forceMenuOpen: true,
        title: "Zugeteilte Projekte",
        body: "Hier siehst du alle Projekte, die dir vom Admin zugewiesen wurden.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="konstrukteur-projects-page"]',
        route: "/konstrukteur/projekte",
        title: "Projektübersicht",
        body: "Über „Ansehen“ öffnest du zu jedem zugeteilten Projekt eine schreibgeschützte Detailansicht mit allen Maßen und Durchbrüchen statt der Bearbeitungswerkzeuge.",
        placement: "bottom",
      },
    ],
  },
  "admin-first-login": {
    id: "admin-first-login",
    steps: [
      {
        selector: '[data-tour="menu-button"]',
        title: "Menü",
        body: "Willkommen! Über dieses Menü erreichst du die Admin-Bereiche.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-admin-projekte"]',
        forceMenuOpen: true,
        title: "Alle Projekte",
        body: "Hier siehst du alle von Kunden angefragten Projekte gesammelt und weist ihnen Konstrukteure zu.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-admin-mitarbeiter"]',
        forceMenuOpen: true,
        title: "Mitarbeiter",
        body: "Hier legst du Konstrukteure oder weitere Admins per E-Mail an oder änderst die Rolle bestehender Nutzer.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="menu-item-admin-standards"]',
        forceMenuOpen: true,
        title: "Standards",
        body: "Hier bearbeitest du die Standard-Containergrößen, -Türmaße und -RAL-Farben, die im Konfigurator als Vorschläge erscheinen.",
        placement: "bottom",
      },
    ],
  },
};

export function firstLoginTourIdForRole(role: Role): string {
  if (role === "admin") return "admin-first-login";
  if (role === "konstrukteur") return "konstrukteur-first-login";
  return "kunde-first-login";
}

// Fuer den manuellen "?"-Button: welche Tour passt gerade am besten.
export function helpTourIdFor(role: Role | undefined): string {
  if (!role) return "configurator-guest";
  return firstLoginTourIdForRole(role);
}
