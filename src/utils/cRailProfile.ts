import * as THREE from "three";

// Eigenkonstruktion (Jonas' Zeichnung 2026-07-29): C-Klemmschiene zur
// Befestigung von Aggregaten/Halterungen an den Streckgitter-Innenwaenden.
// Alle Masse in MILLIMETERN wie in der Zeichnung, hier zentral in Meter
// umgerechnet.
const MM = 1 / 1000;
const WIDTH = 46 * MM; // Aussenbreite (Ruecken der Schiene)
const HEIGHT = 33 * MM; // Schenkelhoehe bis zum Lippen-Ansatz
const THICKNESS = 2 * MM; // Blechstaerke, durchgehend
const LIP_LENGTH = 11.6 * MM; // Laenge der eingerollten Lippe
const LIP_ANGLE = (49 * Math.PI) / 180; // Lippen-Winkel gegen die Senkrechte (Schenkel-Richtung)

// Mittellinie der Schiene im Querschnitt (u = quer zur Wand, d = Tiefe ab
// Wandinnenflaeche in den Raum hinein) - von der linken zur rechten
// Lippenspitze, EIN durchgehender offener Streifen (die beiden Lippen
// beruehren sich nicht, das ist der Einschub-Schlitz).
function centerline(): THREE.Vector2[] {
  const hw = WIDTH / 2;
  const legTop = new THREE.Vector2(-hw, HEIGHT);
  // Jonas' Fehlerbericht 2026-07-29: "die Backen sind in die falsche
  // Richtung gekantet, nach aussen statt nach innen" - die Lippe darf vom
  // Schenkel-Ende nicht einfach geradlinig weiter nach aussen/oben laufen
  // (das war der vorherige Versuch, negatives Vorzeichen fehlte), sondern
  // muss zurueck in Richtung Wand/Ruecken haken (klassische Einhänge-Nase
  // einer Klemm-/Halfen-Schiene, die einen Schraubenkopf von HINTEN
  // untergreift) - deshalb hier -cos statt +cos: die Lippe wandert beim
  // Einwaertsdrehen wieder nach UNTEN (Richtung Wand), nicht weiter nach oben.
  const lipDir = new THREE.Vector2(Math.sin(LIP_ANGLE), -Math.cos(LIP_ANGLE));
  const leftTip = legTop.clone().addScaledVector(lipDir, LIP_LENGTH);

  return [
    leftTip,
    legTop,
    new THREE.Vector2(-hw, 0),
    new THREE.Vector2(hw, 0),
    new THREE.Vector2(hw, HEIGHT),
    new THREE.Vector2(-leftTip.x, leftTip.y), // rechte Lippenspitze - an u=0 gespiegelt
  ];
}

// Verwandelt eine offene Mittellinie in eine geschlossene Blechkontur
// (konstante Wandstaerke) - klassisches 2D-Stroke/Miter-Verfahren: an jedem
// inneren Knick wird der Versatz-Punkt aus dem gemittelten, auf die
// Winkelhalbierende projizierten Normalenvektor berechnet, an den beiden
// freien Enden (Lippenspitzen) nur die einzelne Segment-Normale verwendet.
function strokeOutline(points: THREE.Vector2[], thickness: number): THREE.Shape {
  const half = thickness / 2;
  const n = points.length;

  function segNormal(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    const dir = b.clone().sub(a).normalize();
    return new THREE.Vector2(-dir.y, dir.x);
  }

  function offsetAt(i: number, sign: 1 | -1): THREE.Vector2 {
    const p = points[i];
    const prev = i > 0 ? segNormal(points[i - 1], points[i]) : null;
    const next = i < n - 1 ? segNormal(points[i], points[i + 1]) : null;
    if (prev && next) {
      const avg = prev.clone().add(next).normalize();
      const cos = avg.dot(next);
      const dist = half / Math.max(cos, 0.2); // clamp gegen extreme Miter-Spitzen bei sehr spitzen Knicken
      return p.clone().addScaledVector(avg, sign * dist);
    }
    const n0 = (prev ?? next)!;
    return p.clone().addScaledVector(n0, sign * half);
  }

  const outer = points.map((_, i) => offsetAt(i, 1));
  const inner = points.map((_, i) => offsetAt(i, -1));

  const shape = new THREE.Shape();
  shape.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < n; i++) shape.lineTo(outer[i].x, outer[i].y);
  for (let i = n - 1; i >= 0; i--) shape.lineTo(inner[i].x, inner[i].y);
  shape.closePath();
  return shape;
}

let cachedShape: THREE.Shape | null = null;

// Liefert die 2D-Querschnittsflaeche (Meter) - X = quer zur Wand, Y = Tiefe
// ab Wandinnenflaeche in den Raum. Wird per ExtrudeGeometry entlang der
// Wandhoehe gezogen, siehe InteriorCladding.tsx.
export function getCRailProfileShape(): THREE.Shape {
  if (!cachedShape) cachedShape = strokeOutline(centerline(), THICKNESS);
  return cachedShape;
}

// Groesste Tiefe (Ruecken bis Schenkel-Oberkante) - die Lippe selbst haekt
// wieder ZURUECK Richtung Wand, ragt also nicht mehr darueber hinaus.
export const C_RAIL_DEPTH_M = HEIGHT;
export const C_RAIL_PITCH_M = 0.558; // Achse-zu-Achse, Jonas' Vorgabe 2026-07-29
export const C_RAIL_WIDTH_M = WIDTH; // Aussenbreite - fuer den Wandausschnitt (siehe railLayout.ts)
export const C_RAIL_SHEET_THICKNESS_M = THICKNESS; // Blechstaerke - fuer die Einsenk-Tiefe im Wandausschnitt

// Jonas' Fehlerbericht 2026-08-10: die Schiene lag bisher nur mit ihrem
// Ruecken (2mm) versenkt, ragte mit dem Rest ihrer vollen Tiefe (~31mm) in
// den Raum hinein - er will sie stattdessen BUENDIG mit der Innenwand, d.h.
// die GESAMTE Schienentiefe muss im Wandausschnitt verschwinden (die
// entstehende Ausnehmung IN der Wand ist dabei genau der "Ausschnitt im
// Innenwandblech", durch den die Schiene von innen nutzbar bleibt). +THICKNESS
// als Sicherheitsmarge, weil strokeOutline() an der aeusseren Gehrungsecke
// (Schenkel-Oberkante) minimal ueber HEIGHT hinaus ausschlaegt.
export const C_RAIL_FLUSH_RECESS_M = C_RAIL_DEPTH_M + THICKNESS;

// Tatsaechlich nutzbare Versenktiefe fuer eine Wand konkreter Staerke -
// gedeckelt, damit bei sehr duennen Waenden kein Loch nach aussen entsteht
// (mind. 5mm massive Restwand aussen stehen bleiben, nie weniger als die
// alte reine Rueckenplatten-Tiefe). Von Wall.tsx (Ausschnitt) UND
// InteriorCladding.tsx (Schienen-Position) gemeinsam genutzt, damit beide
// IMMER exakt dieselbe Tiefe verwenden.
export function getRailRecessDepthM(wallThicknessM: number): number {
  const maxByWall = wallThicknessM - 0.005;
  return Math.min(C_RAIL_FLUSH_RECESS_M, Math.max(maxByWall, C_RAIL_SHEET_THICKNESS_M));
}
