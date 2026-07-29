import { useMemo } from "react";
import * as THREE from "three";
import type { Opening } from "../types/openings";
import { getCRailProfileShape, C_RAIL_PITCH_M } from "../utils/cRailProfile";
import { createStreckgitterMaterial } from "../utils/streckgitterTexture";

interface InteriorCladdingProps {
  panelWidth: number;
  panelHeight: number;
  thickness: number;
  openings: Opening[];
  outwardSign: 1 | -1;
}

// Aussenbreite der C-Schiene (siehe cRailProfile.ts) - fuer den Toleranz-
// Bereich, ab dem eine Oeffnung als "unter dieser Schiene liegend" gilt.
const RAIL_PROFILE_WIDTH_M = 0.046;
// Reststuecke unter dieser Hoehe werden nicht mehr als eigenes Feld gerendert
// (z. B. ein 3mm-Rest direkt ueber einer Tuer) - optische Bereinigung.
const MIN_SEGMENT_HEIGHT_M = 0.02;

// Verschmilzt ueberlappende "blockierte" Hoehenbereiche (Oeffnungen) und
// liefert die dazwischen/darueber/darunter freien Hoehenbereiche innerhalb
// [0, total] - dieselbe Aussparungs-Logik wird sowohl fuer die C-Schienen als
// auch fuer die Streckgitter-Felder gebraucht.
function freeSegments(blocked: [number, number][], total: number): [number, number][] {
  if (blocked.length === 0) return [[0, total]];
  const sorted = [...blocked].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [from, to] = sorted[i];
    if (from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  const free: [number, number][] = [];
  let cursor = 0;
  for (const [from, to] of merged) {
    if (from > cursor) free.push([cursor, from]);
    cursor = Math.max(cursor, to);
  }
  if (cursor < total) free.push([cursor, total]);
  return free.filter(([from, to]) => to - from > MIN_SEGMENT_HEIGHT_M);
}

// Innenverkleidung der Seitenwaende (Jonas' Vorgabe 2026-07-29): Streckgitter-
// Bleche zwischen senkrechten C-Klemmschienen (558mm Achse-Achse), zur
// Befestigung von Aggregaten/Halterungen. Tueren/Einbauten sparen sowohl
// Schienen als auch Gitterfelder an der jeweiligen Stelle aus (siehe
// freeSegments) - beide werden pro Wand aus deren openings berechnet, exakt
// wie der CSG-Ausschnitt der Wand selbst (Wall.tsx), nur eben additiv statt
// subtraktiv.
export function InteriorCladding({ panelWidth, panelHeight, thickness, openings, outwardSign }: InteriorCladdingProps) {
  const railGeometry = useMemo(() => {
    const geom = new THREE.ExtrudeGeometry(getCRailProfileShape(), { depth: 1, bevelEnabled: false, steps: 1 });
    // Profil liegt lokal in XY (X=quer zur Wand, Y=Tiefe in den Raum),
    // Extrusion laeuft entlang Z - fuer eine SENKRECHTE Schiene muss die
    // Extrusionsachse zur Wand-Hochachse (lokal Y) werden: rotateX(-90°)
    // bildet (x,y,z) -> (x,z,-y) ab, die Extrusionslaenge (0..1) landet
    // damit auf lokal Y (0..1, aufwaerts).
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  const innerZ = -outwardSign * (thickness / 2); // Wandinnenflaeche, siehe Wall.tsx's edgeGeometry

  // Feste Schienenteilung (558mm Achse-Achse, NICHT gestreckt/gestaucht wie
  // die Lamellen des Wetterschutzgitters - das ist eine reale
  // Befestigungsraster-Vorgabe) - Rest-Randstuecke links/rechts werden
  // gleichmaessig aufgeteilt statt eine Schiene an den Rand zu zwingen.
  const { railU, bays } = useMemo(() => {
    const count = Math.max(1, Math.floor(panelWidth / C_RAIL_PITCH_M) + 1);
    const margin = (panelWidth - (count - 1) * C_RAIL_PITCH_M) / 2;
    const u = Array.from({ length: count }, (_, i) => -panelWidth / 2 + margin + i * C_RAIL_PITCH_M);

    const bayBounds: { uStart: number; uEnd: number; material: THREE.MeshStandardMaterial }[] = [];
    const addBay = (uStart: number, uEnd: number) => {
      if (uEnd - uStart < 0.02) return;
      bayBounds.push({ uStart, uEnd, material: createStreckgitterMaterial(uEnd - uStart, panelHeight) });
    };
    if (u[0] > -panelWidth / 2) addBay(-panelWidth / 2, u[0]);
    for (let i = 0; i < u.length - 1; i++) addBay(u[i], u[i + 1]);
    if (u[u.length - 1] < panelWidth / 2) addBay(u[u.length - 1], panelWidth / 2);

    return { railU: u, bays: bayBounds };
  }, [panelWidth, panelHeight]);

  return (
    <group>
      {/* C-Schienen: EINE Profil-Geometrie fuer alle Instanzen/Groessen -
          pro freiem Hoehenabschnitt nur Y-skaliert (Extrusionslaenge=1m)
          statt neu berechnet. */}
      {railU.map((u, i) => {
        const blocked = openings
          .filter((o) => Math.abs(o.u - u) < o.width / 2 + RAIL_PROFILE_WIDTH_M / 2)
          .map((o): [number, number] => [o.v - o.height / 2, o.v + o.height / 2]);
        return freeSegments(blocked, panelHeight).map(([from, to], j) => (
          <mesh
            key={`rail-${i}-${j}`}
            geometry={railGeometry}
            position={[u, from - panelHeight / 2, innerZ]}
            scale={[1, to - from, outwardSign]}
            castShadow
          >
            <meshStandardMaterial color="#b8bcc0" roughness={0.5} metalness={0.7} />
          </mesh>
        ));
      })}

      {/* Streckgitter-Felder zwischen den Schienen (inkl. der beiden
          schmaleren Randfelder links/rechts). */}
      {bays.map(({ uStart, uEnd, material }, i) => {
        const bayCenter = (uStart + uEnd) / 2;
        const blocked = openings
          .filter((o) => o.u + o.width / 2 > uStart && o.u - o.width / 2 < uEnd)
          .map((o): [number, number] => [o.v - o.height / 2, o.v + o.height / 2]);
        return freeSegments(blocked, panelHeight).map(([from, to], j) => (
          <mesh key={`bay-${i}-${j}`} position={[bayCenter, (from + to) / 2 - panelHeight / 2, innerZ]} material={material}>
            <planeGeometry args={[uEnd - uStart, to - from]} />
          </mesh>
        ));
      })}
    </group>
  );
}
