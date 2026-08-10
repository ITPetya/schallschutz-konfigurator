import { AnimatePresence, motion } from "motion/react";

interface ToolResultPanelProps {
  active: boolean;
  width?: string;
  children: React.ReactNode;
}

// Gemeinsame Huelle fuer alle "aus dem Werkzeug-Button entstehenden" Panels
// (Schnitt/Ansicht/Messen, siehe ViewerToolbar.tsx) - Jonas' Vorgabe
// 2026-08-10: Schnitt/Ansicht sollen "genauso wie Messen" funktionieren,
// inklusive derselben Wachse-aus-dem-Button-Animation. Vorher hatte nur
// Messen dieses Verhalten (MeasureResultPanel.tsx), jetzt gemeinsam
// ausgelagert statt dreifach dupliziert.
export function ToolResultPanel({ active, width = "w-64", children }: ToolResultPanelProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, x: 12, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ transformOrigin: "right center" }}
          className={`${width} rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800/95`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
