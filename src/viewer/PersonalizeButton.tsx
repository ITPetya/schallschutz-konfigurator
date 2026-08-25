import { useState } from "react";

interface PersonalizeButtonProps {
  href: string;
}

// Jonas' Vorgabe 2026-08-19: "erst ein Kreis mit Pfeil drin, beim Hover wird
// er zu einem laenglichen Button mit 'Konfigurieren'" - startet als reiner
// Kreis-Button, waechst beim Hover per CSS-Transition zu einer Pille mit
// Text auf. Echter Link (kein onClick+navigate) mit target="_blank": das
// Embed kann in einem Cross-Origin-iframe auf einer fremden Webseite
// stecken, ein neuer Tab oeffnet das volle Studio statt es in den kleinen
// iframe-Ausschnitt zu zwingen. href wird von entry.tsx gebaut (?preset=
// bzw. ?config= + Farbe, siehe dortiger Kommentar) - WorkspacePage.tsx hat
// dafuer einen neuen URL-Fallback bekommen (siehe dortiger
// routePresetProject-Kommentar), da location.state (der bisherige Weg)
// bei einem echten, moeglicherweise Cross-Origin-Seitenaufruf nicht
// funktioniert.
const CIRCLE_SIZE = 40;
const EXPANDED_WIDTH = 156;

export function PersonalizeButton({ href }: PersonalizeButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Konfigurieren"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: hovered ? "flex-start" : "center",
        gap: 8,
        height: CIRCLE_SIZE,
        width: hovered ? EXPANDED_WIDTH : CIRCLE_SIZE,
        borderRadius: 9999,
        background: hovered ? "#075471" : "#008eb4",
        color: "#fff",
        textDecoration: "none",
        fontFamily: "sans-serif",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        cursor: "pointer",
        paddingLeft: hovered ? 18 : 0,
        paddingRight: hovered ? 14 : 0,
        transition: "width 0.25s ease, background-color 0.2s ease, padding 0.25s ease",
      }}
    >
      {hovered && <span style={{ flex: 1 }}>Konfigurieren</span>}
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}
