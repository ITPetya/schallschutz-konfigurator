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
//
// Jonas' Fehlerbericht 2026-08-19 (Runde 5): "der Zoom ist gut, die
// Rundung ist aber einfach nur komisch" - die zunaechst versuchten runden
// Kappen an beiden Enden (volle Kreise mit Radius = halbe Bandbreite)
// wieder ENTFERNT statt sie nachzujustieren, da unklar war, welche Form
// stattdessen gewuenscht ist - lieber sauber sichtbare, scharfe Enden als
// nochmal geraten.
//
// Jonas' Fehlerbericht 2026-08-19 (Runde 6): erst per Stack-Gap (siehe
// entry.tsx) mehr Abstand zu den Nachbar-Punkten versucht, dann korrigiert:
// "nein, Punkte wieder zurueck, aber den Durchmesser des Innen- und
// Aussenkreises einfach noch etwas groesser" - bewusste Entscheidung
// GEGEN das Vermeiden jeder Naehe zu den Nachbar-Punkten (bei diesem
// Bogen-Winkel wuerde das nur ueber ein SCHMALERES Sweep oder mehr
// Punkt-Abstand gehen, beides von Jonas explizit abgelehnt) - der Ring
// waechst hier also weiter, eine gewisse Naehe/Ueberlappung zu den beiden
// Standardfarben-Punkten beim geoeffneten Bogen ist damit in Kauf genommen.
const PALETTE = RAL_SPECIAL_COLORS;

const ARC_START_DEG = -80;
const ARC_END_DEG = 80;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG;
const ARC_BAND_WIDTH = 92;
const ARC_GAP = 85; // Abstand zwischen Trigger-Kreis-Rand und Bogen-Innenkante.
const CLOSE_DELAY_MS = 220;
// Jonas' Vorgabe 2026-08-19: "den Zoom noch groesser machen" - HOVER_MAGNIFY
// deutlich hoch (das Segment am Cursor nimmt einen deutlich groesseren
// Gradanteil des Bogens ein), HOVER_SIGMA leicht mit angehoben, damit auch
// ein paar Nachbar-Segmente spuerbar mitwachsen (nicht nur ein einzelnes
// Segment ploetzlich riesig, sondern ein sanfterer Huegel darum herum) -
// wichtig auch fuer die RAL-Namen-Beschriftung unten: mehrere anwachsende
// Nachbarn ueberschreiten dadurch nacheinander die Beschriftungsschwelle.
const HOVER_SIGMA = 4;
const HOVER_MAGNIFY = 26;
// Ab dieser Segmentbreite (Grad) wird die RAL-Nummer als Text eingeblendet
// (Jonas' Vorgabe 2026-08-19: "ab einer gewissen Groesse auch die RAL-Farbe
// als Namen reinschreiben") - klein genug, dass mehrere durch den Hover
// vergroesserte Nachbar-Segmente gleichzeitig beschriftet werden koennen,
// gross genug, dass der Text bei der Basisbreite (~0,75 Grad) nicht
// versehentlich ueberall aufploppt.
const LABEL_THRESHOLD_DEG = 4.5;
// Jonas' Vorgabe 2026-08-19: "es sollen immer nur 3 wirklich sichtbar
// sein, der Rest soll weg faden" - eigene, ENGERE Gauss-Streuung nur fuer
// die Deckkraft (getrennt von HOVER_SIGMA/-MAGNIFY oben, die steuern nur
// die BREITE) - bei FADE_SIGMA=1,1 sind ungefaehr das getroffene Segment
// plus je ein Nachbar auf jeder Seite deutlich sichtbar, der Rest faellt
// schnell auf FADE_MIN_OPACITY ab. FADE_MIN_OPACITY bleibt > 0 statt 0,
// damit die Bogenform als Ganzes (welche Farbfamilien ueberhaupt zur
// Verfuegung stehen) weiterhin schwach erkennbar bleibt, nicht komplett
// verschwindet.
const FADE_SIGMA = 1.1;
const FADE_MIN_OPACITY = 0.12;

