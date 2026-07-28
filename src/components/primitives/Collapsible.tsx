import type { ComponentProps } from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from "motion/react";
import { getStrictContext } from "../../lib/getStrictContext";
import { useControlledState } from "../../hooks/useControlledState";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/collapsible - fuer die
// "Schnitt"/"Ansicht"-Klapp-Panels im Viewer (SectionAndViewPanel.tsx), die
// bisher reine Custom-Toggles ohne echtes Primitive darunter waren.
interface CollapsibleContextType {
  isOpen: boolean;
}

const [CollapsibleProvider, useCollapsible] = getStrictContext<CollapsibleContextType>("CollapsibleContext");

type CollapsibleProps = ComponentProps<typeof CollapsiblePrimitive.Root>;

function Collapsible(props: CollapsibleProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <CollapsibleProvider value={{ isOpen }}>
      <CollapsiblePrimitive.Root data-slot="collapsible" {...props} onOpenChange={setIsOpen} />
    </CollapsibleProvider>
  );
}

type CollapsibleTriggerProps = ComponentProps<typeof CollapsiblePrimitive.Trigger>;

function CollapsibleTrigger(props: CollapsibleTriggerProps) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

type CollapsibleContentProps = Omit<ComponentProps<typeof CollapsiblePrimitive.Content>, "asChild" | "forceMount"> &
  HTMLMotionProps<"div"> & { transition?: Transition };

function CollapsibleContent({ transition, ...props }: CollapsibleContentProps) {
  const { isOpen } = useCollapsible();

  return (
    <AnimatePresence>
      {isOpen && (
        <CollapsiblePrimitive.Content asChild forceMount>
          <motion.div
            key="collapsible-content"
            data-slot="collapsible-content"
            initial={{ opacity: 0, height: 0, y: 8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 8 }}
            transition={transition ?? { duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            {...props}
          />
        </CollapsiblePrimitive.Content>
      )}
    </AnimatePresence>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, useCollapsible };
