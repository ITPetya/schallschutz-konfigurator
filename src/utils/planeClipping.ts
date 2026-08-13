import * as THREE from "three";

// Jonas' Fehlerbericht 2026-08-13 (zweite Runde): die bisherige Filterung in
// WallFaceMarkers.tsx/ProjectScene3D.tsx (Face MITTELPUNKT auf der
// weggeschnittenen Seite? -> komplett ausblenden) hat Waende, die vom
// Schnitt nur TEILWEISE betroffen sind, faelschlich KOMPLETT ausgeblendet -
// betrifft jede Flaeche, deren eigene Ausdehnung NICHT parallel zur
// Schnittachse liegt (z. B. Vorne/Hinten/Oben/Unten bei einem R/L-Schnitt:
// ihr Mittelpunkt liegt bei genau 0 auf der Schnittachse, ist also fast
// immer "weggeschnitten", obwohl ein grosser Teil der Flaeche noch sichtbar
// waere). Nur "links"/"rechts" (deren gesamte Flaeche eine KONSTANTE
// Schnittachsen-Koordinate hat) waren mit der reinen Mittelpunkt-Pruefung
// zufaellig richtig. Robuster Test: eine Flaeche nur dann komplett
// ausblenden, wenn ALLE VIER Ecken auf der weggeschnittenen Seite liegen -
// bleibt mindestens eine Ecke auf der behaltenen Seite, bleibt die Flaeche
// gerendert und die (bereits vorhandenen) material.clippingPlanes uebernehmen
// den pixelgenauen Rest, exakt wie bei der echten Container-Geometrie.
export function isRectFullyCutAway(
  position: [number, number, number],
  rotation: [number, number, number],
  width: number,
  height: number,
  plane: THREE.Plane,
): boolean {
  const euler = new THREE.Euler(...rotation);
  const base = new THREE.Vector3(...position);
  const hw = width / 2;
  const hh = height / 2;
  const localCorners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return localCorners.every(([x, y]) => {
    const corner = new THREE.Vector3(x, y, 0).applyEuler(euler).add(base);
    return plane.distanceToPoint(corner) < 0;
  });
}
