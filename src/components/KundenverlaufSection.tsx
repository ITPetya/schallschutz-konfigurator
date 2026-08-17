import { AccordionSection } from "./AccordionSection";
import type { KundenverlaufEintrag } from "../config/kundenverlauf";

interface KundenverlaufSectionProps {
  entries: KundenverlaufEintrag[] | undefined;
}

// Jonas' Vorgabe 2026-08-17: zusaetzliches Lead-Signal fuers Team - zeigt,
// was dieser Nutzer/Browser in der Vergangenheit sonst noch konfiguriert
// hat (siehe config/kundenverlauf.ts). Von KonfiguratorPage.tsx UND
// InternalProjectViewer.tsx geteilt, beide NUR wenn ihr showKundenverlauf-
// Prop gesetzt ist (Jonas' Vorgabe: "nur im /intern Bereich anzeigen" -
// dieselben Seiten werden auch vom oeffentlichen /ansehen-Viewer genutzt,
// siehe ProjectViewerPage.tsx, das dieses Prop bewusst NICHT setzt).
export function KundenverlaufSection({ entries }: KundenverlaufSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <AccordionSection title="Kundenverlauf">
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-brand-dark dark:text-brand-light">{entry.projektName}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(entry.zuletztBearbeitet).toLocaleDateString("de-DE")}</span>
            </div>
            {entry.standort && <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{entry.standort}</p>}
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {entry.container.map((c, j) => (
                <li key={j}>
                  <span className="font-medium">{c.label}</span> – {c.groesse}
                  {c.schallschutzklasse && <> · {c.schallschutzklasse}</>}
                  {c.einbauten.length > 0 && <> · {c.einbauten.join(", ")}</>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AccordionSection>
  );
}
