import { useEffect, useRef, type ReactNode } from "react";
import type { ContainerSize } from "../constants/containerSizes";
import { OPENING_TYPES } from "../constants/openingTypes";
import type { Opening, PanelId } from "../types/openings";
import { isVerticalWall } from "../types/openings";
import { Wall } from "./Wall";
import {
  CornerCasting,
  CORNER_BLOCK_LENGTH_MM,
  CORNER_BLOCK_WIDTH_MM,
  CORNER_BLOCK_HEIGHT_MM,
  CORNER_WALL_RECESS_MM,
} from "./CornerCasting";
import { useChunkedReveal } from "../hooks/useChunkedReveal";

const SIGNS = [1, -1] as const;

interface ContainerProps {
  size: ContainerSize;
  wallThickness: number;
  openings: Opening[];
  // Wird EINMAL aufgerufen, sobald alle 14 Bauteile (6 Waende + 8
  // Eckbeschlaege) tatsaechlich gemountet/berechnet sind - Scene.tsx/
  // ProjectScene3D.tsx nutzen das, um ihr Lade-Overlay so lange sichtbar zu
  // halten, wie der CSG-Aufbau DIESES Containers noch laeuft (siehe
  // hooks/useChunkedReveal.ts fuer den Grund, warum das stueckweise statt
  // in einem Rutsch passiert).
  onReady?: () => void;
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
export function Container({ size, wallThickness, openings, onReady }: ContainerProps) {
  const L = size.length * MM_TO_M;
  const W = size.width * MM_TO_M;
  const H = size.height * MM_TO_M;
  const t = wallThickness * MM_TO_M;
  const cornerLength = CORNER_BLOCK_LENGTH_MM * MM_TO_M;
  const cornerWidth = CORNER_BLOCK_WIDTH_MM * MM_TO_M;
  const cornerHeight = CORNER_BLOCK_HEIGHT_MM * MM_TO_M;
  // Jonas' Fehlerbericht 2026-07-28: Eckbeschlaege standen 12mm ueber die
  // konfigurierten Aussenmasse (size.length/width/height) hinaus vor - sie
  // duerfen die Aussenmasse aber NICHT ueberschreiten, sollen genau darauf
  // sitzen. Fix: nicht mehr der Eckblock waechst nach aussen (siehe
  // CornerCasting.tsx-Kommentar zu CORNER_WALL_RECESS_MM), sondern die
  // WAENDE weichen ringsum um denselben Betrag nach INNEN zurueck - der
  // Eckbeschlag bleibt exakt auf der Aussenkontur, das Wellblech dahinter
  // ist leicht zurueckgesetzt (wie beim echten Container).
  const wallRecess = CORNER_WALL_RECESS_MM * MM_TO_M;
  // Jonas' Fehlerbericht 2026-07-28 (Folgefehler des Recess-Fixes oben): nur
  // die AUSSENFLAECHE jeder Wand wurde zurueckgesetzt, ihre Spannweite
  // (panelWidth/panelHeight) blieb aber voll - dadurch reichten die
  // Wand-STIRNSEITEN (an den Enden, wo sie die Nachbarwand trifft) weiterhin
  // bis exakt an die Aussenmasse heran, also wieder koplanar mit der
  // Eckbeschlag-Aussenflaeche an genau dieser Stelle ("die Kante guckt
  // raus"/Ueberlagerung, aber jetzt an der Stirnseite statt der Hauptflaeche).
  // Fix: jede Wand spannt an BEIDEN Enden um wallRecess weniger auf - der
  // Eckbeschlag (der an dieser Ecke ohnehin bis zur echten Aussenmasse
  // reicht) deckt die dadurch entstehende kleine Luecke vollstaendig ab.
  // Betrifft ALLE vier Kanten jeder Wand, nicht nur zwei: Links/Rechts/Vorne/
  // Hinten treffen mit ihrer HOEHE (Y) ebenso auf die oberen/unteren
  // Eckbloecke wie mit ihrer Laenge/Breite auf die seitlichen Nachbarwaende -
  // daher effectiveH zusaetzlich zu effectiveL/effectiveW.
  const effectiveL = L - 2 * wallRecess;
  const effectiveW = W - 2 * wallRecess;
  const effectiveH = H - 2 * wallRecess;

  // Jonas' Fehlerbericht 2026-07-29 (Wandkeil an den Ecken): jede Wand war
  // bisher ein voller, unbeschnittener Quader ueber effectiveL/W/H, der sich
  // an JEDER Kante mit der jeweils angrenzenden Wand um genau die
  // Wandstaerke t ueberlappte (dieselbe 3D-Zelle war fuer beide Waende
  // "solide") - in dieser Ueberlappungszone konnte je nach Blickwinkel die
  // AUSSENfarbe der einen Wand durch die INNENflaeche der Nachbarwand
  // durchscheinen/z-fighten (der gemeldete farbige Keil). Fix: statt alle 6
  // Panels voll ueberlappen zu lassen, wird eine feste Rangfolge eingehalten
  // ("wer stoesst an wen"), wie beim Bau eines echten Containers:
  // - Oben/Unten bleiben VOLL (Laenge x Breite) - sie "kappen" die ganze
  //   Baugruppe von oben/unten, unveraendert.
  // - Links/Rechts bleiben in der LAENGE voll, werden aber in der HOEHE um
  //   je t oben UND unten gekuerzt, damit sie zwischen Oben/Unten passen statt
  //   in deren Dicke hineinzuragen.
  // - Vorne/Hinten werden in BEIDEN Richtungen gekuerzt (Breite UND Hoehe je
  //   um t an beiden Enden) - sie sind die "Fuellplatten", die zwischen
  //   Links/Rechts UND Oben/Unten eingepasst werden.
  // Die AUSSENkontur (Positionen oben) bleibt dabei exakt gleich, nur die
  // Spannweite jeder Wand schrumpft symmetrisch um ihre eigenen Enden - dadurch
  // stossen alle Waende exakt an den echten Innenkanten aneinander, ohne Spalt
  // UND ohne Ueberlappung.
  const verticalWallHeight = Math.max(effectiveH - 2 * t, 0);
  const endWallWidth = Math.max(effectiveW - 2 * t, 0);

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

  // Wall.tsx berechnet die lokale Y-Position eines Durchbruchs als
  // "opening.v - panelHeight/2" - das ergibt nur dann die richtige absolute
  // Weltposition (v = Hoehe ueber dem ECHTEN Boden), wenn position.y - panelHeight/2
  // exakt 0 ist. Das stimmte bisher immer (position.y=H/2, panelHeight=H),
  // ist aber jetzt fuer die vier Seitenwaende nicht mehr der Fall
  // (position.y bleibt H/2, panelHeight ist jedoch verticalWallHeight < H) -
  // ohne Korrektur wuerden alle Durchbrueche/Tueren dort zu hoch sitzen. Fix:
  // v fuer genau diese vier Panels nach unten korrigieren, BEVOR Wall.tsx
  // damit rechnet - fuer Oben/Unten unnoetig, da deren Position in der
  // (effectiveW-)Richtung bei 0 bleibt und daher gar keine Kopplung entsteht.
  // Korrekturbetrag = wallRecess + t (statt nur wallRecess wie zuvor), weil
  // verticalWallHeight jetzt zusaetzlich um t GEKUERZT ist (Wandkeil-Fix
  // oben, siehe Kommentar bei verticalWallHeight) - dieselbe Herleitung wie
  // vorher (v_korrigiert = v - H/2 + panelHeight/2), nur mit dem kleineren
  // panelHeight.
  const openingsFor = (panel: PanelId) => {
    const filtered = openingsM.filter((o) => o.panel === panel);
    if (!isVerticalWall(panel)) return filtered;
    return filtered.map((o) => ({ ...o, v: o.v - wallRecess - t }));
  };

  // Alle 14 Bauteile (6 Waende + 8 Eckbeschlaege) als flache Liste statt
  // direkt im JSX - so kann useChunkedReveal sie STUECKWEISE freigeben statt
  // in einem einzigen synchronen CSG-Rutsch (Jonas' Fehlerbericht 2026-07-29:
  // "keine Ladeanimation... auch alles hat sehr lange geladen", siehe
  // hooks/useChunkedReveal.ts fuer die Begruendung der adaptiven statt
  // festen Rate).
  const parts: ReactNode[] = [
    // Links/Rechts (vorher Osten/Westen): lange Seitenflaechen, spannen die
    // LAENGE (X) auf, liegen an den Enden der BREITE (Z).
    <Wall
      key="wall-left"
      position={[0, H / 2, W / 2 - t / 2 - wallRecess]}
      rotation={[0, 0, 0]}
      panelWidth={effectiveL}
      panelHeight={verticalWallHeight}
      thickness={t}
      openings={openingsFor("left")}
      outwardSign={1}
      interiorCladding
    />,
    <Wall
      key="wall-right"
      position={[0, H / 2, -W / 2 + t / 2 + wallRecess]}
      rotation={[0, 0, 0]}
      panelWidth={effectiveL}
      panelHeight={verticalWallHeight}
      thickness={t}
      openings={openingsFor("right")}
      outwardSign={-1}
      interiorCladding
    />,
    // Hinten/Vorne (vorher Norden/Sueden): kleine Stirnflaechen, spannen die
    // BREITE (Z) auf, liegen an den Enden der LAENGE (X).
    <Wall
      key="wall-back"
      position={[-L / 2 + t / 2 + wallRecess, H / 2, 0]}
      rotation={[0, Math.PI / 2, 0]}
      panelWidth={endWallWidth}
      panelHeight={verticalWallHeight}
      thickness={t}
      openings={openingsFor("back")}
      outwardSign={-1}
      interiorCladding
    />,
    <Wall
      key="wall-front"
      position={[L / 2 - t / 2 - wallRecess, H / 2, 0]}
      rotation={[0, Math.PI / 2, 0]}
      panelWidth={endWallWidth}
      panelHeight={verticalWallHeight}
      thickness={t}
      openings={openingsFor("front")}
      outwardSign={1}
      interiorCladding
    />,
    // Oben/Unten: horizontale Platten, um X gekippt statt um Y - lokal X
    // bleibt Welt-X (Laenge), lokal Y wird zu Welt-Z (Breite).
    // Jonas' Vorgabe 2026-07-29: auch das Dach hat C-Schienen + Streckgitter,
    // gleiches Schema wie an den Seitenwaenden - nur eben "kurze Richtung"
    // (Breite) statt Hoehe. Kein Sonderfall noetig: bei diesem Panel ist
    // panelHeight (die Achse, entlang der InteriorCladding.tsx die Schienen
    // laufen laesst) bereits effectiveW (Breite), panelWidth (die Achse mit
    // dem 558mm-Raster) bereits effectiveL (Laenge) - genau die gewuenschte
    // Ausrichtung ergibt sich automatisch aus der bestehenden Dach-Rotation.
    <Wall
      key="wall-top"
      position={[0, H - t / 2 - wallRecess, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      panelWidth={effectiveL}
      panelHeight={effectiveW}
      thickness={t}
      openings={openingsFor("top")}
      outwardSign={1}
      interiorCladding
    />,
    <Wall
      key="wall-bottom"
      position={[0, t / 2 + wallRecess, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      panelWidth={effectiveL}
      panelHeight={effectiveW}
      thickness={t}
      openings={openingsFor("bottom")}
      outwardSign={1}
    />,
    // Eckbeschlaege (Jonas' Vorgabe 2026-07-28, Referenzfoto + echte
    // ISO-1161-Masse 178x162x118mm): an allen 8 Container-Ecken je ein Block
    // mit Langloch oben/unten + Rundloch an den beiden aussenliegenden
    // Seitenflaechen - siehe CornerCasting.tsx. Position buendig mit den
    // echten Aussenmassen (dieselbe "Aussenmass minus halbe Bauteilgroesse"-
    // Logik wie bei den Wall-Positionen oben, VOR dem wallRecess-Abzug) - die
    // Eckbloecke selbst wachsen NICHT mehr darueber hinaus (Jonas'
    // Fehlerbericht: das ueberschritt die konfigurierten Aussenmasse),
    // stattdessen weichen die Waende oben um wallRecess zurueck.
    ...SIGNS.flatMap((outwardX) =>
      SIGNS.flatMap((outwardZ) =>
        SIGNS.map((outwardY) => (
          <CornerCasting
            key={`corner-${outwardX}-${outwardY}-${outwardZ}`}
            position={[
              outwardX * (L / 2 - cornerLength / 2),
              outwardY === 1 ? H - cornerHeight / 2 : cornerHeight / 2,
              outwardZ * (W / 2 - cornerWidth / 2),
            ]}
            outwardX={outwardX}
            outwardY={outwardY}
            outwardZ={outwardZ}
          />
        ))
      )
    ),
  ];

  const revealed = useChunkedReveal(parts.length);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    if (revealed >= parts.length) onReadyRef.current?.();
    // parts.length ist pro Render stabil (haengt nur von SIGNS/den 6 festen
    // Waenden ab, nie von Props) - absichtlich nicht in den Deps, um nicht
    // bei jeder Neuberechnung von "parts" (jedes Render) neu zu feuern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return <group>{parts.slice(0, revealed)}</group>;
}
