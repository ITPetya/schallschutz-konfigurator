import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAuthPopover } from "../layout/AuthPopoverContext";

// Zentrierter Startbildschirm (Jonas' Vorgabe 2026-07-22): "Konfiguration
// starten" + "Anmelden" mittig, im Stil der lc.systems-Optik.
export function StartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open: openAuth } = useAuthPopover();

  return (
    // z-0 (nicht nur "relative") ist noetig, damit dieses Element einen
    // EIGENEN Stacking-Context aufmacht - sonst "entkommen" die -z-10-Kinder
    // bis zum naechsten Vorfahren, der einen aufmacht, und werden dort HINTER
    // dessen normalem (nicht positioniertem) bg-white gemalt, das faelschlich
    // "spaeter" gezeichnet wird (Debugging-Fund 2026-07-22).
    <div className="relative z-0 flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center">
      {/* Platzhalter-Hintergrund (Jonas' Vorgabe 2026-07-22: "wie hinter
          Milchglas", nicht extrem - Bild wird spaeter ersetzt). scale-110
          verhindert, dass der Weichzeichner am Bildrand einen harten Rand
          durchscheinen laesst; das halbtransparente weisse Overlay erzeugt
          den Milchglas-Effekt und haelt den Text darueber lesbar. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: "url(/start-background.svg)" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-white/55" />

      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-brand-dark">
          Schallschutz-Sondercontainer
        </h1>
        <p className="mt-2 text-slate-500">3D-Konfigurator für individuelle Sondercontainer</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate("/konfigurator")}
          className="rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
        >
          Konfiguration starten
        </button>
        {!user && (
          <button
            type="button"
            onClick={openAuth}
            className="rounded-full border-2 border-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand hover:text-white"
          >
            Anmelden
          </button>
        )}
      </div>
    </div>
  );
}
