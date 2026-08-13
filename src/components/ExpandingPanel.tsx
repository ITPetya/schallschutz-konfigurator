import type { ReactNode } from "react";
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
const PADDING = 16;
// Jonas' Praezisierung 2026-08-14: "die Oberkante muss mit der oberen
// Außenkante des Buttons fluchten, die rechte Kante des Buttons braucht nur
// einen kleinen Abstand zur linken Kante des Menüs" - rein HORIZONTALER
// Versatz (kein diagonales Offset mehr wie im vorherigen Zwischenstand), das
// Panel sitzt auf gleicher Hoehe direkt rechts neben dem Button. Dadurch
// beruehren/ueberlappen sich Button und Panel gar nicht mehr - keine
// konkave Ausparung noetig, eine normale abgerundete Flaeche reicht, und
// als Nebeneffekt funktioniert jetzt echtes backdrop-blur auch auf dem
// Panel (die vorherige SVG-Pfadform brauchte die konkave Ecke, SVG
// unterstuetzt backdrop-filter aber nicht zuverlaessig).
const GAP = 10;

// Jonas' Vorgabe 2026-08-13/14 ("Liquid Glass"-Optik, gleiche Farbe fuer
// Button und Menü): identische Glas-Klassen fuer beide Formen.
const GLASS_CLASS = "border border-white/70 bg-white/85 shadow-md backdrop-blur-md dark:border-slate-500/40 dark:bg-slate-800/85";

export function ExpandingPanel({ open, onToggle, ariaLabel, header, children, width = 272, triggerDataTour }: ExpandingPanelProps) {
  // Kein ResizeObserver/Hoehen-Tracking mehr noetig (frueherer
  // Zwischenstand): die Panel-Hoehe wird nicht mehr numerisch animiert (nur
  // noch scale/opacity, siehe unten), CSS-Auto-Hoehe reicht dafuer.
  const springTransition = { type: "spring" as const, stiffness: 340, damping: 28, mass: 0.9 };

  return (
    <div className="relative" style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Panel - eigenstaendige, normal abgerundete Glasflaeche direkt rechts
          neben dem Button (siehe Kommentar oben), waechst per Scale+Opacity
          aus der Button-Kante heraus. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={springTransition}
            style={{ position: "absolute", left: BUTTON_SIZE + GAP, top: 0, width, transformOrigin: "0 0" }}
            className={`z-10 overflow-hidden rounded-[20px] ${GLASS_CLASS}`}
          >
            <div className="flex flex-col gap-3" style={{ padding: PADDING }}>
              <div style={{ minHeight: BUTTON_SIZE }} className="flex items-center">
                {header}
              </div>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button - eigenstaendige, IMMER sichtbare Glas-Kreisform, liegt ueber
          dem Panel. Jonas' Vorgabe 2026-08-14: "der Button soll vorher aber
          genauso sein wie er immer war, ein animiertes icon usw." -
          AnimatedButton + PlusIcon/XIcon (animate-ui-Icons mit eigener
          Hover-Animation ueber IconHoverContext) statt einer selbstgebauten
          Linien-SVG. Icon-Wechsel per key-Fade - key haengt NUR an `open`,
          nicht an jedem Render (z. B. beim Tippen in den Maße-Feldern),
          sonst wuerde eine direkt im animate-Prop erzeugte Keyframe-Opacity
          bei JEDEM Render neu anspringen. */}
      <AnimatedButton
        type="button"
        data-tour={triggerDataTour}
        onClick={onToggle}
        aria-label={ariaLabel}
        className={`absolute left-0 top-0 z-20 flex items-center justify-center rounded-full text-brand-dark hover:text-brand dark:text-brand-light ${GLASS_CLASS}`}
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
