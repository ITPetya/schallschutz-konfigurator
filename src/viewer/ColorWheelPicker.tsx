import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RAL_SPECIAL_COLORS } from "../constants/ralColors";

interface ColorWheelPickerProps {
  value: string; // aktueller Hex-Wert (immer ein echter RAL-Ton, siehe entry.tsx)
  onChange: (hex: string) => void;
  size?: number;
}

// Jonas' Vorgabe 2026-08-19 (per Skizze): statt einer Liste/eines Dropdowns
// ein "Farbrad" - ein farbiger Kreis-Button, der beim Hover einen Bogen
// (40-50% eines Kreises) mit Regenbogenverlauf ausfahren laesst, auf dem man
// per Klick/Ziehen eine Farbe auswaehlt.
//
// Erste Fassung bildete den Bogen ueber einen synthetischen HSL-Farbton ab -
// Jonas' Fehlerbericht: "da fehlen die ganzen Schwarztoene etc." (echte
// Grau-/Schwarz-/Braun-/Weisstoene haben kaum sinnvollen Farbton). Jetzt EIN
// Bogensegment PRO echtem RAL-Ton (RAL_SPECIAL_COLORS, in ralColors.ts
// bereits nach Nummer sortiert), mit dessen echter Fuellfarbe.
//
// Jonas' Fehlerbericht 2026-08-19 (nach zwei weiteren Live-Tests): "der
// innere Kreis muss groesser, der aeussere aber nicht mehr so viel" (Bogen
// kollidierte weiter mit dem Trigger-Button) - ARC_GAP deutlich hoch,
// ARC_BAND_WIDTH dafuer wieder etwas runter, damit der Aussenradius nicht
// mitwaechst. Ausserdem: "die RAL-Toene wo der Cursor gerade ist sollen
// deutlich mehr Platz haben, damit man genau aussuchen kann, alle anderen
// so duenne Slices wie jetzt" - eine Hover-Vergroesserung (wie das macOS-
// Dock-Zoom-Prinzip): Segmente nahe am Cursor bekommen ueber eine
// Gauss-Gewichtung spuerbar mehr Gradanteil vom GLEICHBLEIBENDEN
// Gesamt-Bogen zugewiesen, weit entfernte bleiben bei ihrer duennen
// Basisbreite - die Summe aller Breiten fuellt immer exakt den Bogen.
// "Ecken runden" - runde Kappen an beiden Bogen-Enden statt scharfer Kanten.
const PALETTE = RAL_SPECIAL_COLORS;

const ARC_START_DEG = -80;
const ARC_END_DEG = 80;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG;
const ARC_BAND_WIDTH = 55;
const ARC_GAP = 50; // Abstand zwischen Trigger-Kreis-Rand und Bogen-Innenkante.
const CLOSE_DELAY_MS = 220;
// Wie viele Nachbar-Segmente um den Cursor herum spuerbar mitwachsen
// (Gauss-Streuung in Segment-Einheiten) und wie stark der Cursor-nahe
// Bereich gegenueber der Basisbreite gewichtet wird.
const HOVER_SIGMA = 3.2;
const HOVER_MAGNIFY = 8;

