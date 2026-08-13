import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedButton } from "./AnimatedButton";

interface ExpandingPanelProps {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  header: ReactNode;
  children: ReactNode;
  width?: number;
  triggerDataTour?: string;
}

const BUTTON_SIZE = 36; // px, entspricht der bisherigen h-9 w-9
const R = BUTTON_SIZE / 2;
const CORNER_RADIUS = 14;
// Jonas' Fehlerbericht 2026-08-13: "der Randabstand soll oben, unten und an
// den Seiten überall gleich sein" - EIN gemeinsamer Aussenabstand fuer die
// gesamte Flaeche statt der bisherigen, an jeder Seite verschiedenen
// Tailwind-Klassen (px-4/pb-3/pt-1 fuer den Koerper, pr-3/pt-2.5 fuer den
// Kopf). Nur die Kopfzeile braucht LINKS zusaetzlich Platz ueber PADDING
// hinaus, um die Notch-Rundung nicht zu ueberlappen (siehe
// buildNotchedRectPath: bei y=0 beginnt die Flaeche erst bei x=R) - dieser
// Zusatzabstand ist eine unvermeidliche Ausnahme durch die Button-Aussparung
// selbst, keine erneute Asymmetrie "ohne Grund".
const PADDING = 16;
const HEADER_EXTRA_LEFT = Math.max(0, R + 8 - PADDING);

// Jonas' Vorgabe 2026-08-13 ("das Menü soll so aus dem Plus-Button
// expandieren, damit es nicht mit anderen Elementen kollidiert"): ersetzt
// das bisherige Muster "Plus-Button verschwindet, separate Box taucht
// daneben auf" durch EIN Element, das sichtbar aus dem runden Button
// herauswaechst - der Button bleibt an Ort und Stelle (wird nur zum Kreuz),
// die aufklappende Flaeche hat eine konkave Aussparung genau in seiner
// Groesse an der Ecke, statt eines eigenen, unabhaengig positionierten
// rechteckigen Randes dort.
//
// Geometrie (siehe Skizze): der Button-MITTELPUNKT liegt exakt auf dem
// Eck-Referenzpunkt (lokal (0,0)) der aufklappenden Flaeche - die drei
// anderen Ecken sind normal konvex abgerundet (CORNER_RADIUS), die vierte
// (am Button) wird stattdessen aus dem Rechteck HERAUSgeschnitten (Kreis
// mit Radius R, Mittelpunkt (0,0)): der Pfad folgt von (R,0) dem Kreisbogen
// nach (0,R), aber auf der zur Rechteckmitte hin gewoelbten (konkaven)
// Seite - deshalb ein anderes sweep-flag als bei den drei konvexen Ecken.
function buildNotchedRectPath(w: number, h: number): string {
  const r = CORNER_RADIUS;
  return [
    `M ${R} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${R}`,
    `A ${R} ${R} 0 0 0 ${R} 0`,
    "Z",
  ].join(" ");
}

// Runder Trigger-Button, der zugleich Ausloeser UND (wenn offen) die linke
// obere Ecke der aufklappenden Flaeche markiert - siehe buildNotchedRectPath.
// Das Plus dreht sich beim Oeffnen um 45° und wird dadurch optisch zu einem
// Kreuz (klassischer Hamburger/Plus-zu-X-Trick), statt zwischen zwei
// unterschiedlichen Icon-Komponenten zu wechseln.
export function ExpandingPanel({ open, onToggle, ariaLabel, header, children, width = 288, triggerDataTour }: ExpandingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(BUTTON_SIZE);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (next) setHeight(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const h = Math.max(height, BUTTON_SIZE);
  const path = buildNotchedRectPath(width, h);

  return (
    <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ position: "absolute", left: R, top: R, width, transformOrigin: "0 0" }}
          >
            <svg
              width={width}
              height={h}
              className="pointer-events-none absolute inset-0 fill-white/95 stroke-slate-200 drop-shadow-md dark:fill-slate-800/95 dark:stroke-slate-700"
            >
              <path d={path} strokeWidth={1} />
            </svg>
            {/* position:"relative" ist hier NICHT nur Layout: ohne eigene
                Positionierung wuerde dieser Inhalt (in-flow, unpositioniert)
                gemaess CSS-Stapelreihenfolge HINTER der absolut positionierten
                SVG-Flaeche gemalt werden, obwohl er im DOM danach kommt - der
                Text schimmerte dadurch nur durch die fast deckende weisse
                Flaeche (fill-white/95) hindurch (blass, wirkte wie falsche
                Opacity - tatsaechlich war computed opacity ueberall 1, siehe
                Playwright-Debug). Mit eigener Positionierung zaehlt die
                normale DOM-Reihenfolge, der Inhalt (kommt im JSX nach der
                SVG) malt sich korrekt darueber. */}
            <div ref={contentRef} className="relative flex flex-col gap-3" style={{ padding: PADDING }}>
              <div style={{ minHeight: R, paddingLeft: HEADER_EXTRA_LEFT }} className="flex items-center">
                {header}
              </div>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatedButton
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className="absolute left-0 top-0 z-10 flex items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark"
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <motion.svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <line x1={12} y1={19} x2={12} y2={5} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </motion.svg>
      </AnimatedButton>
    </div>
  );
}
