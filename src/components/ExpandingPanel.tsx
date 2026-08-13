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
const PANEL_RADIUS = 20;
const PADDING = 16;
const HEADER_EXTRA_LEFT = Math.max(0, BUTTON_SIZE + 8 - PADDING);

// Glas-Farbe fuer BEIDE Zustaende (Button UND Flaeche) identisch, damit der
// Uebergang nahtlos wirkt (Jonas' Vorgabe 2026-08-14: "der Button soll in
// der gleichen Farbe wie das Menü sein, und wirklich so sein als wäre eine
// Flüssigkeit aus dem Button ausgelaufen" - Referenz: Apples "Liquid Glass").
const GLASS_CLASS = "border border-white/60 bg-white/75 shadow-lg backdrop-blur-md dark:border-slate-500/40 dark:bg-slate-800/75";

// Jonas' Praezisierung 2026-08-14 ("das Fenster soll rechts neben dem
// Button sein und der Button dann eben so darein faden, siehe die Skizze"):
// der Button-MITTELPUNKT liegt exakt auf dem Eck-Referenzpunkt O der
// aufklappenden Flaeche, nicht (wie im vorherigen Zwischenstand) der
// Button-RAND - dadurch ragt der Button sichtbar UEBER die Flaeche hinaus
// (Skizze: der Kreis sitzt an der Ecke, ein Teil liegt ausserhalb des
// Rechtecks), und die Flaeche selbst beginnt spuerbar rechts/unterhalb
// davon, statt den Button komplett zu umschliessen. Technisch: die
// morphende Flaeche animiert `left/top` GEMEINSAM mit `width/height` von
// (0,0)/(2R,2R) [Kreis, deckungsgleich mit dem Button] nach (R,R)/(width,h)
// [Rechteck, dessen Ecke exakt auf O sitzt] - dasselbe einzelne Element wie
// zuvor, nur mit Positions- statt nur Groessenanimation.
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
  const springTransition = { type: "spring" as const, stiffness: 340, damping: 28, mass: 0.9 };

  return (
    // Groesser als nur der Button, weil die offene Flaeche jetzt spuerbar
    // ueber die urspruengliche Button-Box hinausreicht (siehe Kommentar
    // oben) - reiner Platzhalter, alle Kinder sind absolut positioniert und
    // richten sich nach O = (R,R), nicht nach diesem Wrapper selbst.
    <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Die morphende "Fluessigkeits"-Flaeche - Button UND Panel in einem
          Element. overflow-hidden gibt den Inhalt sichtbar VON DER FORM
          SELBST frei, waehrend sie waechst ("liquid reveal"). */}
      <motion.div
        initial={false}
        animate={{
          left: open ? R : 0,
          top: open ? R : 0,
          width: open ? width : BUTTON_SIZE,
          height: open ? h : BUTTON_SIZE,
          borderRadius: open ? PANEL_RADIUS : BUTTON_SIZE / 2,
        }}
        transition={springTransition}
        className={`absolute z-10 overflow-hidden ${GLASS_CLASS}`}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              style={{ width }}
            >
              <div ref={contentRef} className="flex flex-col gap-3" style={{ padding: PADDING }}>
                <div style={{ minHeight: BUTTON_SIZE, paddingLeft: HEADER_EXTRA_LEFT }} className="flex items-center">
                  {header}
                </div>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Icon-Ebene - bleibt IMMER genau auf O (Mittelpunkt bei wrapper-lokal
          (R,R)) zentriert, unabhaengig vom aktuellen Zustand der Glasflaeche,
          damit Plus/Kreuz nie mitgedehnt wird. Statt nur zu rotieren, wird
          bei jedem Umschalten per `key`-Wechsel ein NEUES Icon eingeblendet
          (kurzer Opacity-Fade, siehe initial/exit) - dadurch wirkt der
          Wechsel, als wuerde das alte Icon kurz in die Fluessigkeit
          eintauchen und das neue daraus auftauchen (Jonas: "der Button soll
          dann eben so darein faden"), statt nur starr zu rotieren. `key`
          aendert sich NUR mit `open`, nicht bei jedem Render (z. B. beim
          Tippen in den Maße-Feldern) - eine Keyframe-Opacity-Animation direkt
          im `animate`-Prop wuerde dagegen bei JEDEM Render neu anspringen,
          da neu erzeugte Array-Literale von Motion nicht zuverlaessig als
          "unveraendert" erkannt werden. */}
      <button
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className="absolute left-0 top-0 z-20 text-brand-dark hover:text-brand dark:text-brand-light"
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
