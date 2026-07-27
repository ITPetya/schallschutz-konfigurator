import type { ReactNode } from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";

interface AlertDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  children: ReactNode;
}

// Gemeinsames Geruest fuer ThreeOptionConfirmDialog/ConfirmDialog - baut auf
// Radix UI's Alert-Dialog-Primitive + Motion auf (Jonas' Vorgabe: Bausteine
// von animate-ui.com uebernehmen, siehe
// https://animate-ui.com/docs/components/radix/alert-dialog) - dadurch jetzt
// mit echter Ein-/Ausblend-Animation statt des vorherigen abrupten
// Erscheinens/Verschwindens (bedingt gerendert, ohne Exit-Animation
// moeglich). Anders als das Original dort ist dies bewusst EIN einzelnes,
// in sich geschlossenes Bauteil statt eines compound components mit eigenem
// Trigger - unsere Dialoge werden immer programmatisch (per State)
// geoeffnet, nie ueber einen Radix-Trigger.
export function AlertDialogShell({ open, onOpenChange, title, message, children }: AlertDialogShellProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialogPrimitive.Portal forceMount>
            <AlertDialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
            </AlertDialogPrimitive.Overlay>
            <AlertDialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <motion.div
                  className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <AlertDialogPrimitive.Title className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">
                    {title}
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                    {message}
                  </AlertDialogPrimitive.Description>
                  {children}
                </motion.div>
              </motion.div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </AlertDialogPrimitive.Root>
  );
}
