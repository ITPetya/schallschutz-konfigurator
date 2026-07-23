// SAT-Kollisionstest fuer rotierte Rechtecke (siehe docs/baugruppen-
// architektur.md - bewusst kein allgemeiner 3D-Physik-Loeser, weil
// Container-Grundrisse achsparallele Rechtecke auf einer gemeinsamen
// Bodenebene sind, fuer die SAT exakt und billig ist, auch bei freier
// Rotation). Einheiten sind absichtlich generisch (hier: Millimeter, wie
// ueberall im Datenmodell) - die Funktionen selbst rechnen nicht um.
export interface OrientedRect {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  rotationDeg: number;
}

type Point = [number, number];

function corners(r: OrientedRect, inflate: number): Point[] {
  const hw = r.halfWidth + inflate;
  const hd = r.halfDepth + inflate;
  const rad = (r.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const local: Point[] = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  return local.map(([lx, lz]) => [r.x + lx * cos - lz * sin, r.z + lx * sin + lz * cos]);
}

// Ein Rechteck hat nur 2 unterschiedliche Kanten-Normalen (gegenueber-
// liegende Kanten sind parallel) - die reichen als Testachsen.
function axesOf(pts: Point[]): Point[] {
  const axes: Point[] = [];
  for (let i = 0; i < 2; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const nx = -(y2 - y1);
    const nz = x2 - x1;
    const len = Math.hypot(nx, nz) || 1;
    axes.push([nx / len, nz / len]);
  }
  return axes;
}

function project(pts: Point[], axis: Point): [number, number] {
  const dots = pts.map(([x, z]) => x * axis[0] + z * axis[1]);
  return [Math.min(...dots), Math.max(...dots)];
}

// clearance ist der geforderte MINDESTABSTAND zwischen den beiden echten
// Rechtecken (nicht nur "beruehren sich nicht") - wird als halbe Aufblaehung
// auf beide Rechtecke verteilt, damit der volle clearance-Wert dazwischen
// frei bleibt.
export function rectsOverlap(a: OrientedRect, b: OrientedRect, clearance = 0): boolean {
  const inflate = clearance / 2;
  const cornersA = corners(a, inflate);
  const cornersB = corners(b, inflate);
  const axes = [...axesOf(cornersA), ...axesOf(cornersB)];
  for (const axis of axes) {
    const [minA, maxA] = project(cornersA, axis);
    const [minB, maxB] = project(cornersB, axis);
    if (maxA < minB || maxB < minA) return false;
  }
  return true;
}
