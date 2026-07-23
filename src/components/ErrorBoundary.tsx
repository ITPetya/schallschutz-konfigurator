import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Performance-/Robustheits-Audit 2026-07-23: bisher gab es KEINE
// Error Boundary - ein Absturz in der 3D-Geometrie (z. B. eine
// entartete CSG-Berechnung bei einer extremen, aber vom Zahlenfeld
// technisch erlaubten Kombination aus Containermassen und Durchbruch-
// Position) hat die komplette Seite weiss/leer gerissen, ohne
// Wiederherstellungsmoeglichkeit ausser manuellem Neuladen. Die
// automatische Zwischensicherung (draftStore.ts) macht ein Neuladen
// aber bereits sicher - diese Boundary faengt den Absturz ab und bietet
// genau diesen Reload direkt als Knopf an, statt einer leeren Seite.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught a crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-dark">
            Etwas ist schiefgelaufen
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            Die Ansicht ist abgestürzt. Dein letzter Bearbeitungsstand wurde automatisch
            zwischengespeichert und wird beim Neuladen wiederhergestellt.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
