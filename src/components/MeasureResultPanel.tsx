import { AnimatePresence, motion } from "motion/react";
import type { MeasurePoint } from "../utils/measurePoints";

interface MeasureResultPanelProps {
  active: boolean;
  selected: MeasurePoint[]; // 0, 1 oder 2 Punkte
}

// Jonas' Vorgabe 2026-08-10: das Messen-Panel soll aus dem "Messen"-Button
// selbst entstehen/expandieren, nicht (wie zuerst gebaut) unten links bei
// Schnitt/Ansicht auftauchen - deshalb hier direkt neben dem Button in
// ViewerToolbar.tsx gerendert statt in SectionAndViewPanel.tsx. Wächst von
// rechts (transformOrigin) ein/aus, passend zur Button-Position am rechten
// Viewer-Rand.
export function MeasureResultPanel({ active, selected }: MeasureResultPanelProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="measure-panel"
          initial={{ opacity: 0, x: 12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ transformOrigin: "right center" }}
          className="w-56 rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800/95"
        >
          {selected.length < 2 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.length === 0 ? "Ersten Punkt anklicken" : "Zweiten Punkt anklicken"}
            </p>
          ) : (
            <MeasureResultRows a={selected[0].position} b={selected[1].position} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Jonas' Vorgabe 2026-08-10: "es sollen immer Abstaende in X,Y,Z Richtung
// gegeben werden und der direkte Abstand" - Betraege je Achse (nicht
// vorzeichenbehaftet, reine Distanz "wie weit auseinander") plus der
// euklidische Direktabstand als letzte, hervorgehobene Zeile.
function MeasureResultRows({ a, b }: { a: [number, number, number]; b: [number, number, number] }) {
  const dxMm = Math.round(Math.abs(a[0] - b[0]) * 1000);
  const dyMm = Math.round(Math.abs(a[1] - b[1]) * 1000);
  const dzMm = Math.round(Math.abs(a[2] - b[2]) * 1000);
  const directMm = Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000);

  return (
    <div className="space-y-1 text-xs">
      <MeasureRow label="X" valueMm={dxMm} />
      <MeasureRow label="Y" valueMm={dyMm} />
      <MeasureRow label="Z" valueMm={dzMm} />
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-brand-dark dark:border-slate-700 dark:text-brand-light">
        <span>Direkt</span>
        <span>{directMm} mm</span>
      </div>
    </div>
  );
}

function MeasureRow({ label, valueMm }: { label: string; valueMm: number }) {
  return (
    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
      <span>{label}</span>
      <span>{valueMm} mm</span>
    </div>
  );
}