// Standard-Mathe-Winkel (0deg = rechts, waechst gegen den Uhrzeigersinn wie
// im Einheitskreis "nach oben") auf SVG-Koordinaten (y waechst nach unten)
// umgerechnet - deshalb das Minus vor sin().
function polarToXY(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

const UNIFORM_STEP = ARC_SWEEP_DEG / PALETTE.length;

export function ColorWheelPicker({ value, onChange, size = 30 }: ColorWheelPickerProps) {
  const [open, setOpen] = useState(false);
  // Segment-Index unter dem Cursor (Basis fuer die Hover-Vergroesserung
  // unten) - null solange der Bogen offen, aber noch nicht bewegt wurde
  // (Basisbreiten gelten dann unveraendert ueberall).
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const innerR = size / 2 + ARC_GAP;
  const outerR = innerR + ARC_BAND_WIDTH;
  const midR = innerR + ARC_BAND_WIDTH / 2;
  const capR = ARC_BAND_WIDTH / 2;
  const svgSize = outerR * 2;
  const cx = outerR;
  const cy = outerR;

  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  // Klick ausserhalb schliesst - noetig fuer Touch-Geraete (kein Hover) und
  // fuer's Zumachen nach einer getroffenen Auswahl am Rand des Bogens.
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", handleOutside);
    return () => window.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  // Gewichtete Boegen-Aufteilung: OHNE Hover (hoverIndex=null) exakt gleich
  // breite Segmente (Basiszustand). MIT Hover bekommen die Segmente um
  // hoverIndex per Gauss-Gewicht spuerbar mehr Gradanteil vom GLEICH
  // GEBLIEBENEN Gesamt-Bogen - weit entfernte Segmente bleiben duenn, die
  // Summe aller Breiten ergibt immer exakt ARC_SWEEP_DEG.
  const layout = useMemo(() => {
    const weights = PALETTE.map((_, i) => {
      if (hoverIndex === null) return 1;
      const d = i - hoverIndex;
      return 1 + HOVER_MAGNIFY * Math.exp(-(d * d) / (2 * HOVER_SIGMA * HOVER_SIGMA));
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    let acc = ARC_START_DEG;
    return weights.map((w) => {
      const a0 = acc;
      const a1 = acc + (w / total) * ARC_SWEEP_DEG;
      acc = a1;
      return { a0, a1 };
    });
  }, [hoverIndex]);

  const segments = useMemo(() => {
    return layout.map(({ a0, a1 }, i) => {
      const [ix0, iy0] = polarToXY(cx, cy, innerR, a0);
      const [ox0, oy0] = polarToXY(cx, cy, outerR, a0);
      const [ox1, oy1] = polarToXY(cx, cy, outerR, a1);
      const [ix1, iy1] = polarToXY(cx, cy, innerR, a1);
      return { d: `M${ix0},${iy0} L${ox0},${oy0} L${ox1},${oy1} L${ix1},${iy1} Z`, fill: PALETTE[i].hex };
    });
  }, [layout, cx, cy, innerR, outerR]);

  function angleFromEvent(e: ReactPointerEvent<SVGSVGElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    const raw = (Math.atan2(-py, px) * 180) / Math.PI;
    return Math.max(ARC_START_DEG, Math.min(ARC_END_DEG - 0.001, raw));
  }

  // Sucht das Segment, dessen (ggf. vergroesserter) Winkelbereich den
  // gegebenen Winkel enthaelt - N=213, lineares Durchsuchen ist fuer diese
  // Groessenordnung voellig unkritisch.
  function indexForAngle(angle: number): number {
    for (let i = 0; i < layout.length; i++) {
      if (angle >= layout[i].a0 && angle < layout[i].a1) return i;
    }
    return layout.length - 1;
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const angle = angleFromEvent(e);
    // Fuer die Hover-Vergroesserung reicht die GLEICHVERTEILTE Basis-Zuordnung
    // als Anker (self-korrigierend bei jeder weiteren Mausbewegung, muss
    // nicht exakt zum aktuell verzerrten Layout passen).
    const uniformIndex = Math.min(PALETTE.length - 1, Math.max(0, Math.floor((angle - ARC_START_DEG) / UNIFORM_STEP)));
    setHoverIndex(uniformIndex);
    if (e.buttons === 1) onChange(PALETTE[indexForAngle(angle)].hex);
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    const angle = angleFromEvent(e);
    onChange(PALETTE[indexForAngle(angle)].hex);
  }

  const activeIndex = PALETTE.findIndex((c) => c.hex.toLowerCase() === value.toLowerCase());
  const startCap = polarToXY(cx, cy, midR, ARC_START_DEG);
  const endCap = polarToXY(cx, cy, midR, ARC_END_DEG);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: size, height: size, pointerEvents: "auto" }}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Sonderfarbe wählen"
        aria-label="Sonderfarbe wählen"
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: 9999,
          background: value,
          border: "2px solid rgba(255,255,255,0.9)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {/* Jonas' Fehlerbericht 2026-08-19: "es soll klar werden, dass das
            mittlere custom ist, also irgendwie ein Plus darin" - weisses
            Kreuz mit dunklem Schlagschatten, dauerhaft sichtbar (nicht nur
            solange keine Sonderfarbe gewaehlt ist). */}
        <svg width={14} height={14} viewBox="0 0 14 14" style={{ position: "absolute", inset: 0, margin: "auto", pointerEvents: "none" }}>
          <g stroke="#000" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round">
            <line x1={7} y1={2} x2={7} y2={12} />
            <line x1={2} y1={7} x2={12} y2={7} />
          </g>
          <g stroke="#fff" strokeWidth={2} strokeLinecap="round">
            <line x1={7} y1={2} x2={7} y2={12} />
            <line x1={2} y1={7} x2={12} y2={7} />
          </g>
        </svg>
      </button>
      {open && (
        <svg
          width={svgSize}
          height={svgSize}
          style={{ position: "absolute", left: size / 2 - outerR, top: size / 2 - outerR, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.fill} />
          ))}
          {/* Runde Kappen an beiden Bogen-Enden statt scharfer Ecken (Jonas'
              Vorgabe 2026-08-19: "Ecken runden") - ein Kreis mit Radius
              = halbe Bandbreite an jedem Ende deckt die spitzen
              Innen-/Aussenwinkel dort ab und rundet die Silhouette ab. */}
          <circle cx={startCap[0]} cy={startCap[1]} r={capR} fill={PALETTE[0].hex} />
          <circle cx={endCap[0]} cy={endCap[1]} r={capR} fill={PALETTE[PALETTE.length - 1].hex} />
          {activeIndex !== -1 && (
            <CurrentMarker cx={cx} cy={cy} r={midR} angle={(layout[activeIndex].a0 + layout[activeIndex].a1) / 2} />
          )}
        </svg>
      )}
    </div>
  );
}

function CurrentMarker({ cx, cy, r, angle }: { cx: number; cy: number; r: number; angle: number }) {
  const [x, y] = polarToXY(cx, cy, r, angle);
  return <circle cx={x} cy={y} r={4} fill="#fff" stroke="#1e293b" strokeWidth={1.5} />;
}
