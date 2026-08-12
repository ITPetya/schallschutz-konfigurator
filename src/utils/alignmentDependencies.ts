import type { AlignmentAxis, AlignmentDependency, AlignmentFaceRef, ContainerInstance } from "../config/projectTypes";

const MM_TO_M = 1 / 1000;

// Verschoben aus WorkspacePage.tsx (vorher nur fuer die alte Dropdown-
// Ausrichten-Sektion gebraucht, jetzt auch hier fuer den Solver): weil
// rotationY immer ein Vielfaches von 90 Grad ist (siehe handleRotate), bleibt
// der Grundriss nach der Rotation IMMER achsparallel zur Welt - bei 90/270
// Grad tauschen Laenge und Breite nur ihre Rolle bezueglich der Welt-Achsen.
export function worldHalfExtents(inst: ContainerInstance): { hw: number; hd: number } {
  const swapped = Math.abs(inst.rotationY % 180) === 90;
  return swapped
    ? { hw: inst.config.size.width / 2, hd: inst.config.size.length / 2 }
    : { hw: inst.config.size.length / 2, hd: inst.config.size.width / 2 };
}

function halfExtentOnAxis(inst: ContainerInstance, axis: AlignmentAxis): number {
  const { hw, hd } = worldHalfExtents(inst);
  return axis === "x" ? hw : hd;
}

// Weltposition (mm) der Ebene, auf der eine Flaeche liegt - Container-
// Mittelpunkt plus/minus (je nach Vorzeichen) den halben Umfang auf dieser
// Achse.
function facePlaneMm(inst: ContainerInstance, face: Pick<AlignmentFaceRef, "axis" | "sign">): number {
  return inst.position[face.axis] + face.sign * halfExtentOnAxis(inst, face.axis);
}

export interface AlignmentFacePoint {
  instanceId: string;
  axis: AlignmentAxis;
  sign: 1 | -1;
  // Welt-Meter, fuer die klickbare 3D-Markierung (AlignmentFaceMarkers.tsx) -
  // Mittelpunkt der Flaeche in halber Container-Hoehe.
  position: [number, number, number];
  // Tatsaechliche Breite/Hoehe der Flaeche in Welt-Metern (Jonas' Vorgabe
  // 2026-08-12: "die ganze Flaeche soll klickbar sein") - AlignmentFaceMarkers.tsx
  // nutzt das fuer einen Klick-Bereich in Flaechengroesse statt eines kleinen
  // Punktes in der Mitte.
  width: number;
  height: number;
}

// Klickbare Punkte fuer die vier Seitenflaechen JEDES Containers (Jonas'
// Vorgabe 2026-08-12: "zwei Flaechen auswaehlen, aehnlich wie beim Messen,
// nur die, die man sieht"). Nur die vier vertikalen Seiten, keine Dach-/
// Bodenflaeche - "Ausrichten" war schon in der alten Dropdown-Variante auf
// die horizontale Bodenplan-Anordnung beschraenkt.
export function computeAlignmentFaces(instances: ContainerInstance[]): AlignmentFacePoint[] {
  const faces: AlignmentFacePoint[] = [];
  for (const inst of instances) {
    const { hw, hd } = worldHalfExtents(inst);
    const xM = inst.position.x * MM_TO_M;
    const zM = inst.position.z * MM_TO_M;
    const yM = (inst.config.size.height / 2) * MM_TO_M;
    const heightM = inst.config.size.height * MM_TO_M;
    const xFaceWidthM = hd * 2 * MM_TO_M; // Seitenflaeche (X-Normale) erstreckt sich ueber die Tiefe.
    const zFaceWidthM = hw * 2 * MM_TO_M; // Stirnflaeche (Z-Normale) erstreckt sich ueber die Laenge.
    faces.push({ instanceId: inst.id, axis: "x", sign: 1, position: [xM + hw * MM_TO_M, yM, zM], width: xFaceWidthM, height: heightM });
    faces.push({ instanceId: inst.id, axis: "x", sign: -1, position: [xM - hw * MM_TO_M, yM, zM], width: xFaceWidthM, height: heightM });
    faces.push({ instanceId: inst.id, axis: "z", sign: 1, position: [xM, yM, zM + hd * MM_TO_M], width: zFaceWidthM, height: heightM });
    faces.push({ instanceId: inst.id, axis: "z", sign: -1, position: [xM, yM, zM - hd * MM_TO_M], width: zFaceWidthM, height: heightM });
  }
  return faces;
}

