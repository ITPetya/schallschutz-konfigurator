import type { ComponentProps } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "motion/react";
import { useControlledState } from "../../hooks/useControlledState";
import { getStrictContext } from "../../lib/getStrictContext";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/dropdown-menu - vereinfacht
// gegenueber dem Original: ohne den optionalen "Highlight"-Hover-Effekt
// (gleitender Hintergrund hinter dem gerade fokussierten Eintrag), da dafuer
// zusaetzliche Bounding-Box-Tracking-Infrastruktur noetig waere, die fuer
// unsere kurzen, einfachen Menüs (Hilfe-Menü, Projekt-laden-Auswahl) keinen
// spuerbaren Mehrwert haette - Ein-/Ausblenden + Skalierungs-Animation
// bleiben erhalten.
interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const [DropdownMenuProvider, useDropdownMenu] = getStrictContext<DropdownMenuContextType>("DropdownMenuContext");

type DropdownMenuProps = ComponentProps<typeof DropdownMenuPrimitive.Root>;

function DropdownMenu(props: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <DropdownMenuProvider value={{ isOpen, setIsOpen }}>
      <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} onOpenChange={setIsOpen} />
    </DropdownMenuProvider>
  );
}

type DropdownMenuTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.Trigger>;

function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type DropdownMenuContentProps = Omit<ComponentProps<typeof DropdownMenuPrimitive.Content>, "forceMount" | "asChild"> &
  HTMLMotionProps<"div"> & { transition?: Transition };

function DropdownMenuContent({
  loop,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  side,
  sideOffset,
  align,
  alignOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition,
  style,
  ...props
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdownMenu();

  return (
    <AnimatePresence>
      {isOpen && (
        <DropdownMenuPrimitive.Portal forceMount data-slot="dropdown-menu-portal">
          <DropdownMenuPrimitive.Content
            asChild
            loop={loop}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
            onFocusOutside={onFocusOutside}
            onInteractOutside={onInteractOutside}
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
            avoidCollisions={avoidCollisions}
            collisionBoundary={collisionBoundary}
            collisionPadding={collisionPadding}
            arrowPadding={arrowPadding}
            sticky={sticky}
            hideWhenDetached={hideWhenDetached}
          >
            <motion.div
              key="dropdown-menu-content"
              data-slot="dropdown-menu-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition ?? { duration: 0.2 }}
              style={{ willChange: "opacity, transform", ...style }}
              {...props}
            />
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

type DropdownMenuItemProps = Omit<ComponentProps<typeof DropdownMenuPrimitive.Item>, "asChild"> & HTMLMotionProps<"div">;

function DropdownMenuItem({ disabled, onSelect, textValue, ...props }: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item disabled={disabled} onSelect={onSelect} textValue={textValue} asChild>
      <motion.div data-slot="dropdown-menu-item" data-disabled={disabled} {...props} />
    </DropdownMenuPrimitive.Item>
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, useDropdownMenu };
