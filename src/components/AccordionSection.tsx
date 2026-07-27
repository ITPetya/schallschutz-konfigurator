import { useState, type ReactNode } from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { Chevron } from "./icons/Chevron";

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  // Fuer die interaktive Tour (Jonas' Vorgabe 2026-07-22) - landet als
  // data-tour auf dem AEUSSEREN Container, damit die Tour den Abschnitt auch
  // im geschlossenen Zustand anvisieren kann.
  tourId?: string;
}

// Ein- und ausklappbarer Abschnitt fuer die Seitenleiste (Jonas' Vorgabe
// 2026-07-22: "Grundeinstellungen"/"Darstellung"/"Einbauten" sollen alle
// ein- und ausklappbar sein). Baut auf Radix UI's Accordion-Primitive +
// Motion auf (Jonas' Vorgabe: Bausteine von animate-ui.com uebernehmen, siehe
// https://animate-ui.com/docs/components/radix/accordion) - animiertes
// Auf-/Zuklappen statt des vorherigen abrupten Ein-/Ausblendens.
export function AccordionSection({ title, defaultOpen = false, children, tourId }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <AccordionPrimitive.Root type="single" collapsible value={open ? "item" : ""} onValueChange={(v) => setOpen(v === "item")}>
      <AccordionPrimitive.Item value="item" data-tour={tourId} className="border-b border-slate-200 py-3 dark:border-slate-700">
        <AccordionPrimitive.Header>
          <AccordionPrimitive.Trigger className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-widest text-brand">
            {title}
            <Chevron direction={open ? "up" : "down"} className="text-brand-light" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AnimatePresence initial={false}>
          {open && (
            <AccordionPrimitive.Content asChild forceMount>
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0, y: -8 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-3">{children}</div>
              </motion.div>
            </AccordionPrimitive.Content>
          )}
        </AnimatePresence>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
}
