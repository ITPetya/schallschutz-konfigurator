import type { Opening } from "../types/openings";
import { OPENING_TYPES, PANEL_LABELS } from "../constants/openingTypes";
import { positionLabels } from "../utils/panelGeometry";

interface OpeningsSummaryProps {
  openings: Opening[];
}

// Read-only Gegenstueck zu OpeningsPanel fuer den Konstrukteur-Viewer (Jonas'
// Vorgabe 2026-07-22: "da sind dann anstatt links die Sachen zur Konfig die
// Durchbrueche etc. aufgelistet, also alle Details wo was ist") - keine
// Eingabefelder, nur Werte.
export function OpeningsSummary({ openings }: OpeningsSummaryProps) {
  if (openings.length === 0) {
    return <p className="text-sm text-slate-400">Keine Durchbrüche platziert.</p>;
  }

  return (
    <div className="space-y-2">
      {openings.map((o) => {
        const typeDef = OPENING_TYPES[o.kind];
        const [uLabel, vLabel] = positionLabels(o.panel, !!typeDef.isDoor);
        return (
          <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-brand-dark">{typeDef.label}</span>
              <span className="text-xs text-slate-500">{PANEL_LABELS[o.panel]}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
              <dt className="text-slate-400">{uLabel}</dt>
              <dd>{Math.round(o.u)} mm</dd>
              <dt className="text-slate-400">{vLabel}</dt>
              <dd>{Math.round(o.v)} mm</dd>
              <dt className="text-slate-400">{typeDef.shape === "round" ? "Durchmesser" : "Breite"}</dt>
              <dd>{Math.round(o.width)} mm</dd>
              {typeDef.shape === "rect" && (
                <>
                  <dt className="text-slate-400">Höhe</dt>
                  <dd>{Math.round(o.height)} mm</dd>
                </>
              )}
              {o.hinge && (
                <>
                  <dt className="text-slate-400">Bandseite</dt>
                  <dd>{o.hinge === "left" ? "DIN Links" : "DIN Rechts"}</dd>
                </>
              )}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
