import type { ContainerSize } from "../constants/containerSizes";
import { OPENING_TYPES } from "../constants/openingTypes";
import type { Opening, PanelId } from "../types/openings";
import { Wall } from "./Wall";

interface ContainerProps {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
}

const MM_TO_M = 1 / 1000;

// Container als hohle Schale aus 6 einzeln schneidbaren Panels (vier
// Seitenwaende + Dach + Boden - Jonas' Vorgabe 2026-07-22: auch oben/unten
// sollen Durchbrueche moeglich sein, nicht nur an den Seiten).
//
// Relative Richtungen statt Kompass (Jonas' Fehlerbericht 2026-07-23, siehe
// types/openings.ts) - die WELTKOORDINATEN unten sind UNVERAENDERT
// gegenueber der fruaeheren Kompass-Version, nur die Zuordnung zu den
// Bezeichnungen ist neu: front=vorheriges "south" (+X), back=vorheriges
// "north" (-X), right=vorheriges "west" (-Z), left=vorheriges "east" (+Z).
// Front/Back liegen an den Enden der LAENGE (lokal X), Left/Right an den
// Enden der BREITE (lokal Z).
//
// Fuer Oben/Unten wird dieselbe Wall-Komponente wiederverwendet (identische
// "Quader minus Ausschnitt"-Logik), nur um die X-Achse um ±90 Grad gekippt,
// damit die Dicke lokal weiterhin auf lokal-Z liegt, aber nach der Rotation
// tatsaechlich VERTIKAL (Welt-Y) zeigt - siehe Wall.tsx-Kommentar zu
// outwardSign fuer die Herleitung, welches Vorzeichen dabei "aussen" ist.
//
// EINHEITEN: size/wallThickness/openings kommen komplett in MILLIMETERN an
// (Jonas' Vorgabe 2026-07-22, gilt fuers gesamte Datenmodell/UI) - hier,
// zentral an EINER Stelle, auf Meter umgerechnet (Three.js-Konvention),
// damit Wall/DoorLeaf unveraendert in Metern weiterrechnen koennen. Bei
// dieser Gelegenheit wird fuer Tueren auch v (Unterkante ueber Boden, siehe
// types/openings.ts) in die fuer Wall/DoorLeaf erwartete Mitte umgerechnet -
// beide Konzepte (Einheit + Bezugspunkt) an derselben Stelle aufgeloest,
// damit Wall.tsx/DoorLeaf.tsx von beidem nichts wissen muessen.
export function Container({ size, wallThickness, openings }: ContainerProps) {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThickness * MM_TO_M;

  const openingsM = openings.map((o) => {
    const typeDef = OPENING_TYPES[o.kind];
    const vBottomOrCenterMm = typeDef.isDoor ? o.v + o.height / 2 : o.v;
    return {
      ...o,
      u: o.u * MM_TO_M,
      v: vBottomOrCenterMm * MM_TO_M,
      width: o.width * MM_TO_M,
      height: o.height * MM_TO_M,
    };
  });

  const openingsFor = (panel: PanelId) => openingsM.filter((o) => o.panel === panel);

  return (
    <group>
      {/* Links/Rechts (vorher Osten/Westen): lange Seitenflaechen, spannen
          die LAENGE (X) auf, liegen an den Enden der BREITE (Z). */}
      <Wall
        position={[0, H / 2, W / 2 - t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("left")}
        outwardSign={1}
      />
      <Wall
        position={[0, H / 2, -W / 2 + t / 2]}
        rotation={[0, 0, 0]}
        panelWidth={L}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("right")}
        outwardSign={-1}
      />

      {/* Hinten/Vorne (vorher Norden/Sueden): kleine Stirnflaechen, spannen
          die BREITE (Z) auf, liegen an den Enden der LAENGE (X). */}
      <Wall
        position={[-L / 2 + t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("back")}
        outwardSign={-1}
      />
      <Wall
        position={[L / 2 - t / 2, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        panelWidth={W}
        panelHeight={H}
        thickness={t}
        openings={openingsFor("front")}
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
        outwardSign={1}
      />
      <Wall
        position={[0, t / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        panelWidth={L}
        panelHeight={W}
        thickness={t}
        openings={openingsFor("bottom")}
        outwardSign={1}
      />
    </group>
  );
}