// Standard-Mathe-Winkel (0deg = rechts, waechst gegen den Uhrzeigersinn wie
// im Einheitskreis "nach oben") auf SVG-Koordinaten (y waechst nach unten)
// umgerechnet - deshalb das Minus vor sin().
function polarToXY(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
}

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

  // Deckkraft je Segment - siehe FADE_SIGMA/FADE_MIN_OPACITY-Kommentar oben.
  // Ohne Hover (hoverIndex=null, z.B. direkt beim Oeffnen) volle Deckkraft
  // ueberall, damit erstmal das komplette Spektrum sichtbar ist.
  const opacities = useMemo(() => {
    if (hoverIndex === null) return PALETTE.map(() => 1);
    return PALETTE.map((_, i) => {
      const d = i - hoverIndex;
      return FADE_MIN_OPACITY + (1 - FADE_MIN_OPACITY) * Math.exp(-(d * d) / (2 * FADE_SIGMA * FADE_SIGMA));
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

  // Jonas' Fehlerbericht 2026-08-19: "die Auswahl soll auch nur passieren,
  // wenn die Maus wirklich ueber den Farben ist, nicht im Nichts mehr" -
  // bisher wurde der Winkel IMMER berechnet und geclampt, unabhaengig
  // davon, ob der Cursor tatsaechlich im bemalten Ring (zwischen innerR und
  // outerR) stand oder z.B. im leeren Loch in der Mitte bzw. den leeren
  // Ecken der quadratischen SVG-Bounding-Box - dist gibt jetzt zusaetzlich
  // den Radialabstand vom Mittelpunkt zurueck, isOverRing prueft, ob der
  // Cursor wirklich auf dem Band steht.
  function pointFromEvent(e: ReactPointerEvent<SVGSVGElement>): { angle: number; dist: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    const dist = Math.hypot(px, py);
    const raw = (Math.atan2(-py, px) * 180) / Math.PI;
    const angle = Math.max(ARC_START_DEG, Math.min(ARC_END_DEG - 0.001, raw));
    return { angle, dist };
  }

  function isOverRing(dist: number): boolean {
    return dist >= innerR && dist <= outerR;
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
    const { angle, dist } = pointFromEvent(e);
    if (!isOverRing(dist)) {
      setHoverIndex(null);
      return;
    }
    // Jonas' Fehlerbericht 2026-08-19: "das Ganze verlaeuft nicht direkt
    // zur Position der Maus" - Ursache: hier stand bisher eine GLEICH-
    // VERTEILTE Basis-Zuordnung (angle/UNIFORM_STEP), obwohl das TATSAECH-
    // LICH angezeigte Layout durch die Hover-Vergroesserung laengst verzerrt
    // ist - bei starker Vergroesserung (HOVER_MAGNIFY jetzt 26) wich die so
    // berechnete "Mitte" der Aufweitung spuerbar von der echten Mausposition
    // ab. Fix: denselben indexForAngle-Lookup wie beim tatsaechlichen Picken
    // nutzen (sucht im AKTUELLEN, ggf. bereits verzerrten Layout aus dem
    // letzten Render) - das korrigiert sich mit jeder weiteren Mausbewegung
    // selbst nach, bleibt dadurch stabil deckungsgleich mit dem Cursor.
    const idx = indexForAngle(angle);
    setHoverIndex(idx);
    if (e.buttons === 1) onChange(PALETTE[idx].hex);
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    const { angle, dist } = pointFromEvent(e);
    if (!isOverRing(dist)) return;
    onChange(PALETTE[indexForAngle(angle)].hex);
  }

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
        onClick={() =>
          setOpen((o) => {
            // Jonas' Fehlerbericht 2026-08-19: "wenn man aufs Plus drueckt
            // soll das auch wieder eingefahren werden" - explizites
            // Zuruecksetzen von hoverIndex beim Schliessen, damit beim
            // naechsten Oeffnen (per Hover) nicht kurz die zuletzt
            // vergroesserte Stelle "nachhaengt", bevor die Maus sich
            // wieder bewegt.
            if (o) setHoverIndex(null);
            return !o;
          })
        }
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
            solange keine Sonderfarbe gewaehlt ist). Jonas' Vorgabe
            2026-08-19: "das Plus bitte auch nach dem animated-ui machen,
            dass es zu einem Kreuz wird, wenn der Farbpicker ausgefahren
            ist" - ein Plus, um 45 Grad gedreht, IST bereits ein X/Kreuz -
            reine CSS-Rotation mit Uebergang statt eines zweiten Icons. */}
        <svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            pointerEvents: "none",
            transform: `rotate(${open ? 45 : 0}deg)`,
            transition: "transform 0.2s ease",
          }}
        >
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
          {/* Jonas' Fehlerbericht 2026-08-19: "haessliche weisse Striche
              dazwischen" - klassisches SVG-Antialiasing-Nahtproblem
              zwischen vielen aneinanderstossenden fein gefuellten Formen
              (bei 213 duennen Segmenten gut sichtbar): jede <path> wird
              einzeln geglaettet, an der gemeinsamen Kante bleibt dabei ein
              Sub-Pixel-Spalt, durch den der Hintergrund durchscheint.
              Standard-Fix: Stroke in derselben Farbe wie die Fuellung, 1px
              breit - deckt genau diesen Spalt ab, ohne die sichtbare Form
              zu veraendern. */}
          {segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.fill} stroke={seg.fill} strokeWidth={1} opacity={opacities[i]} />
          ))}
          {/* RAL-Nummer als Text, sobald ein Segment (durch die
              Hover-Vergroesserung oben) breit genug dafuer ist - siehe
              LABEL_THRESHOLD_DEG. Radial ausgerichtet (Rotation = -Winkel,
              da SVG im Uhrzeigersinn rotiert, unser Winkel aber gegen den
              Uhrzeigersinn waechst, siehe polarToXY-Kommentar), damit der
              Text der Speiche entlang der jeweiligen Segmentmitte folgt
              statt quer drueberzustehen. */}
          {layout.map(({ a0, a1 }, i) => {
            const widthDeg = a1 - a0;
            if (widthDeg < LABEL_THRESHOLD_DEG) return null;
            const midAngle = (a0 + a1) / 2;
            const [tx, ty] = polarToXY(cx, cy, midR, midAngle);
            return (
              <text
                key={`label-${i}`}
                x={tx}
                y={ty}
                transform={`rotate(${-midAngle}, ${tx}, ${ty})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="sans-serif"
                fontWeight={700}
                fill="#fff"
                stroke="#000"
                strokeWidth={2.5}
                paintOrder="stroke"
                opacity={opacities[i]}
                style={{ pointerEvents: "none" }}
              >
                {PALETTE[i].code}
              </text>
            );
          })}
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
