import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "motion/react";
import { useControlledState } from "../../hooks/useControlledState";
import { getStrictContext } from "../../lib/getStrictContext";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/dialog - anders als
// Alert-Dialog per Klick daneben/Escape schliessbar (siehe
// AlertDialogShell.tsx fuer das Pendant ohne Aussen-Klick-Schliessen).
interface DialogContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const [DialogProvider, useDialog] = getStrictContext<DialogContextType>("DialogContext");

type DialogProps = ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <DialogProvider value={{ isOpen, setIsOpen }}>
      <DialogPrimitive.Root data-slot="dialog" {...props} onOpenChange={setIsOpen} />
    </DialogProvider>
  );
}

type DialogPortalProps = Omit<ComponentProps<typeof DialogPrimitive.Portal>, "forceMount">;

function DialogPortal(props: DialogPortalProps) {
  const { isOpen } = useDialog();
  return <AnimatePresence>{isOpen && <DialogPrimitive.Portal data-slot="dialog-portal" forceMount {...props} />}</AnimatePresence>;
}

type DialogOverlayProps = Omit<ComponentProps<typeof DialogPrimitive.Overlay>, "forceMount" | "asChild"> & HTMLMotionProps<"div">;

function DialogOverlay({ transition, ...props }: DialogOverlayProps & { transition?: Transition }) {
  return (
    <DialogPrimitive.Overlay data-slot="dialog-overlay" asChild forceMount>
      <motion.div
        key="dialog-overlay"
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, filter: "blur(4px)" }}
        transition={transition ?? { duration: 0.2, ease: "easeInOut" }}
        {...props}
      />
    </DialogPrimitive.Overlay>
  );
}

type DialogContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, "forceMount" | "asChild"> &
  HTMLMotionProps<"div"> & { from?: "top" | "bottom" | "left" | "right"; transition?: Transition };

function DialogContent({
  from = "top",
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  transition,
  ...props
}: DialogContentProps) {
  const initialRotation = from === "bottom" || from === "left" ? "20deg" : "-20deg";
  const isVertical = from === "top" || from === "bottom";
  const rotateAxis = isVertical ? "rotateX" : "rotateY";

  return (
    <DialogPrimitive.Content
      asChild
      forceMount
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
      onEscapeKeyDown={onEscapeKeyDown}
      onPointerDownOutside={onPointerDownOutside}
      onInteractOutside={onInteractOutside}
    >
      <motion.div
        key="dialog-content"
        data-slot="dialog-content"
        initial={{
          opacity: 0,
          filter: "blur(4px)",
          transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
        }}
        animate={{
          opacity: 1,
          filter: "blur(0px)",
          transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
        }}
        exit={{
          opacity: 0,
          filter: "blur(4px)",
          transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
        }}
        transition={transition ?? { type: "spring", stiffness: 150, damping: 25 }}
        {...props}
      />
    </DialogPrimitive.Content>
  );
}

type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>;
function DialogTitle(props: DialogTitleProps) {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>;
function DialogDescription(props: DialogDescriptionProps) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />;
}

export { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, useDialog };