// Welche Achsen eines Containers gerade durch eine Abhaengigkeit
// (als "target") gesteuert werden - WorkspacePage.tsx nutzt das, um Ziehen
// entlang dieser Achse zu sperren (Jonas' Vorgabe 2026-08-12: "Ziehen
// gesperrt").
export function lockedAxesFor(instanceId: string, dependencies: AlignmentDependency[]): Set<AlignmentAxis> {
  const axes = new Set<AlignmentAxis>();
  for (const dep of dependencies) {
    if (dep.target.instanceId === instanceId) axes.add(dep.target.axis);
  }
  return axes;
}

// Loest alle Abhaengigkeiten auf und liefert NEUE ContainerInstance-Objekte
// mit den vom Solver bestimmten Positionen zurueck (Jonas' Vorgabe
// 2026-08-12: "Live-Abhaengigkeit" - folgt automatisch, wenn sich der
// Referenz-Container spaeter bewegt/dreht/aendert, da hw/hd und die
// Referenz-Position bei jedem Aufruf frisch aus den aktuellen Instanzen
// gelesen werden). Topologische Aufloesung: ein target kann erst korrekt
// berechnet werden, NACHDEM seine eigene reference feststeht (die selbst
// wieder target einer anderen Abhaengigkeit sein kann, z. B. C haengt an B,
// B haengt an A) - mehrere Durchlaeufe, bis sich nichts mehr aendert.
// Iterationslimit als Schutz vor echten Zyklen (A haengt letztlich von sich
// selbst ab) - das Ergebnis ist dann per Definition nicht wohldefiniert
// (schwankt/bricht einfach nach N Durchlaeufen ab, kein Absturz/keine
// Endlosschleife); Kreisabhaengigkeiten sollten in der UI ohnehin vermieden
// werden, es gibt aktuell keine explizite Erkennung/Warnung dafuer.
export function resolveAlignmentDependencies(
  instances: ContainerInstance[],
  dependencies: AlignmentDependency[],
): ContainerInstance[] {
  if (dependencies.length === 0) return instances;

  const byId = new Map(instances.map((inst) => [inst.id, { ...inst, position: { ...inst.position } }]));

  // Pro (instanceId, axis) hoechstens die ZULETZT in der Liste stehende
  // Abhaengigkeit anwenden - bei zwei Abhaengigkeiten auf DERSELBEN Achse
  // desselben Containers gewinnt deterministisch die zuletzt erstellte
  // (kein explizites Konflikt-UI). Mehrere Abhaengigkeiten pro Container auf
  // VERSCHIEDENEN Achsen (der Normalfall, siehe Antwort 2026-08-12) sind
  // davon nicht betroffen, jede Achse hat ihren eigenen Map-Key.
  const relevant = new Map<string, AlignmentDependency>();
  for (const dep of dependencies) {
    if (!byId.has(dep.target.instanceId) || !byId.has(dep.reference.instanceId)) continue;
    relevant.set(`${dep.target.instanceId}:${dep.target.axis}`, dep);
  }

  const maxIterations = relevant.size + 1;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;
    for (const dep of relevant.values()) {
      const target = byId.get(dep.target.instanceId)!;
      const reference = byId.get(dep.reference.instanceId)!;
      const referenceFacePlane = facePlaneMm(reference, dep.reference);
      const targetFacePlane =
        dep.mode === "mate" ? referenceFacePlane + dep.reference.sign * dep.distanceMm : referenceFacePlane + dep.distanceMm;
      const nextValue = targetFacePlane - dep.target.sign * halfExtentOnAxis(target, dep.target.axis);
      if (Math.abs(target.position[dep.target.axis] - nextValue) > 0.01) {
        target.position[dep.target.axis] = nextValue;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return instances.map((inst) => byId.get(inst.id) ?? inst);
}
