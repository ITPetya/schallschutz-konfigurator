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

// Home-Button direkt neben dem ViewCube (Jonas' Vorgabe 2026-07-25: "wie bei
// Inventor ausgeführt ... auch da beim ViewCube") - Rückgängig/Wiederholen
// dagegen bewusst NICHT dort, sondern oben rechts im Viewer (Jonas' Vorgabe
// 2026-07-25: "die vor und zurück buttons sollten oben rechts im viewer
// sein"), gleicher Button-Stil (halbtransparenter weisser Kreis) an beiden
// Stellen.
export function ViewerToolbar({ onReset, onUndo, onRedo, canUndo, canRedo }: ViewerToolbarProps) {
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
      <div className="absolute bottom-[124px] right-[62px]">
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
