import type { DoorHinge, Opening } from "../types/openings";
import type { PartitionWallConfig } from "../types/partitionWall";
import { partitionOpeningToWallOpening } from "../types/partitionWall";
import { OPENING_TYPES } from "../constants/openingTypes";
import { Wall } from "./Wall";

const MM_TO_M = 1 / 1000;

// Feste Trennwandtuer-Masse (Jonas' Vorgabe 2026-08-14), floor-buendig (kein
// Sockel/Schwelle) - siehe openingTypes.ts's partition_door.
const DOOR_KIND = "partition_door" as const;
const DOOR_WIDTH_MM = OPENING_TYPES[DOOR_KIND].fixedWidth!;
const DOOR_HEIGHT_MM = OPENING_TYPES[DOOR_KIND].fixedHeight!;

// "Immer DIN rechts von der glatten Seite aus gesehen" (Jonas' Vorgabe
// 2026-08-14) - hergeleitet aus Wall.tsx/DoorLeaf.tsx's tatsaechlicher
// Geometrie statt gespeichert, damit sich die Bandseite beim Spiegeln der
// Wand automatisch mitdreht:
//
// hinge="right" legt das Scharnier auf die HOHE-u-Kante (u+width/2, siehe
// DoorLeaf.tsx's hingeEdgeU), u ist dabei immer lokal-X, unabhaengig von
// outwardSign. Bei three.js' Standardkonvention (Kamera blickt in -Z,
// +X = rechts der Kamera) erscheint die hohe-u-Kante als "rechts" fuer einen
// Betrachter, der auf der lokal+Z-Seite steht und Richtung -Z blickt - und
// als "links" fuer einen Betrachter auf der lokal-Z-Seite (blickt Richtung
// +Z). smoothSide="front" bedeutet hier outwardSign=+1, d. h. die glatte
// Seite liegt auf lokal+Z (siehe PartitionWall() unten) - ein Betrachter DORT
// sieht die hohe-u-Kante rechts, also hinge="right" fuer echtes DIN-rechts.
// Umgekehrt bei smoothSide="back" (glatte Seite = lokal-Z): dort erscheint
// die hohe-u-Kante links, also muss hinge="left" gespeichert werden, damit es
// von der glatten Seite aus weiterhin als DIN-rechts erscheint.
//
// Nicht durch reines Nachdenken 100% verifizierbar (haengt von einer
// Blickrichtungs-Konvention ab, die nicht im Code selbst steht) - beim ersten
// Rendern visuell gegenpruefen (siehe Plan-Verifikation) und hier ggf. einfach
// den ":"-Zweig tauschen, falls es seitenverkehrt aussieht.
function partitionDoorHinge(smoothSide: PartitionWallConfig["smoothSide"]): DoorHinge {
  return smoothSide === "front" ? "right" : "left";
}

interface PartitionWallProps {
  pw: PartitionWallConfig;
  panelWidth: number; // Meter, = Container.tsx's endWallWidth (lichte Breite zwischen Links/Rechts)
  panelHeight: number; // Meter, = Container.tsx's verticalWallHeight
  positionY: number; // Meter, = Container.tsx's verticalWallPositionY
  verticalWallVOffset: number; // Meter, = Container.tsx's verticalWallVOffset (siehe dortiger Kommentar)
}

// Eine einzelne Trennwand: duenner Wrapper um die bestehende, bereits
// generische Wall-Komponente (siehe Plan/Wall.tsx-Kommentar zu outwardSign) -
// keine eigene CSG-/Rail-Logik, nur Positionierung + Umrechnung.
export function PartitionWall({ pw, panelWidth, panelHeight, positionY, verticalWallVOffset }: PartitionWallProps) {
  const positionU_m = pw.positionU * MM_TO_M;
  const thickness_m = pw.thickness * MM_TO_M;
  // Wiederverwendet die front/back-Vorzeichen-Konvention der Aussenwaende
  // (Container.tsx): +1, wenn die glatte Seite auf lokal+Z liegt. Bestimmt
  // hier (ueber Wall.tsx), auf welcher Seite die C-Schienen-Verkleidung sitzt
  // - die glatte Seite bekommt nie interiorCladding, exakt wie bei den
  // Aussenwaenden die "aussen" (outwardSign-Seite) nie die Verkleidung
  // bekommt.
  const outwardSign: 1 | -1 = pw.smoothSide === "front" ? 1 : -1;

  // v-Umrechnung wie Container.tsx's openingsM/openingsFor: erst die
  // MM-Werte auf Meter bringen, danach um verticalWallVOffset korrigieren
  // (siehe dortiger Kommentar - noetig, weil verticalWallPositionY nicht
  // immer exakt panelHeight/2 ueber dem echten Boden liegt).
  const openingsM: Opening[] = pw.openings.map((o) => {
    // Wetterschutzgitter-Seite ist unabhaengig vom Wand-Spiegelzustand frei
    // waehlbar (Jonas' Vorgabe), "dreht sich" beim Spiegeln aber automatisch
    // mit, weil side relativ zur Wand (glatt/C-Schiene) statt absolut
    // gespeichert ist: "smooth" folgt outwardSign, "railed" ist das Gegenteil.
    const protrusionSign: 1 | -1 | undefined =
      o.kind === "vent_weather" ? (o.side === "railed" ? ((-outwardSign) as 1 | -1) : outwardSign) : undefined;
    return partitionOpeningToWallOpening(
      {
        ...o,
        u: o.u * MM_TO_M,
        v: o.v * MM_TO_M - verticalWallVOffset,
        width: o.width * MM_TO_M,
        height: o.height * MM_TO_M,
      },
      protrusionSign,
    );
  });

  if (pw.door) {
    const doorCenterV_mm = DOOR_HEIGHT_MM / 2; // Unterkante = Boden (0mm), siehe types/partitionWall.ts
    openingsM.push({
      id: `${pw.id}-door`,
      kind: DOOR_KIND,
      panel: "front",
      u: pw.door.u * MM_TO_M,
      v: doorCenterV_mm * MM_TO_M - verticalWallVOffset,
      width: DOOR_WIDTH_MM * MM_TO_M,
      height: DOOR_HEIGHT_MM * MM_TO_M,
      hinge: partitionDoorHinge(pw.smoothSide),
    });
  }

  return (
    <Wall
      position={[positionU_m, positionY, 0]}
      rotation={[0, Math.PI / 2, 0]}
      panelWidth={panelWidth}
      panelHeight={panelHeight}
      thickness={thickness_m}
      openings={openingsM}
      outwardSign={outwardSign}
      interiorCladding
      paintBothSidesInside
    />
  );
}
