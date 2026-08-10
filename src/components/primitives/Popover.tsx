import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "motion/react";
import { useControlledState } from "../../hooks/useControlledState";
import { getStrictContext } from "../../lib/getStrictContext";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/popover - Aufbau identisch
// zu DropdownMenu.tsx (selbes Grundmuster: Controlled-State-Context +
// AnimatePresence-Portal), nur mit Popover-Primitive statt DropdownMenu, da
// dort KEIN Menü mit Items gebraucht wird, sondern ein einzelner
// Info-Inhalt (siehe SonderBadge.tsx: Aufpreis-Hinweistext statt
// Auswahlliste).
interface PopoverContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const [PopoverProvider, usePopover] = getStrictContext<PopoverContextType>("PopoverContext");

type PopoverProps = ComponentProps<typeof PopoverPrimitive.Root>;

function Popover(props: PopoverProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <PopoverProvider value={{ isOpen, setIsOpen }}>
      <PopoverPrimitive.Root data-slot="popover" {...props} onOpenChange={setIsOpen} />
    </PopoverProvider>
  );
}

type PopoverTriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger>;

function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

type PopoverContentProps = Omit<ComponentProps<typeof PopoverPrimitive.Content>, "forceMount" | "asChild"> &
  HTMLMotionProps<"div"> & { transition?: Transition };

function PopoverContent({
  onOpenAutoFocus,
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
}: PopoverContentProps) {
  const { isOpen } = usePopover();

  return (
    <AnimatePresence>
      {isOpen && (
        <PopoverPrimitive.Portal forceMount data-slot="popover-portal">
          <PopoverPrimitive.Content
            asChild
            onOpenAutoFocus={onOpenAutoFocus}
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
              key="popover-content"
              data-slot="popover-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transition ?? { duration: 0.2 }}
              style={{ willChange: "opacity, transform", ...style }}
              {...props}
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export { Popover, PopoverTrigger, PopoverContent, usePopover };
