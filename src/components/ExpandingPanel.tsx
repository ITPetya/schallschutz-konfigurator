import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

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
const CORNER_RADIUS = 20;
const PADDING = 16;
const HEADER_EXTRA_LEFT = Math.max(0, R + 8 - PADDING);

// Jonas' Skizze 2026-08-14 (drei Teilbilder: nur Button -> Rohbau-Layout mit
// rot markierten Verbindungslinien -> fertig geglaettete Verbindung):
// Button-Kreis (Radius R) UND Panel bleiben ZWEI EIGENSTAENDIGE, jederzeit
// eigenstaendig sichtbare Formen (nicht wie im vorherigen Zwischenstand eine
// einzelne, sich umformende Flaeche) - der Kreis behaelt immer seinen
// eigenen Umriss, das Panel schliesst ueber eine KONKAVE Ausparung exakt in
// Button-Groesse nahtlos daran an. Button-Mittelpunkt = Panel-Eck-
// Referenzpunkt (0,0) - der Pfad faehrt von (R,0) dem Kreisbogen nach (0,R),
// aber auf der zur Rechteckmitte hin gewoelbten Seite (sweep-flag 0 statt 1
// wie bei den drei normalen konvexen Ecken).
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

// Jonas' Vorgabe 2026-08-13/14 ("Liquid Glass"-Optik, gleiche Farbe fuer
// Button und Menü): der Button ist eine NORMALE CSS-Kreisform (border-radius
// 50%) - dort funktioniert echtes backdrop-blur browseruebergreifend
// zuverlaessig. Das Panel braucht wegen der konkaven Ausparung eine SVG-
// Pfadform (CSS clip-path/border-radius koennen keine konkaven Ecken); SVG-
// Elemente unterstuetzen backdrop-filter nicht zuverlaessig genug (vor allem
// Safari), deshalb dort eine dichtere, weiterhin durchscheinende Fuellfarbe
// statt echtem Weichzeichner-Hintergrund - optisch minimal weniger "glasig"
// an dieser einen Stelle, aber seitengleiche Farbe/Deckkraft wie der Button.
const GLASS_PANEL_FILL = "fill-white/90 stroke-white/70 dark:fill-slate-800/90 dark:stroke-slate-500/50";
const GLASS_BUTTON_CLASS =
  "border border-white/70 bg-white/85 shadow-md backdrop-blur-md dark:border-slate-500/40 dark:bg-slate-800/85";

export function ExpandingPanel({ open, onToggle, ariaLabel, header, children, width = 272, triggerDataTour }: ExpandingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(BUTTON_SIZE);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    const observer = new ResizeObserver((entries) => {
      // borderBoxSize (nicht contentRect!) - contentRect schliesst das
      // EIGENE padding des beobachteten Elements aus, siehe Fehlerbericht
      // 2026-08-14 (der "Hinzufügen"-Button blieb dauerhaft abgeschnitten).
      const next = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
      if (next) setHeight(next);
    });
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, [open]);

  const h = Math.max(height, BUTTON_SIZE);
  const path = buildNotchedRectPath(width, h);
  const springTransition = { type: "spring" as const, stiffness: 340, damping: 28, mass: 0.9 };

  return (
    <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Panel - eigene Form mit konkaver Ausparung genau in Button-Groesse
          an der Ecke, waechst per Scale+Opacity aus dem Button-Mittelpunkt
          heraus (transformOrigin exakt auf O). */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={springTransition}
            style={{ position: "absolute", left: 0, top: 0, width, height: h, transformOrigin: "0 0" }}
            className="z-10"
          >
            <svg width={width} height={h} className="pointer-events-none absolute inset-0 drop-shadow-lg">
              <path d={path} className={GLASS_PANEL_FILL} strokeWidth={1.5} />
            </svg>
            {/* position:"relative" ist hier NICHT nur Layout: ohne eigene
                Positionierung wuerde dieser Inhalt (in-flow, unpositioniert)
                gemaess CSS-Stapelreihenfolge HINTER der absolut positionierten
                SVG-Flaeche gemalt werden, obwohl er im DOM danach kommt (siehe
                Fehlerbericht 2026-08-13: Text schimmerte nur durch die
                Fuellfarbe hindurch, computed opacity war ueberall 1). */}
            <div ref={contentRef} className="relative flex flex-col gap-3" style={{ padding: PADDING, width }}>
              <div style={{ minHeight: BUTTON_SIZE, paddingLeft: HEADER_EXTRA_LEFT }} className="flex items-center">
                {header}
              </div>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button - eigenstaendige, IMMER sichtbare Glas-Kreisform (siehe
          Kommentar oben), liegt ueber dem Panel. Icon-Wechsel per key-Fade
          statt reiner Drehung (Jonas: "der Button soll dann eben so darein
          faden") - key aendert sich NUR mit `open`, nicht bei jedem Render
          (z. B. beim Tippen in den Maße-Feldern), sonst wuerde eine direkt im
          animate-Prop erzeugte Keyframe-Opacity bei JEDEM Render neu
          anspringen. */}
      <button
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className={`absolute left-0 top-0 z-20 flex items-center justify-center rounded-full text-brand-dark hover:text-brand dark:text-brand-light ${GLASS_BUTTON_CLASS}`}
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <AnimatePresence initial={false}>
          <motion.svg
            key={open ? "cross" : "plus"}
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ rotate: open ? 0 : 45, opacity: 0.25 }}
            animate={{ rotate: open ? 45 : 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springTransition}
            style={{ position: "absolute", left: (BUTTON_SIZE - 20) / 2, top: (BUTTON_SIZE - 20) / 2 }}
          >
            <line x1={12} y1={19} x2={12} y2={5} />
            <line x1={5} y1={12} x2={19} y2={12} />
          </motion.svg>
        </AnimatePresence>
      </button>
    </div>
  );
}
