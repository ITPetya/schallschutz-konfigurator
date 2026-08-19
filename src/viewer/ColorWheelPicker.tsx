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
// Erste Fassung bildete den Bogen ueber einen SYNTHETISCHEN HSL-Farbton
// (0-360 Grad) ab und rastete beim Picken auf den naechstliegenden RAL-Ton
// per Farbton-Distanz ein - Jonas' Fehlerbericht 2026-08-19: "da fehlen die
// ganzen Schwarztoene etc." - stimmt, ein reiner Farbton-Kreis kann echte
// Grau-/Schwarz-/Braun-/Weisstoene (sehr geringe Saettigung, Farbton
// dadurch nahezu bedeutungslos/instabil) strukturell nicht sinnvoll
// abbilden, die haetten sich alle am selben Punkt gedraengt oder wuerden
// von der (immer voll gesaettigten) Bogenfarbe gar nicht erst getroffen.
// Jonas' Vorgabe zur Korrektur: "es soll auch so ein Regenbogen sein wie
// die Farben in Zahlen auf der RAL-Tabelle angeordnet sind" - jetzt DIREKT
// nach RAL-Nummer sortiert (RAL_SPECIAL_COLORS ist in ralColors.ts bereits
// aufsteigend nach Code deklariert), EIN Bogensegment PRO echtem RAL-Ton
// mit dessen ECHTER Fuellfarbe (keine Interpolation/Synthese mehr noetig).
// Jeder Ton bekommt dadurch garantiert einen eigenen, erreichbaren Platz -
// die RAL-Systematik selbst gruppiert nach Farbfamilie (1000er=Gelb,
// 2000er=Orange, ..., 7000er=Grau, 8000er=Braun, 9000er=Weiss/Schwarz),
// wirkt dadurch weiterhin wie ein bunter, vielfaeltiger Verlauf, nur eben
// der ECHTE RAL-Katalog statt einer synthetischen Farbtonscheibe.
const PALETTE = RAL_SPECIAL_COLORS;

const ARC_START_DEG = -80;
const ARC_END_DEG = 80;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG;
// Jonas' Fehlerbericht 2026-08-19 (nach erstem Live-Test per Screenshot):
// "der Halbkreis muss deutlich groesser" - Bandbreite mehr als verdoppelt,
// Abstand zum Trigger-Kreis ebenfalls vergroessert.
// Zweiter Fehlerbericht 2026-08-19 (nach weiterem Live-Test): "das
// Verhaeltnis der Dicke fand ich gut, nur buggt der Farbkreis [Bogen]
// darein - Abstand und Dicke etc. groesser skalieren" - beide Werte
// nochmal im GLEICHEN Verhaeltnis vergroessert (nicht die Proportion
// aendern, die war schon richtig), damit der Bogen sichtbar nicht mehr in
// den Trigger-Button hineinragt.
const ARC_BAND_WIDTH = 90;
const ARC_GAP = 24; // Abstand zwischen Trigger-Kreis-Rand und Bogen-Innenkante.
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
  const step = ARC_SWEEP_DEG / PALETTE.length;

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

  // Ein Bogensegment PRO RAL-Ton, mit dessen echter Fuellfarbe - siehe
  // Kommentar oben. 213 Segmente ueber 160 Grad sind fein genug, um trotz
  // fester Bloecke (keine Farbueberblendung zwischen Nachbarn) wie ein
  // durchgehender Verlauf zu wirken.
  const segments = useMemo(() => {
    return PALETTE.map((color, i) => {
      const a0 = ARC_START_DEG + i * step;
      const a1 = a0 + step;
      const [ix0, iy0] = polarToXY(cx, cy, innerR, a0);
      const [ox0, oy0] = polarToXY(cx, cy, outerR, a0);
      const [ox1, oy1] = polarToXY(cx, cy, outerR, a1);
      const [ix1, iy1] = polarToXY(cx, cy, innerR, a1);
      return { d: `M${ix0},${iy0} L${ox0},${oy0} L${ox1},${oy1} L${ix1},${iy1} Z`, fill: color.hex };
    });
  }, [cx, cy, innerR, outerR, step]);

  function pickFromPointer(e: ReactPointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    let angle = (Math.atan2(-py, px) * 180) / Math.PI;
    angle = Math.max(ARC_START_DEG, Math.min(ARC_END_DEG - 0.001, angle));
    const index = Math.min(PALETTE.length - 1, Math.max(0, Math.floor((angle - ARC_START_DEG) / step)));
    onChange(PALETTE[index].hex);
  }

  // Position der aktuellen Auswahl auf dem Bogen - nur wenn value tatsaechlich
  // einer der Bogen-Farben entspricht (nicht z.B. einer der 2 Standardfarben-
  // Punkte in entry.tsx, die nicht Teil dieser Palette sind).
  const activeIndex = PALETTE.findIndex((c) => c.hex.toLowerCase() === value.toLowerCase());

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
          {activeIndex !== -1 && (
            <CurrentMarker cx={cx} cy={cy} r={midR} angle={ARC_START_DEG + (activeIndex + 0.5) * step} />
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
