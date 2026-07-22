import { useState, type ReactNode } from "react";

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// Ein- und ausklappbarer Abschnitt fuer die Seitenleiste (Jonas' Vorgabe
// 2026-07-22: "Grundeinstellungen"/"Darstellung"/"Einbauten" sollen alle
// ein- und ausklappbar sein).
export function AccordionSection({ title, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 py-3 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-widest text-brand"
      >
        {title}
        <span className="text-base leading-none text-brand-light">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
