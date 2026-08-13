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
const PANEL_RADIUS = 20;
const PADDING = 16;
// Die Kopfzeile muss die VOLLE Button-Flaeche links oben frei lassen (nicht
// nur einen schmalen Streifen) - anders als beim alten konkaven Pfad ist der
// Button jetzt keine eigene Aussparung mehr, sondern liegt einfach als
// eigenes Icon ueber der (an dieser Stelle voll durchgezogenen) Glasflaeche.
const HEADER_EXTRA_LEFT = Math.max(0, BUTTON_SIZE + 8 - PADDING);

// Glas-Farbe fuer BEIDE Zustaende (Button UND Flaeche) identisch, damit der
// Uebergang nahtlos wirkt (Jonas' Vorgabe 2026-08-14: "der Button soll in
// der gleichen Farbe wie das Menü sein, und wirklich so sein als wäre eine
// Flüssigkeit aus dem Button ausgelaufen" - Referenz: Apples "Liquid Glass").
const GLASS_CLASS = "border border-white/60 bg-white/75 shadow-lg backdrop-blur-md dark:border-slate-500/40 dark:bg-slate-800/75";

// Jonas' Vorgabe 2026-08-13/14 ("das Menü soll so aus dem Plus-Button
// expandieren... wirklich wie Flüssigkeit, die aus dem Button ausläuft, im
// Stil von Apples Liquid Glass"): EIN einziges Element spielt sowohl den
// Button ALS AUCH die aufklappende Flaeche - es morpht per Federanimation
// von einem Kreis (Button-Groesse, volle Rundung) zu einem abgerundeten
// Rechteck (Panel-Groesse, PANEL_RADIUS), CSS klemmt eine zu grosse
// border-radius automatisch auf die halbe Kantenlaenge - dadurch bleibt die
// Form waehrend des gesamten Wachstums organisch rund, nie eckig. Anders als
// die vorherige Version (separate Ebenen mit ausgeschnittenem Pfad) gibt es
// hier gar keine zwei zu verschmelzenden Formen mehr, sondern eine einzige,
// durchgaengige "Blase", die waechst - genau das ergibt den fluessigen Look,
// ganz ohne SVG-Verschmelzungsfilter (deren Zusammenspiel mit dem
// gleichzeitig gewuenschten Glas-Weichzeichner-Hintergrund - backdrop-blur -
// in mehreren Browsern unzuverlaessig ist).
export function ExpandingPanel({ open, onToggle, ariaLabel, header, children, width = 272, triggerDataTour }: ExpandingPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(BUTTON_SIZE);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el || !open) return;
    const observer = new ResizeObserver((entries) => {
      // borderBoxSize (nicht contentRect!) - contentRect schliesst das
      // EIGENE padding des beobachteten Elements aus (hier direkt auf
      // contentRef gesetzt, siehe unten), die Aussenflaeche wurde dadurch
      // systematisch um genau 2*PADDING zu niedrig berechnet und hat den
      // letzten Inhalt (z. B. den "Hinzufügen"-Button) abgeschnitten - per
      // Playwright bestaetigt (Federanimation war laengst eingeschwungen,
      // trotzdem dauerhaft zu kurz).
      const next = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
      if (next) setHeight(next);
    });
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, [open]);

  const h = Math.max(height, BUTTON_SIZE);

  return (
    <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Die morphende "Fluessigkeits"-Flaeche - Button UND Panel in einem
          Element, siehe Kommentar oben. overflow-hidden sorgt zusaetzlich
          dafuer, dass der Inhalt waehrend des Wachsens sichtbar VON DER
          FORM SELBST freigegeben wird ("liquid reveal"), statt vorher schon
          ueber den noch kleinen Rand hinauszuragen. */}
      <motion.div
        initial={false}
        animate={{ width: open ? width : BUTTON_SIZE, height: open ? h : BUTTON_SIZE, borderRadius: open ? PANEL_RADIUS : BUTTON_SIZE / 2 }}
        transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.9 }}
        className={`absolute left-0 top-0 z-10 overflow-hidden ${GLASS_CLASS}`}
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

      {/* Icon-Ebene - liegt IMMER ueber der Glasflaeche, unabhaengig von deren
          aktueller Groesse/Form, damit Plus/Kreuz nie mitgedehnt wird. */}
      <button
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className="absolute left-0 top-0 z-20 flex items-center justify-center text-brand-dark hover:text-brand dark:text-brand-light"
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
          transition={{ type: "spring", stiffness: 340, damping: 22 }}
        >
          <line x1={12} y1={19} x2={12} y2={5} />
          <line x1={5} y1={12} x2={19} y2={12} />
        </motion.svg>
      </button>
    </div>
  );
}
