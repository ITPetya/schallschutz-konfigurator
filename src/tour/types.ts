export interface TourStep {
  // CSS-Selektor, der ein data-tour-Attribut trifft (robuster als Text- oder
  // Tailwind-Klassen-Selektoren, die sich mit dem Layout aendern koennen).
  selector: string;
  title: string;
  body: string;
  // Falls gesetzt, navigiert die Tour vor Anzeige dieses Schritts erst
  // dorthin (z. B. Kunden-Tour springt von "Menü" zu "/projekte").
  route?: string;
  placement?: "top" | "bottom";
  // AppShell muss sein Menü-Dropdown waehrend dieses Schritts offen halten,
  // auch wenn der Nutzer es nicht selbst geoeffnet hat.
  forceMenuOpen?: boolean;
}

export interface Tour {
  id: string;
  steps: TourStep[];
}
