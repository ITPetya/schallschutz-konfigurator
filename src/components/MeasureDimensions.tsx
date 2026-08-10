import { useState } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { MeasureSegmentLabel } from "./MeasureSegmentLabel";
import type { LengthUnit } from "../utils/lengthUnits";

interface MeasureDimensionsProps {
  a: [number, number, number];
  b: [number, number, number];
  unit: LengthUnit;
}

interface Segment {
  key: string;
  from: [number, number, number];
  to: [number, number, number];
  label?: string;
  meters: number;
}

// Unterhalb dieser Laenge (Meter) gilt ein Segment als "0" und wird im
// XYZ-Modus komplett ausgeblendet (Jonas' Vorgabe 2026-08-10: "die Linien/
// Bemaßungen, die 0 sind, sollen ausgeblendet sein") - 0,5mm statt exakt 0,
// wegen moeglichem Gleitkomma-Rauschen bei eigentlich exakt gleicher Achse.
const ZERO_EPS_M = 0.0005;

// Jonas' Vorgabe 2026-08-10: "XYZ soll auch wirkliche Linien sein, wo dann
// die Maße dran sind, also als ob man 3 Maße gleichzeitig hat" - im
// Direkt-Modus EINE diagonale Linie A->B, im XYZ-Modus stattdessen ein
// Treppenweg aus bis zu 3 rein achsenparallelen Segmenten (A->A' nur X,
// A'->A'' nur Y, A''->B nur Z), jedes mit eigener Linie + eigener
// Bemaßung an dessen Mittelpunkt. Klick auf IRGENDEINES der Masse (egal ob
// Direkt oder eines der XYZ-Segmente) wechselt den Modus fuer alle
// gemeinsam, siehe onToggle unten.
export function MeasureDimensions({ a, b, unit }: MeasureDimensionsProps) {
  const [mode, setMode] = useState<"direct" | "xyz">("direct");

  function toggleMode() {
    setMode((m) => (m === "direct" ? "xyz" : "direct"));
  }

  const directMeters = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const corner1: [number, number, number] = [b[0], a[1], a[2]];
  const corner2: [number, number, number] = [b[0], b[1], a[2]];

  const xyzSegments: Segment[] = [
    { key: "x", from: a, to: corner1, label: "X", meters: Math.abs(a[0] - b[0]) },
    { key: "y", from: corner1, to: corner2, label: "Y", meters: Math.abs(a[1] - b[1]) },
    { key: "z", from: corner2, to: b, label: "Z", meters: Math.abs(a[2] - b[2]) },
  ].filter((s) => s.meters > ZERO_EPS_M);

  const segments: Segment[] = mode === "xyz" && xyzSegments.length > 0 ? xyzSegments : [{ key: "direct", from: a, to: b, meters: directMeters }];

  return (
    <group>
      {segments.map((seg) => (
        <group key={seg.key}>
          <Line points={[new THREE.Vector3(...seg.from), new THREE.Vector3(...seg.to)]} color="#0284c7" lineWidth={2} transparent />
          <MeasureSegmentLabel from={seg.from} to={seg.to} meters={seg.meters} prefix={seg.label} unit={unit} onToggle={toggleMode} />
        </group>
      ))}
    </group>
  );
}
