import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedButton } from "./AnimatedButton";
import { PlusIcon } from "./icons/PlusIcon";
import { XIcon } from "./icons/XIcon";

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
// Jonas' Praezisierung 2026-08-14: "jetzt muss das menü noch nach rechts,
// mit etwas abstand zwischen button und menü und dann noch die verbindung,
// dass es wie ein element aussieht" - das Panel sitzt nicht mehr buendig am
// Button (Referenzpunkt = Button-Mittelpunkt), sondern GAP px weiter
// rechts/unten davon versetzt, die konkave Rundung (weiterhin Radius R,
// siehe buildNotchedRectPath) ueberbrueckt diesen Zwischenraum als
// fliessende Verbindung statt einer buendigen Aussparung.
const GAP = 10;

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
            style={{ position: "absolute", left: GAP, top: GAP, width, height: h, transformOrigin: "0 0" }}
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
          Kommentar oben), liegt ueber dem Panel. Jonas' Vorgabe 2026-08-14:
          "der Button soll vorher aber genauso sein wie er immer war, ein
          animiertes icon usw." - AnimatedButton + PlusIcon/XIcon
          (animate-ui-Icons mit eigener Hover-Animation ueber
          IconHoverContext, siehe dortige Komponenten) statt der zuvor
          selbstgebauten Linien-SVG, damit Hover-/Tap-Verhalten exakt dem
          Rest der App entspricht. Der Wechsel zwischen den beiden Icons
          selbst laeuft weiterhin per key-Fade (key haengt NUR an `open`,
          nicht an jedem Render, siehe vorheriger Kommentar-Verlauf zu dieser
          Datei). */}
      <AnimatedButton
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className={`absolute left-0 top-0 z-20 flex items-center justify-center rounded-full text-brand-dark hover:text-brand dark:text-brand-light ${GLASS_BUTTON_CLASS}`}
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={open ? "cross" : "plus"}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springTransition}
            className="absolute flex items-center justify-center"
            style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
          >
            {open ? <XIcon size={20} /> : <PlusIcon size={20} />}
          </motion.span>
        </AnimatePresence>
      </AnimatedButton>
    </div>
  );
}
