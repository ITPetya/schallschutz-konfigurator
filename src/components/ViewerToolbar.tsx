import { AnimatedButton } from "./AnimatedButton";
import { HomeIcon } from "./icons/HomeIcon";
import { UndoIcon } from "./icons/UndoIcon";
import { RedoIcon } from "./icons/RedoIcon";

interface ViewerToolbarProps {
  onReset: () => void;
  // Optional (Jonas' Vorgabe 2026-07-25: "vor und zurück buttons ... für
  // strg+z usw.") - fehlen im schreibgeschuetzten Viewer (KonfiguratorPage.tsx),
  // dort gibt es nichts rueckgaengig zu machen.
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// Kleine Button-Gruppe oben-links neben dem ViewCube, gleicher Stil wie
// dieser (halbtransparenter weisser Kreis) - Home ganz rechts (dort, wo der
// Button vorher allein stand), Rückgängig/Wiederholen links davon, falls
// vorhanden.
export function ViewerToolbar({ onReset, onUndo, onRedo, canUndo, canRedo }: ViewerToolbarProps) {
  return (
    <>
      <div data-tour="viewer-toolbar" className="absolute bottom-[124px] right-[62px] flex gap-1.5">
        {onUndo && onRedo && (
          <>
            <ToolButton onClick={onUndo} disabled={!canUndo} label="Rückgängig (Strg+Z)">
              <UndoIcon size={15} />
            </ToolButton>
            <ToolButton onClick={onRedo} disabled={!canRedo} label="Wiederholen (Strg+Y)">
              <RedoIcon size={15} />
            </ToolButton>
          </>
        )}
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
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatedButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500"
    >
      {children}
    </AnimatedButton>
  );
}
