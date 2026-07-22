import { useEffect, useState } from "react";
import { useTour } from "./TourContext";

const PAD = 6;
const MAX_ATTEMPTS = 30; // 30 * 100ms = 3s, dann wird der Schritt uebersprungen

// Abgedunkeltes Umfeld ("Spotlight") um das Zielelement + eine Sprechblase
// daneben (Jonas' Fehlerbericht 2026-07-23: "Das Tutorial soll sich mehr vom
// Drumherum abheben, das erkennt man nicht so wirklich" - eine reine
// Umrandung ohne Abdunkelung ging im normalen UI unter). Die Abdunkelung
// haengt als riesiger box-shadow direkt am Rahmen-Div, NICHT an einem
// eigenen Vollbild-Backdrop, UND bleibt pointer-events:none - die App ist
// waehrend der Tour weiterhin normal bedienbar, nur optisch fokussiert.
// Findet das Zielelement per data-tour-Selektor per Polling (nicht per
// einmaligem querySelector), da es z. B. nach einem Routenwechsel erst mit
// Verzoegerung im DOM auftaucht.
export function TourOverlay() {
  const { currentStep, stepIndex, stepCount, next, prev, stop } = useTour();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(null);
    if (!currentStep) return;

    let attempts = 0;
    let cancelled = false;
    let frame: number;

    function measure() {
      if (cancelled || !currentStep) return;
      const el = document.querySelector(currentStep.selector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
        frame = requestAnimationFrame(measure);
        return;
      }
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        next(); // Zielelement taucht nicht auf - Schritt ueberspringen statt haengenzubleiben
        return;
      }
      frame = requestAnimationFrame(measure);
    }
    frame = requestAnimationFrame(measure);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  if (!currentStep || !rect) return null;

  const placement = currentStep.placement ?? (rect.top > window.innerHeight / 2 ? "top" : "bottom");
  const tooltipWidth = 300;
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - tooltipWidth - 12);
  const top = placement === "bottom" ? rect.bottom + PAD + 10 : undefined;
  const bottom = placement === "top" ? window.innerHeight - rect.top + PAD + 10 : undefined;

  return (
    <>
      <div
        className="pointer-events-none fixed z-[100] rounded-md border-2 border-brand transition-all duration-150"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          // Ring ums Zielelement + riesiger Schatten ringsherum verdunkelt
          // den Rest der Seite ("Spotlight") - macht den aktiven Schritt
          // sofort erkennbar, ohne ein separates Backdrop-Element zu brauchen.
          boxShadow: "0 0 0 4px rgba(0,142,180,0.35), 0 0 0 9999px rgba(15,23,42,0.6)",
        }}
      />
      <div
        className="fixed z-[101] w-[300px] rounded-lg border-t-4 border-brand bg-white p-4 text-sm shadow-2xl"
        style={{ left, top, bottom }}
      >
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand">
          {currentStep.title} · {stepIndex + 1}/{stepCount}
        </p>
        <p className="mb-3 text-slate-600">{currentStep.body}</p>
        <div className="flex items-center justify-between">
          <button type="button" onClick={stop} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            Überspringen
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Zurück
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
            >
              {stepIndex + 1 >= stepCount ? "Fertig" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
