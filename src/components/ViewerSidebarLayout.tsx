import type { ReactNode } from "react";
import { useIsPhoneViewport } from "../hooks/useIsPhoneViewport";
import { SidebarProvider, Sidebar, SidebarContent, useSidebar } from "./primitives/Sidebar";
import { AnimatedButton } from "./AnimatedButton";
import { MenuIcon } from "./icons/MenuIcon";

interface ViewerSidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

// Gemeinsames Seitenleiste-links/Viewer-rechts-Layout fuer die
// schreibgeschuetzten Viewer-Seiten (KonfiguratorPage.tsx,
// InternalProjectViewer.tsx - beide hatten bislang identischen
// aside/main-Code). Auf Desktop/Tablet unveraendert eine feste, immer
// sichtbare Seitenleiste. Auf dem Handy (Jonas' Vorgabe 2026-07-29: "der
// Button zum ein und ausfahren der Seitenleiste muss wieder da sein, [...]
// oben links vom Viewer [...] ein Menü-Button, diese 3 Striche") stattdessen
// dieselbe animierte Sidebar-Primitive wie in WorkspacePage.tsx
// (collapsible="offcanvas": faehrt beim Einklappen auf 0 Breite, der
// Menü-Button schwebt oben links UEBER dem Viewer weiter) - standardmaessig
// eingefahren (defaultOpen={false}), damit der Viewer beim Oeffnen der Seite
// sofort den vollen Platz bekommt.
export function ViewerSidebarLayout({ sidebar, children }: ViewerSidebarLayoutProps) {
  const isPhone = useIsPhoneViewport();

  if (!isPhone) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex-1 overflow-y-auto px-4 py-4">{sidebar}</div>
        </aside>
        <main className="relative min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false} className="flex-1 overflow-hidden">
      <Sidebar>
        <SidebarContent>{sidebar}</SidebarContent>
      </Sidebar>
      <main className="relative min-h-0 min-w-0 flex-1">
        <MobileSidebarMenuButton />
        {children}
      </main>
    </SidebarProvider>
  );
}

// Eigener Trigger statt SidebarTrigger aus primitives/Sidebar.tsx: der dort
// eingebaute Button zeigt fest einen drehenden Chevron (fuers Desktop-
// Bearbeitungs-Panel in WorkspacePage.tsx so gewollt) - hier soll es
// stattdessen der Menü-Button (3 Striche) sein, siehe MenuIcon.tsx.
function MobileSidebarMenuButton() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <AnimatedButton
      type="button"
      aria-label={state === "expanded" ? "Seitenleiste einklappen" : "Seitenleiste ausklappen"}
      onClick={toggleSidebar}
      className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm hover:border-brand hover:text-brand dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-400"
    >
      <MenuIcon size={18} />
    </AnimatedButton>
  );
}
