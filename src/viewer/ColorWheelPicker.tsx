import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RAL_SPECIAL_COLORS, findNearestRalColor, hexToHue } from "../constants/ralColors";

interface ColorWheelPickerProps {
  value: string; // aktueller Hex-Wert (immer ein echter RAL-Ton, siehe entry.tsx)
  onChange: (hex: string) => void;
  size?: number;
}

// Jonas' Vorgabe 2026-08-19 (per Skizze): statt einer Liste/eines Dropdowns
// ein "Farbrad" - ein farbiger Kreis-Button, der beim Hover einen Bogen
// (40-50% eines Kreises) mit Regenbogenverlauf ausfahren laesst, auf dem man
// per Klick/Ziehen eine Farbe auswaehlt. Soll "stufenlos wirken, aber es
// wird immer der naechst passende RAL-Ton genommen" - der Bogen ist deshalb
// ein rein visueller, kontinuierlich wirkender Farbton-Verlauf (viele feine
// Segmente), die tatsaechliche Auswahl rastet ueber findNearestRalColor auf
// einen echten RAL-Sonderton ein (siehe ralColors.ts). Durchsucht bewusst
// NUR RAL_SPECIAL_COLORS, nicht die 2 Standardfarben - die haben in
// entry.tsx bereits eigene, direkt sichtbare Punkte.
const ARC_START_DEG = -80;
const ARC_END_DEG = 80;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG;
const ARC_SEGMENTS = 64;
// Jonas' Fehlerbericht 2026-08-19 (nach erstem Live-Test per Screenshot):
// "der Halbkreis muss deutlich groesser" - Bandbreite mehr als verdoppelt,
// Abstand zum Trigger-Kreis ebenfalls vergroessert.
const ARC_BAND_WIDTH = 56;
const ARC_GAP = 14; // Abstand zwischen Trigger-Kreis-Rand und Bogen-Innenkante.
const CLOSE_DELAY_MS = 220;

// Standard-Mathe-Winkel (0deg = rechts, waechst gegen den Uhrzeigersinn wie
// im Einheitskreis "nach oben") auf SVG-Koordinaten (y waechst nach unten)
// umgerechnet - deshalb das Minus vor sin().
function polarToXY(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

export function ColorWheelPicker({ value, onChange, size = 30 }: ColorWheelPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const innerR = size / 2 + ARC_GAP;
  const outerR = innerR + ARC_BAND_WIDTH;
  const midR = innerR + ARC_BAND_WIDTH / 2;
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

  const segments = useMemo(() => {
    const step = ARC_SWEEP_DEG / ARC_SEGMENTS;
    return Array.from({ length: ARC_SEGMENTS }, (_, i) => {
      const a0 = ARC_START_DEG + i * step;
      const a1 = a0 + step;
      const hue = ((a0 + a1) / 2 - ARC_START_DEG) / ARC_SWEEP_DEG * 360;
      const [ix0, iy0] = polarToXY(cx, cy, innerR, a0);
      const [ox0, oy0] = polarToXY(cx, cy, outerR, a0);
      const [ox1, oy1] = polarToXY(cx, cy, outerR, a1);
      const [ix1, iy1] = polarToXY(cx, cy, innerR, a1);
      return { d: `M${ix0},${iy0} L${ox0},${oy0} L${ox1},${oy1} L${ix1},${iy1} Z`, fill: `hsl(${hue} 75% 50%)` };
    });
  }, [cx, cy, innerR, outerR]);

  function pickFromPointer(e: ReactPointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    let angle = (Math.atan2(-py, px) * 180) / Math.PI;
    angle = Math.max(ARC_START_DEG, Math.min(ARC_END_DEG, angle));
    const hue = ((angle - ARC_START_DEG) / ARC_SWEEP_DEG) * 360;
    const nearest = findNearestRalColor(`#${hslToHex(hue)}`, RAL_SPECIAL_COLORS);
    onChange(nearest.hex);
  }

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
            mittlere custom ist, also irgendwie ein Plus darin" - im
            Gegensatz zu den beiden statischen Standardfarben-Punkten in
            entry.tsx ist DIESER Button hier interaktiv/frei waehlbar, das
            Plus signalisiert das dauerhaft (nicht nur solange keine
            Sonderfarbe gewaehlt ist - anders als StartPresetCard.tsx's
            gleichnamiges Muster, wo das Plus verschwindet, sobald
            tatsaechlich eine Sonderfarbe aktiv ist). Weisses Kreuz mit
            dunklem Schlagschatten statt einer festen Farbe, damit es auf
            JEDER moeglichen Fuellfarbe des Buttons lesbar bleibt. */}
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
          onPointerDown={pickFromPointer}
          onPointerMove={(e) => e.buttons === 1 && pickFromPointer(e)}
        >
          {segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.fill} />
          ))}
          {/* Markierung der aktuellen Auswahl auf dem Bogen. */}
          <CurrentMarker value={value} cx={cx} cy={cy} r={midR} />
        </svg>
      )}
    </div>
  );
}

function CurrentMarker({ value, cx, cy, r }: { value: string; cx: number; cy: number; r: number }) {
  // Farbton der aktuellen Auswahl relativ zur Sonderfarben-Palette - die
  // Palette deckt nicht zwingend den vollen 0-360-Bereich luechenlos ab,
  // fuer die reine Positionsanzeige reicht der rohe Hex-Farbton trotzdem.
  const hue = useMemo(() => hexToHue(value), [value]);
  const angle = ARC_START_DEG + (hue / 360) * ARC_SWEEP_DEG;
  const [x, y] = polarToXY(cx, cy, r, angle);
  return <circle cx={x} cy={y} r={4} fill="#fff" stroke="#1e293b" strokeWidth={1.5} />;
}

// Kleine, lokale HSL(nur Farbton)->Hex-Hilfsfunktion NUR fuers Abtasten des
// Bogens (volle Saettigung/Helligkeit, wie die sichtbaren Bogen-Segmente
// selbst) - bewusst nicht aus ralColors.ts importiert, dort gibt es nur die
// Rueckrichtung (Hex->Farbton).
function hslToHex(hue: number): string {
  const s = 0.75;
  const l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}
