import { useState, type ReactNode } from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { AnimatePresence, motion, type TargetAndTransition } from "motion/react";

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
          {/* Rotation rein ueber CSS am data-state-Attribut statt React-State
              (Jonas' Vorgabe: 1:1 wie https://animate-ui.com/docs/components/radix/accordion,
              dort dreht sich das Chevron per "[&[data-state=open]>svg]:rotate-180"). cursor-pointer
              explizit statt nur ueber die globale button-Regel in index.css (Jonas'
              Fehlerbericht 2026-08-10: "diese Hand fehlt noch, wenn man über diese
              ausklappbaren Menüpunkte links in der Seitenleiste hovert"). */}
          <AccordionPrimitive.Trigger className="flex w-full cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-widest text-brand [&[data-state=open]>svg]:rotate-180">
            {title}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-brand-light transition-transform duration-200"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AnimatePresence initial={false}>
          {open && (
            <AccordionPrimitive.Content asChild forceMount>
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0, "--mask-stop": "0%", y: 20 } as TargetAndTransition}
                animate={{ height: "auto", opacity: 1, "--mask-stop": "100%", y: 0 } as TargetAndTransition}
                exit={{ height: 0, opacity: 0, "--mask-stop": "0%", y: 20 } as TargetAndTransition}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                style={{
                  maskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
                  WebkitMaskImage: "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
                  overflow: "hidden",
                }}
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
