import type { ContainerSize } from "../constants/containerSizes";
import { WALL_THICKNESS } from "../constants/openingTypes";
import type { Opening, PanelId } from "../types/openings";
import { Wall } from "./Wall";

interface ContainerProps {
  size: ContainerSize;
  openings: Opening[];
}

// Neutrales, industrielles Hellgrau statt einer Markenfarbe - reale
// Sondercontainer (siehe lc.systems-Referenzbilder) sind lackierte
// Stahlpaneele, keine Marken-Buntfarbe.
const WALL_COLOR = "#d7dade";

// Container als hohle Schale aus 6 einzeln schneidbaren Panels (vier
// Seitenwaende + Dach + Boden - Jonas' Vorgabe 2026-07-22: auch oben/unten
// sollen Durchbrueche moeglich sein, nicht nur an den Seiten). Kompass-Achsen
// (Norden = kleine Stirnflaeche): Norden/Sueden liegen an den Enden der
// LAENGE (lokal X), Osten/Westen an den Enden der BREITE (lokal Z).
//
// Fuer Oben/Unten wird dieselbe Wall-Komponente wiederverwendet (identische
// "Quader minus Ausschnitt"-Logik), nur um die X-Achse um ±90 Grad gekippt,
// damit die Dicke lokal weiterhin auf lokal-Z liegt, aber nach der Rotation
// tatsaechlich VERTIKAL (Welt-Y) zeigt - siehe Wall.tsx-Kommentar zu
// outwardSign fuer die Herleitung, welches Vorzeichen dabei "aussen" ist.
export function Container({ size, openings }: ContainerProps) {
  const { length: L, width: W, height: H } = size;
  const t = WALL_THICKNESS;

  const openingsFor = (panel: PanelId) => openings.filter((o) => o.panel === panel);

  return (
    <group>
      {/* Osten/Westen: lange Seitenflaechen, spannen die LAENGE (X) auf, liegen an den Enden der BREITE (Z). */}
      <Wall
        position={[0, H / 2, W / 2 - t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("east")}
        color={WALL_COLOR}
        outwardSign={1}
      />
      <Wall
        position={[0, H / 2, -W / 2 + t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("west")}
        color={WALL_COLOR}
        outwardSign={-1}
      />

      {/* Norden/Sueden: kleine Stirnflaechen, spannen die BREITE (Z) auf, liegen an den Enden der LAENGE (X). */}
      <Wall
        position={[-L / 2 + t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("north")}
        color={WALL_COLOR}
        outwardSign={-1}
      />
      <Wall
        position={[L / 2 - t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("south")}
        color={WALL_COLOR}
        outwardSign={1}
      />

      {/* Oben/Unten: horizontale Platten, um X gekippt statt um Y - lokal X bleibt Welt-X (Laenge), lokal Y wird zu Welt-Z (Breite). */}
      <Wall
        position={[0, H - t / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        panelWidth={L}
        panelHeight={W}
        thickness={t}
        openings={openingsFor("top")}
        color={WALL_COLOR}
        outwardSign={1}
      />
      <Wall
        position={[0, t / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        panelWidth={L}
        panelHeight={W}
        thickness={t}
        openings={openingsFor("bottom")}
        color={WALL_COLOR}
        outwardSign={1}
      />
    </group>
  );
}
