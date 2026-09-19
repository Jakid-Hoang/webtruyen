"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CloudConflictDialog, useCloudSync } from "@/features/cloud/cloud-sync";
import { activeKey } from "@/lib/nav";
import { useLocalPersistence } from "@/lib/persistence/use-local-persistence";
import { useAuth } from "@/store/auth-store";
import { useCodex } from "@/store/codex-store";
import { BottomNav } from "./bottom-nav";
import { ConfirmDialog } from "./confirm-dialog";
import { GlobalSearch } from "./global-search";
import { Header } from "./header";
import { SidebarNav } from "./sidebar-nav";

function isTypingTarget(el: Element | null) {
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);
}

/**
 * Ctrl/Cmd+K = tìm toàn bộ (luôn luôn). Ctrl/Cmd+Z = hoàn tác, Ctrl/Cmd+Shift+Z
 * hoặc Ctrl/Cmd+Y = làm lại (bỏ qua khi đang gõ chữ).
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
      const { undo, redo } = useCodex.temporal.getState();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const toggleSearch = useCallback(() => setSearchOpen((o) => !o), []);

  useLocalPersistence();
  useShortcuts(toggleSearch);
  useEffect(() => useAuth.getState().init(), []);
  useCloudSync();

  const hydrated = useCodex((s) => s.hydrated);
  const activeView = activeKey(usePathname()) || null;

  return (
    // Chặn thao tác cho tới khi nạp xong dữ liệu đã lưu: thao tác sớm hơn sẽ bị bản
    // nạp về ghi đè và mất (vd bấm “Thêm thời đại” ngay khi trang vừa hiện).
    <div className="flex h-dvh flex-col" inert={!hydrated} aria-busy={!hydrated}>
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
          <SidebarNav activeView={activeView} />
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
            <SheetTitle>📖 Codex</SheetTitle>
          </SheetHeader>
          <SidebarNav activeView={activeView} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ConfirmDialog />
      <CloudConflictDialog />
    </div>
  );
}
