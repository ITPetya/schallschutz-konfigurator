import { useEffect, useState } from "react";

// Jonas' Vorgabe 2026-07-28: auf dem Handy soll die App nur noch Projekte
// ANSEHEN koennen (Konfigurieren bleibt Laptop/PC/Tablet vorbehalten) - siehe
// StartPage.tsx. Schwelle bewusst bei 640px (Tailwind "sm", nicht "md"):
// Tablets im Hochformat liegen meist bei 768px+ und sollen weiterhin als
// vollwertiges Bearbeitungsgeraet gelten, nur "echte" Handy-Breiten sollen
// den Viewer-Modus ausloesen. Reine Breiten-Erkennung statt User-Agent/Touch
// (robuster, kein Geraete-Sniffing noetig) - reagiert live auf Rotation/
// Fenstergroessenaenderung ueber matchMedia statt nur beim ersten Rendern.
const PHONE_MEDIA_QUERY = "(max-width: 640px)";

export function useIsPhoneViewport(): boolean {
  const [isPhone, setIsPhone] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(PHONE_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(PHONE_MEDIA_QUERY);
    const onChange = () => setIsPhone(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}
