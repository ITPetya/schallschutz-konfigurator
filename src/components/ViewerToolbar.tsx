import { AnimatedButton } from "./AnimatedButton";
import { HomeIcon } from "./icons/HomeIcon";
import { UndoIcon } from "./icons/UndoIcon";
import { RedoIcon } from "./icons/RedoIcon";
import { RulerIcon } from "./icons/RulerIcon";

interface ViewerToolbarProps {
  onReset: () => void;
  // Optional (Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für
  // strg+z usw.") - fehlen im schreibgeschuetzten Viewer (KonfiguratorPage.tsx),
  // dort gibt es nichts rueckgaengig zu machen.
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  // Jonas' Vorgabe 2026-08-10: Messwerkzeug (wie in Inventor) - optional,
  // weil nicht jeder Viewer (z. B. der schreibgeschuetzte Konstrukteur-
  // Viewer) es unbedingt anbieten muss.
  measureActive?: boolean;
  onToggleMeasure?: () => void;
}

// Home-Button direkt neben dem ViewCube (Jonas' Vorgabe 2026-07-25: "wie bei
// Inventor ausgeführt ... auch da beim ViewCube") - Rückgängig/Wiederholen
// dagegen bewusst NICHT dort, sondern oben rechts im Viewer (Jonas' Vorgabe
// 2026-07-25: "die vor und zurück buttons sollten oben rechts im viewer
// sein"), gleicher Button-Stil (halbtransparenter weisser Kreis) an beiden
// Stellen.
export function ViewerToolbar({ onReset, onUndo, onRedo, canUndo, canRedo, measureActive, onToggleMeasure }: ViewerToolbarProps) {
  return (
    <>
      {onUndo && onRedo && (
        <div data-tour="viewer-toolbar" className="absolute right-4 top-4 flex gap-1.5">
          <ToolButton onClick={onUndo} disabled={!canUndo} label="Rückgängig (Strg+Z)">
            <UndoIcon size={15} />
          </ToolButton>
          <ToolButton onClick={onRedo} disabled={!canRedo} label="Wiederholen (Strg+Y)">
            <RedoIcon size={15} />
          </ToolButton>
        </div>
      )}
      {/* Jonas' Vorgabe 2026-08-10: eigene, vertikale, mittig am rechten
          Viewer-Rand schwebende Werkzeugleiste fuer "Messen" und kuenftige
          Werkzeuge - gleiche Positionierungs-Konvention wie der bestehende
          Seitenleiste-einklappen-Button (WorkspacePage.tsx:
          "absolute left-2 top-1/2 -translate-y-1/2"), hier auf die rechte
          Seite gespiegelt. */}
      {onToggleMeasure && (
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
          <ToolButton onClick={onToggleMeasure} label="Messen" active={measureActive}>
            <RulerIcon size={15} />
          </ToolButton>
        </div>
      )}
      {/* Jonas' Vorgabe 2026-07-25: "oben rechts vom ViewCube ... fluchtend
          mit der rechten Außenkante des Würfels" - GizmoHelper platziert den
          Wuerfel mit margin=[80,80] (Zentrum 80px von rechts/unten), die
          Box selbst ist 60px breit -> rechte Kante liegt bei rechts ~35px
          von der Canvas-Kante, obere Kante bei unten ~110-125px (die
          Iso-Ansicht des Wuerfels ragt diagonal etwas darueber hinaus). */}
      <div className="absolute bottom-[150px] right-[34px]">
        <ToolButton onClick={onReset} label="Ansicht zurücksetzen">
          <HomeIcon size={16} />
        </ToolButton>
      </div>
      {/* Unsichtbarer Anker fuer die Tutorial-Tour (Jonas' Vorgabe 2026-07-25:
          "auch der ViewCube ... soll im Tutorial angezeigt werden") - der
          ViewCube selbst ist WebGL (drei's GizmoHelper), kein echtes
          DOM-Element mit eigenen Attributen, deshalb dieser positionsgleiche
          Platzhalter statt eines echten Tour-Ziels darauf. */}
      <div data-tour="viewcube-anchor" aria-hidden className="pointer-events-none absolute bottom-4 right-4 h-24 w-24" />
    </>
  );
}

function ToolButton({
  onClick,
  disabled,
  label,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  // Gefuellter Zustand fuer Umschalt-Buttons (bisher gab's hier nur
  // Einmal-Aktionen) - Jonas' Vorgabe 2026-08-10, Messwerkzeug-Toggle.
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatedButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={
        active
          ? "flex h-8 w-8 items-center justify-center rounded-full border border-brand bg-brand text-white shadow-sm"
          : "flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400"
      }
    >
      {children}
    </AnimatedButton>
  );
}
