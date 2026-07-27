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
  // Wenn gesetzt, geht die Tour automatisch zum naechsten Schritt weiter,
  // sobald die App per notifyEvent() genau dieses Ereignis meldet - z. B.
  // erst weiter, NACHDEM der Nutzer tatsaechlich einen Container hinzugefuegt
  // hat, statt nur zuzuschauen. Der "Weiter"-Button bleibt trotzdem als
  // manueller Ausweg nutzbar (z. B. falls schon ein Container existiert).
  waitForEvent?: string;
}

export interface Tour {
  id: string;
  steps: TourStep[];
}
