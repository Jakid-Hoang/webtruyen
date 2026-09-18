"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isViewKey } from "@/lib/nav";
import { useLocalPersistence } from "@/lib/persistence/use-local-persistence";
import { useWorldStore } from "@/store/world-store";
import { BottomNav } from "./bottom-nav";
import { ConfirmDialog } from "./confirm-dialog";
import { GlobalSearch } from "./global-search";
import { Header } from "./header";
import { NewEraDialog } from "./new-era-dialog";
import { SidebarNav } from "./sidebar-nav";

function isTypingTarget(el: Element | null) {
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable);
}

/**
 * Ctrl/Cmd+K = global search (always). Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or
 * Ctrl/Cmd+Y = redo (ignored while typing).
 */
function useShortcuts(toggleSearch: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        toggleSearch();
        return;
      }
      if (isTypingTarget(document.activeElement)) return;
      const { undo, redo } = useWorldStore.temporal.getState();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSearch]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newEraOpen, setNewEraOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleSearch = useCallback(() => setSearchOpen((o) => !o), []);

  useLocalPersistence();
  useShortcuts(toggleSearch);

  const hydrated = useWorldStore((s) => s.hydrated);
  const segment = useSelectedLayoutSegment();
  const activeView = segment && (isViewKey(segment) || segment === "write") ? segment : null;

  return (
    <div className="flex h-dvh flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 border-r bg-sidebar transition-[width] duration-200 md:block",
            sidebarOpen ? "w-60" : "w-0 overflow-hidden border-r-0",
          )}
        >
          <SidebarNav activeView={activeView} onNewEra={() => setNewEraOpen(true)} />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-6 md:p-8 md:pb-8" style={{ scrollbarGutter: "stable" }}>
          {hydrated ? (
            children
          ) : (
            <p className="py-20 text-center text-sm font-bold tracking-widest text-muted-foreground uppercase">Đang tải…</p>
          )}
        </main>
      </div>

      <BottomNav activeView={activeView} />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>📖 Character Wiki</SheetTitle>
          </SheetHeader>
          <SidebarNav
            activeView={activeView}
            onNewEra={() => {
              setMobileNavOpen(false);
              setNewEraOpen(true);
            }}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <NewEraDialog open={newEraOpen} onOpenChange={setNewEraOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ConfirmDialog />
    </div>
  );
}
