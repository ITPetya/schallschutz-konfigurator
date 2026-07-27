import { useCallback, useEffect, useMemo, useState, type ComponentProps, type CSSProperties } from "react";
import { getStrictContext } from "../../lib/getStrictContext";
import { cn } from "../../lib/utils";
import { AnimatedButton } from "../AnimatedButton";
import { Chevron } from "../icons/Chevron";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/sidebar - das Original ist
// eine Navigations-/Menü-Sidebar mit eigenem Farbschema und zusaetzlichen
// Sheet-/Tooltip-/Skeleton-Unterbausteinen fuer mobile Ansicht und
// Icon-only-Kollaps, die es in unserem Bearbeitungs-Panel (Accordion-
// Sektionen + Formulare statt Nav-Menü) nicht gibt - deshalb hier reduziert
// auf die Struktur, die wir tatsaechlich nutzen (Provider, Sidebar-
// Container, Trigger, Header/Content/Footer/Group), mit unseren eigenen
// Tailwind-Farben statt shadcn's --sidebar-*-Variablen. Das eigentliche
// Kollaps-Prinzip (reine CSS-transition auf Breite, gesteuert per
// data-collapsible-Attribut) ist 1:1 vom Original uebernommen.
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "20rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextProps {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const [SidebarContextProvider, useSidebar] = getStrictContext<SidebarContextProps>("SidebarContext");

interface SidebarProviderProps extends ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: SidebarProviderProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  const setOpen = useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(next);
      else setOpenState(next);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [open, setOpenProp],
  );

  const toggleSidebar = useCallback(() => setOpen((v) => !v), [setOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state: "expanded" | "collapsed" = open ? "expanded" : "collapsed";
  const contextValue = useMemo<SidebarContextProps>(() => ({ state, open, setOpen, toggleSidebar }), [state, open, setOpen, toggleSidebar]);

  return (
    <SidebarContextProvider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={{ "--sidebar-width": SIDEBAR_WIDTH, ...style } as CSSProperties}
        className={cn("group/sidebar-wrapper relative flex h-full w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContextProvider>
  );
}

interface SidebarProps extends ComponentProps<"div"> {
  collapsible?: "offcanvas" | "none";
}

function Sidebar({ collapsible = "offcanvas", className, children, ...props }: SidebarProps) {
  const { state } = useSidebar();

  if (collapsible === "none") {
    return (
      <div data-slot="sidebar" className={cn("flex h-full w-(--sidebar-width) flex-col", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className="group" data-state={state} data-collapsible={state === "collapsed" ? collapsible : ""} data-slot="sidebar">
      {/* Reserviert den Platz im Flex-Layout, schrumpft beim Einklappen auf 0 -
          der eigentlich sichtbare, gleitende Container liegt absolut darueber
          (siehe sidebar-container unten). */}
      <div
        data-slot="sidebar-gap"
        className="relative w-(--sidebar-width) bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.7,-0.15,0.25,1.15)] group-data-[collapsible=offcanvas]:w-0"
      />
      <div
        data-slot="sidebar-container"
        className="absolute inset-y-0 left-0 z-10 flex h-full w-(--sidebar-width) border-r border-slate-200 transition-[left,width] duration-300 ease-[cubic-bezier(0.75,0,0.25,1)] group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
      >
        <div data-slot="sidebar-inner" className={cn("flex h-full w-full flex-col overflow-hidden bg-slate-50", className)} {...props}>
          {children}
        </div>
      </div>
    </div>
  );
}

type SidebarTriggerProps = ComponentProps<typeof AnimatedButton>;

function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <AnimatedButton
      type="button"
      data-slot="sidebar-trigger"
      aria-label={state === "expanded" ? "Seitenleiste einklappen" : "Seitenleiste ausklappen"}
      title={`Seitenleiste ${state === "expanded" ? "einklappen" : "ausklappen"} (Strg+B)`}
      hoverScale={1.1}
      tapScale={0.9}
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      className={cn("flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm hover:border-brand hover:text-brand", className)}
      {...props}
    >
      <Chevron direction={state === "expanded" ? "left" : "right"} />
    </AnimatedButton>
  );
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 border-b border-slate-200 p-4", className)} {...props} />;
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("border-t border-slate-200 p-3", className)} {...props} />;
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn("flex h-8 shrink-0 items-center px-1 text-xs font-bold uppercase tracking-widest text-brand", className)}
      {...props}
    />
  );
}

function SidebarSeparator({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-separator" className={cn("mx-1 my-2 h-px bg-slate-200", className)} {...props} />;
}

export {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
};
