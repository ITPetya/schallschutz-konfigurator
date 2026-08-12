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

// Jonas' Fehlerbericht 2026-08-12: "es ruckelt an Stellen noch" - Zeitkonstante
// (Sekunden) fuer ein exponentielles Glaetten der normierten Achsenwerte
// zwischen aufeinanderfolgenden Frames. Rohe HID-Reports treffen unregelmaessig
// und teils in kurzen Buendeln ein (nicht synchron zu requestAnimationFrame),
// wodurch der zuletzt gecachte Wert innerhalb eines Frames sprunghaft wirken
// kann. Klein genug gewaehlt, dass keine spuerbare Eingabeverzoegerung
// entsteht, aber gross genug, um diese Sprünge sichtbar zu daempfen.
const SMOOTHING_TAU_S = 0.06;

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
  // Jonas' Vorgabe 2026-08-12: ueber das SpaceMouse-Einstellungen-Panel
  // einstellbarer Multiplikator (siehe spaceMouseSettingsStore.ts) - 1 = die
  // obigen PAN_SPEED_M_PER_S/DOLLY_SPEED_PER_S/ORBIT_SPEED_RAD_PER_S-Werte
  // unveraendert, wirkt gleichmaessig auf alle drei Bewegungsarten.
  sensitivity: number;
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
export function SpaceMouseCameraRig({ axisRef, controlsRef, enabled, sensitivity }: SpaceMouseCameraRigProps) {
  const { camera } = useThree();
  const scratch = useRef({
    offset: new THREE.Vector3(),
    spherical: new THREE.Spherical(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    pan: new THREE.Vector3(),
    // Geglaettete Achsenwerte (Jonas' Fehlerbericht 2026-08-12: "es ruckelt
    // an Stellen noch") - siehe SMOOTHING_TAU_S weiter oben. Persistiert
    // ueber Frames hinweg in diesem Ref, nicht neu angelegt pro Aufruf.
    smoothed: { x: 0, y: 0, z: 0, rx: 0, ry: 0 },
  }).current;

  useFrame((_state, delta) => {
    if (!enabled) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const a = axisRef.current;
    const s = scratch.smoothed;
    // Exponentielles Glaetten statt den rohen, zuletzt gecachten HID-Wert
    // direkt zu uebernehmen - HID-Reports treffen unregelmaessig/in Buendeln
    // ein (nicht synchron zu requestAnimationFrame), was den zwischen zwei
    // Frames gecachten Wert sonst sprunghaft wirken lassen kann.
    const alpha = 1 - Math.exp(-delta / SMOOTHING_TAU_S);
    s.x += (normalizeAxis(a.x) - s.x) * alpha;
    s.y += (normalizeAxis(a.y) - s.y) * alpha;
    s.z += (normalizeAxis(a.z) - s.z) * alpha;
    s.rx += (normalizeAxis(a.rx) - s.rx) * alpha;
    s.ry += (normalizeAxis(a.ry) - s.ry) * alpha;

    // Erst NACH dem Glaetten pruefen, ob ueberhaupt noch etwas zu tun ist -
    // sonst wuerde ein frisch losgelassener Griff die Kamera mit dem
    // zuletzt geglaetteten (noch nicht auf 0 abgeklungenen) Wert
    // einfrieren, statt sanft auszurollen.
    const EPS = 1e-4;
    if (Math.abs(s.x) < EPS && Math.abs(s.y) < EPS && Math.abs(s.z) < EPS && Math.abs(s.rx) < EPS && Math.abs(s.ry) < EPS) return;

    const x = s.x;
    const y = s.y;
    const z = s.z;
    const rx = s.rx;
    const ry = s.ry;
    const target = controls.target;

    // Orbit (Rotation): ry -> horizontale Umkreisung (theta), rx -> vertikale
    // Umkreisung (phi), um das aktuelle target.
    if (rx !== 0 || ry !== 0) {
      scratch.offset.copy(camera.position).sub(target);
      scratch.spherical.setFromVector3(scratch.offset);
      scratch.spherical.theta -= ry * ORBIT_SPEED_RAD_PER_S * sensitivity * delta;
      scratch.spherical.phi -= rx * ORBIT_SPEED_RAD_PER_S * sensitivity * delta;
      const EPS_POLE = 1e-3;
      scratch.spherical.phi = THREE.MathUtils.clamp(scratch.spherical.phi, EPS_POLE, Math.PI - EPS_POLE);
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
        distance * (1 - z * DOLLY_SPEED_PER_S * sensitivity * delta),
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
      // Jonas' Fehlerbericht 2026-08-12 ("ruckelt an Stellen"): wurde rx/ry
      // oben in DIESEM Frame veraendert, spiegelt camera.matrix noch die
      // Blickrichtung VOR dieser Aenderung wider - drei aktualisiert
      // Matrix/Quaternion erst beim naechsten controls.update()/Rendern.
      // Ohne dieses Nachziehen wuerde Pan bei gleichzeitigem Drehen+
      // Schwenken (haeufige SpaceMouse-Bewegung) mit der um einen Frame
      // veralteten Richtung rechnen und dadurch sichtbar wackeln. lookAt()
      // berechnet exakt dasselbe, was OrbitControls' eigenes update() ohnehin
      // gleich danach nochmal (mit identischem Ergebnis) macht - hier nur
      // vorgezogen, damit die folgende Rechts-/Auf-Achsen-Extraktion aus
      // camera.matrix bereits aktuell ist.
      if (rx !== 0 || ry !== 0) {
        camera.lookAt(target);
        camera.updateMatrix();
      }
      scratch.right.setFromMatrixColumn(camera.matrix, 0);
      scratch.up.setFromMatrixColumn(camera.matrix, 1);
      scratch.pan
        .set(0, 0, 0)
        .addScaledVector(scratch.right, -x * PAN_SPEED_M_PER_S * sensitivity * delta)
        .addScaledVector(scratch.up, y * PAN_SPEED_M_PER_S * sensitivity * delta);
      camera.position.add(scratch.pan);
      target.add(scratch.pan);
    }
  });

  return null;
}
