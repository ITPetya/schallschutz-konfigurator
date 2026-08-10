import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedButton } from "./AnimatedButton";
import { CopyIcon } from "./icons/CopyIcon";
import { CheckIcon } from "./icons/CheckIcon";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

// Kleiner Kopier-Button neben einem Messwert (Jonas' Vorgabe 2026-08-10:
// "Maße mit einem kleinen Copy-Symbol rechts daneben kopieren können") -
// Icon wechselt kurz auf einen Haken als Kopier-Bestaetigung, dann
// automatisch zurueck auf das Kopier-Symbol.
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard-API kann in seltenen Faellen (kein sicherer Kontext,
      // fehlende Berechtigung) fehlschlagen - dann bleibt es beim reinen
      // Anzeigewert, kein Absturz.
    }
  }

  return (
    <AnimatedButton
      type="button"
      onClick={handleCopy}
      aria-label={label ?? `${value} kopieren`}
      title={label ?? `${value} kopieren`}
      hoverScale={1.15}
      tapScale={0.9}
      className={`flex h-4 w-4 items-center justify-center text-slate-400 hover:text-brand dark:text-slate-500 ${className ?? ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="flex text-brand"
          >
            <CheckIcon size={12} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            <CopyIcon size={12} />
          </motion.span>
        )}
      </AnimatePresence>
    </AnimatedButton>
  );
}
