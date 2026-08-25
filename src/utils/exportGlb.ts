// GLB-Export (2026-08-25, Jonas' Vorgabe: "das Modell soll sich ausserhalb
// der Webseite/des Konfigurators oeffnen lassen" - fuer reine Betrachtung,
// nicht zur Weiterbearbeitung in CAD, siehe auch STEP-Diskussion an anderer
// Stelle). GLB statt separatem .gltf+.bin+Texturen: EINE Datei, einfacher
// weiterzugeben. Bewusst NUR ein duenner Wrapper um three.js' eigenen
// GLTFExporter - keine eigene Geometrie-Konvertierung noetig, die App
// arbeitet ohnehin schon komplett mit dreieckigen BufferGeometries (three-
// bvh-csg's Ergebnis ist bereits ein normales THREE.Mesh).
//
// Windows hat mit der App "3D-Viewer" bereits einen eingebauten GLB-
// Betrachter (kein Zusatzprogramm noetig) - genau das vom Nutzer
// beschriebene "ausserhalb der Seite oeffnen".

import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import * as THREE from "three";

const exporter = new GLTFExporter();

// Manche Objekte innerhalb der exportierten Gruppe sind reine Interaktions-
// Hitboxen, kein echter Modellbestandteil (z.B. ProjectScene3D.tsx's
// unsichtbares/halbtransparentes Grundriss-Rechteck pro Instanz, dort mit
// genau diesem Namen markiert) - werden hier aus einer KOPIE des Baums
// entfernt, bevor exportiert wird, damit die eigentliche interaktive Szene
// unangetastet bleibt.
const EXCLUDE_NAME = "export-exclude";

function stripExcluded(root: THREE.Object3D): THREE.Object3D {
  const clone = root.clone(true);
  const toRemove: THREE.Object3D[] = [];
  clone.traverse((obj) => {
    if (obj.name === EXCLUDE_NAME) toRemove.push(obj);
  });
  for (const obj of toRemove) obj.parent?.remove(obj);
  return clone;
}

// Jonas' Fehlerbericht 2026-08-25 ("weisse Flaechen, nur von einer Seite/von
// aussen sichtbar, auch am Dach, auch ohne Oeffnungen"): nach Analyse der
// tatsaechlich exportierten .glb (163 Materialien direkt inspiziert) stellte
// sich heraus, dass KEIN einziges Material tatsaechlich weiss ist - alle
// Farben sind korrekt. Der eigentliche Grund: 83 der Materialien (die
// C-Klemmschienen aus InteriorCladding.tsx, "roughness={0.5} metalness={0.7}")
// haben recht hohe Metallizitaet. Im Web-Viewer sieht das dank der fein
// abgestimmten HDRI-Beleuchtung (siehe Scene.tsx/ProjectScene3D.tsx) gut
// aus - ein externer GLB-Viewer (z.B. Windows "3D-Viewer") nutzt aber seine
// EIGENE, unbekannte, meist helle generische Beleuchtung, unter der hohe
// Metallizitaet zu blendend hellen, stark winkelabhaengigen Reflexionen
// fuehrt ("nur von einer Seite sichtbar" = Spiegel-Highlight, kein
// tatsaechliches weisses Material). Fix: fuer den EXPORT (nicht fuer die
// interaktive Szene, die bleibt unangetastet) wird die Metallizitaet aller
// Materialien gekappt - der Export dient laut Jonas' eigener Vorgabe ohnehin
// nur der reinen Betrachtung, nicht der pixelgenauen Wiedergabe der
// In-App-Optik, daher ist eine matte, beleuchtungsunabhaengige Darstellung
// hier die sicherere Wahl als die Original-PBR-Werte.
const EXPORT_MAX_METALNESS = 0.15;

function flattenMetalness(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // WICHTIG: Object3D.clone()/Mesh.copy() teilen Material/Geometrie NUR per
    // Referenz (three.js-eigenes Verhalten, kein Deep-Clone) - obj.material
    // ist hier trotz stripExcluded()'s root.clone(true) noch DASSELBE Objekt
    // wie in der interaktiven Live-Szene. Ohne dieses .clone() wuerde das
    // Kappen der Metallizitaet fuer den Export versehentlich auch den
    // sichtbaren 3D-Viewer veraendern (die C-Schienen wuerden dort ploetzlich
    // ihren Glanz verlieren).
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial && mat.metalness > EXPORT_MAX_METALNESS) {
          const clone = mat.clone();
          clone.metalness = EXPORT_MAX_METALNESS;
          return clone;
        }
        return mat;
      });
    } else if (obj.material instanceof THREE.MeshStandardMaterial && obj.material.metalness > EXPORT_MAX_METALNESS) {
      const clone = obj.material.clone();
      clone.metalness = EXPORT_MAX_METALNESS;
      obj.material = clone;
    }
  });
}

/**
 * Exportiert die uebergebene Szene/Gruppe als GLB-Blob. `root` sollte NUR
 * die exportwuerdige Geometrie enthalten (siehe exportGroupRef in
 * Scene.tsx/ProjectScene3D.tsx) - Hilfslinien, Gizmos, Markierungen etc.
 * gehoeren nicht mit hinein.
 */
export function exportGroupAsGlb(root: THREE.Object3D): Promise<Blob> {
  const exportRoot = stripExcluded(root);
  flattenMetalness(exportRoot);
  return new Promise((resolve, reject) => {
    exporter.parse(
      exportRoot,
      (result) => {
        // binary:true (unten) liefert immer einen ArrayBuffer, nie ein
        // JSON-Objekt - der Typ-Check ist nur fuer TypeScript, da
        // GLTFExporter's Callback-Typ beide Faelle zulaesst.
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          reject(new Error("GLTFExporter hat kein binaeres Ergebnis geliefert."));
        }
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
      { binary: true },
    );
  });
}
