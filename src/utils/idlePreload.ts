// Kleines, wiederverwendbares Werkzeug fuer "intelligentes Vorladen" -
// startet eine gegebene Funktion (typischerweise ein dynamisches import(),
// um einen React.lazy()-Chunk vorzuwaermen), sobald der Haupt-Thread
// tatsaechlich frei ist, statt sofort beim Mounten zu blockieren. Jonas'
// Vorgabe 2026-08-11 ("intelligentes Vorladen", siehe StartPage.tsx fuer die
// erste Anwendung): Leerlaufzeit nutzen, NICHT pauschal alles beim
// App-Start laden - das wuerde nur mit dem wirklich zeitkritischen initialen
// Rendern konkurrieren, siehe die lange Begruendung dort.
//
// requestIdleCallback fehlt in Safari (Stand 2026) komplett - der
// setTimeout-Fallback simuliert "irgendwann bald, aber nicht sofort" mit
// einer kurzen Verzoegerung statt einer echten Leerlauf-Erkennung; das ist
// fuer diesen Zweck (ein Sekundenbruchteile bis wenige Sekunden nach dem
// Seitenaufbau bereits absehbar noetiges Chunk vorladen) ausreichend genau.
type IdleCallbackWindow = typeof window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const SET_TIMEOUT_FALLBACK_DELAY_MS = 1500;

// Gibt eine Abbruchfunktion zurueck, damit Aufrufer (z. B. bei einem sehr
// schnellen Unmount, unwahrscheinlich aber billig abzusichern) das geplante
// Vorladen wieder canceln koennen, statt es nach dem Verlassen der Seite
// trotzdem noch auszufuehren.
export function schedulePreload(task: () => void): () => void {
  const w = window as IdleCallbackWindow;
  if (typeof w.requestIdleCallback === "function") {
    const handle = w.requestIdleCallback(() => task(), { timeout: 4000 });
    return () => w.cancelIdleCallback?.(handle);
  }
  const timeoutHandle = window.setTimeout(task, SET_TIMEOUT_FALLBACK_DELAY_MS);
  return () => window.clearTimeout(timeoutHandle);
}
