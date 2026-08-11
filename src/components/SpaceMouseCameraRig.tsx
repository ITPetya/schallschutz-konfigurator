import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SpaceMouseAxisState } from "../utils/spaceMouseInput";

// Rohwerte liegen laut SpaceMouse-HID-Dokumentation (siehe
// utils/spaceMouseInput.ts) je nach Modell bei voller Auslenkung grob
// zwischen +-350 und +-500 - 400 als Mitte dieses Bereichs zur Normierung
// auf ungefaehr +-1 gewaehlt. Grobe Startannahme, siehe Abschlussbericht:
// Jonas muss nach echtem Hardware-Test sagen, ob sich die Kamera zu
// schnell/langsam bewegt.
const RAW_FULL_SCALE = 400;

// Ruhe-Rauschen echter SpaceMouse-Hardware (Rohwert ist nie exakt 0, auch
// wenn niemand die Kappe beruehrt) - kleine Werte unterhalb dieser Schwelle
// werden ignoriert, damit die Kamera nicht staendig minimal "atmet".
// Ebenfalls eine grobe Startannahme.
const DEADZONE_RAW = 15;

// Geschwindigkeiten bei voller Auslenkung (nach Deadzone/Normierung auf
// +-1) - grobe Startwerte, mit Jonas nach echtem Test abzustimmen:
const PAN_SPEED_M_PER_S = 1.5; // Meter/Sekunde
const DOLLY_SPEED_PER_S = 1.2; // relative Annaeherung/Entfernung pro Sekunde
const ORBIT_SPEED_RAD_PER_S = 1.2; // Radiant/Sekunde

function normalizeAxis(raw: number): number {
  if (Math.abs(raw) < DEADZONE_RAW) return 0;
  const sign = Math.sign(raw);
  const magnitude = (Math.abs(raw) - DEADZONE_RAW) / (RAW_FULL_SCALE - DEADZONE_RAW);
  return sign * THREE.MathUtils.clamp(magnitude, 0, 1.5); // 1.5 statt hartem 1-Clamp: Auslenkungen ueber RAW_FULL_SCALE hinaus (modellabhaengig moeglich) bleiben noch etwas wirksam statt hart abzuschneiden.
}

interface SpaceMouseCameraRigProps {
  axisRef: React.RefObject<SpaceMouseAxisState>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
}

/**
 * Wendet die zwischengespeicherten SpaceMouse-Achsenwerte JEDEN Frame als
 * zusaetzliche Kamera-Deltas an - eine rein additive, immer verfuegbare
 * Ergaenzung zu OrbitControls' Maussteuerung, kein eigener "SpaceMouse-
 * Modus" (Jonas' Vorgabe 2026-08-11: "soll wie eine zusaetzliche Steuerung
 * sein, nicht wie ein Ersatz"). Liest den aktuellen Zustand aus axisRef
 * (von useSpaceMouse.ts's inputreport-Handler befuellt) statt direkt vom
 * HID-Event getrieben zu werden - dadurch bleibt die Bewegung
 * bildwiederholratenunabhaengig glatt, auch wenn HID-Reports haeufiger/
 * unregelmaessiger als Frames eintreffen.
 *
 * Typische Zuordnung (Aufgabenvorgabe): Translation x/y -> Schwenk (Pan),
 * Translation z (druecken/ziehen) -> Zoom (Dolly), Rotation -> Orbit. Die
 * Roll-Achse (rz) hat in OrbitControls' Kugelkoordinaten-Modell keine
 * Entsprechung (keine Kamera-Rollachse um die Blickrichtung) und bleibt
 * deshalb ungenutzt.
 *
 * Mutiert camera.position/controls.target DIREKT statt drei's interne
 * sphericalDelta/scale-Anhaeufung zu nutzen (die sind privat) - drei's
 * eigener OrbitControls-Wrapper ruft controls.update() ohnehin JEDEN Frame
 * selbst auf (siehe node_modules/@react-three/drei/core/OrbitControls.js),
 * das klemmt min/maxDistance und den Polarwinkel automatisch auf Basis der
 * hier gesetzten camera.position - keine doppelte update()-Anwendung noetig
 * oder gewuenscht.
 */
export function SpaceMouseCameraRig({ axisRef, controlsRef, enabled }: SpaceMouseCameraRigProps) {
  const { camera } = useThree();
  const scratch = useRef({
    offset: new THREE.Vector3(),
    spherical: new THREE.Spherical(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    pan: new THREE.Vector3(),
  }).current;

  useFrame((_state, delta) => {
    if (!enabled) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const a = axisRef.current;
    const x = normalizeAxis(a.x);
    const y = normalizeAxis(a.y);
    const z = normalizeAxis(a.z);
    const rx = normalizeAxis(a.rx);
    const ry = normalizeAxis(a.ry);
    if (x === 0 && y === 0 && z === 0 && rx === 0 && ry === 0) return;

    const target = controls.target;

    // Orbit (Rotation): ry -> horizontale Umkreisung (theta), rx -> vertikale
    // Umkreisung (phi), um das aktuelle target.
    if (rx !== 0 || ry !== 0) {
      scratch.offset.copy(camera.position).sub(target);
      scratch.spherical.setFromVector3(scratch.offset);
      scratch.spherical.theta -= ry * ORBIT_SPEED_RAD_PER_S * delta;
      scratch.spherical.phi -= rx * ORBIT_SPEED_RAD_PER_S * delta;
      const EPS = 1e-3;
      scratch.spherical.phi = THREE.MathUtils.clamp(scratch.spherical.phi, EPS, Math.PI - EPS);
      scratch.spherical.makeSafe();
      scratch.offset.setFromSpherical(scratch.spherical);
      camera.position.copy(target).add(scratch.offset);
    }

    // Dolly (Zoom): z (druecken/ziehen) veraendert den Abstand zum target,
    // geklemmt auf OrbitControls' eigene min/maxDistance.
    if (z !== 0) {
      scratch.offset.copy(camera.position).sub(target);
      const distance = scratch.offset.length();
      const nextDistance = THREE.MathUtils.clamp(
        distance * (1 - z * DOLLY_SPEED_PER_S * delta),
        controls.minDistance,
        controls.maxDistance,
      );
      scratch.offset.setLength(nextDistance);
      camera.position.copy(target).add(scratch.offset);
    }

    // Pan: x/y verschieben Kamera UND target gemeinsam entlang der
    // kamera-lokalen Rechts-/Auf-Achse (steht senkrecht zur aktuellen
    // Blickrichtung, dreht sich also mit der Kamera mit).
    if (x !== 0 || y !== 0) {
      scratch.right.setFromMatrixColumn(camera.matrix, 0);
      scratch.up.setFromMatrixColumn(camera.matrix, 1);
      scratch.pan
        .set(0, 0, 0)
        .addScaledVector(scratch.right, -x * PAN_SPEED_M_PER_S * delta)
        .addScaledVector(scratch.up, y * PAN_SPEED_M_PER_S * delta);
      camera.position.add(scratch.pan);
      target.add(scratch.pan);
    }
  });

  return null;
}
