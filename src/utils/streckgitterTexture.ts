import * as THREE from "three";

// Streckgitter-Muster (Jonas' Referenzfoto 2026-07-29) als prozedural
// erzeugte, nahtlos kachelnde Canvas-Textur statt echter 3D-Rautengeometrie -
// bei ~1cm Maschenweite waere eine ganze Container-Innenwand als echte
// Geometrie zehntausende Einzelrauten (Performance-Aufwand ohne sichtbaren
// Gewinn bei ueblicher Betrachtungsdistanz im Konfigurator). EIN Kachel-
// Quadrat mit den beiden Diagonalen ("X") ergibt beim nahtlosen Wiederholen
// automatisch das durchgehende Rautengitter (jede Kachel = eine Raute).
const TILE_PX = 128;
const STRAND_RATIO = 0.34; // Strangbreite relativ zur Kachelgroesse, nach Referenzfoto

function drawX(ctx: CanvasRenderingContext2D, size: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  // Ecken-Umbruch: an allen 4 Kachel-Ecken ist nur eine Strang-HAELFTE
  // sichtbar, die andere Haelfte kommt beim Kacheln von der Nachbarkachel -
  // ohne diese Ecken-Kreise wirken die Strang-Enden dort spitz statt rund.
  for (const [x, y] of [[0, 0], [size, 0], [0, size], [size, size]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, width / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

interface StreckgitterMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

let cached: StreckgitterMaps | null = null;

// Erzeugt (einmalig, gecacht) Diffuse- und Bump-Textur des Streckgitter-
// Musters. Jeder Aufrufer klont beide Texturen fuer sein eigenes
// repeat/wrapS/wrapT (siehe InteriorCladding.tsx) - three.js teilt sich bei
// geklonten Texturen mit gleicher .source die tatsaechliche GPU-Textur,
// dadurch bleibt das trotz vieler Wandfelder EINE einzige Textur im Speicher.
export function getStreckgitterMaps(): StreckgitterMaps {
  if (cached) return cached;

  const strandWidth = TILE_PX * STRAND_RATIO * 0.5;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = colorCanvas.height = TILE_PX;
  const colorCtx = colorCanvas.getContext("2d")!;
  colorCtx.fillStyle = "#8b8f94"; // Loch-/Hintergrundflaeche, dezent verschattet
  colorCtx.fillRect(0, 0, TILE_PX, TILE_PX);
  drawX(colorCtx, TILE_PX, "#d8dadd", strandWidth); // Metall-Straenge, hell/silbrig

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = TILE_PX;
  const bumpCtx = bumpCanvas.getContext("2d")!;
  bumpCtx.fillStyle = "#202020"; // Loch = zurueckgesetzt
  bumpCtx.fillRect(0, 0, TILE_PX, TILE_PX);
  drawX(bumpCtx, TILE_PX, "#f2f2f2", strandWidth); // Strang = erhaben

  const map = new THREE.CanvasTexture(colorCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  for (const tex of [map, bumpMap]) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = tex === map ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  }

  cached = { map, bumpMap };
  return cached;
}

// Klont Diffuse+Bump-Textur mit dem passenden repeat fuer ein Wandfeld
// gegebener Groesse (Meter) bei fester Maschenweite (Jonas' Vorgabe
// 2026-07-29: "Maschenbreite von 1cm").
const CELL_SIZE_M = 0.01;

export function createStreckgitterMaterial(widthM: number, heightM: number): THREE.MeshStandardMaterial {
  const { map, bumpMap } = getStreckgitterMaps();
  const repeatX = widthM / CELL_SIZE_M;
  const repeatY = heightM / CELL_SIZE_M;

  const clonedMap = map.clone();
  clonedMap.needsUpdate = true;
  clonedMap.repeat.set(repeatX, repeatY);

  const clonedBump = bumpMap.clone();
  clonedBump.needsUpdate = true;
  clonedBump.repeat.set(repeatX, repeatY);

  return new THREE.MeshStandardMaterial({
    map: clonedMap,
    bumpMap: clonedBump,
    bumpScale: 0.4,
    roughness: 0.55,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });
}
