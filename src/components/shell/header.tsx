"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  EllipsisVertical,
  Loader2,
  Menu,
  Moon,
  PanelLeft,
  Redo2,
  Search,
  Sun,
  TriangleAlert,
  Undo2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCodexFile, readCodexFile } from "@/lib/persistence/file";
import { docWordCount, htmlToDoc, textToHtml } from "@/lib/writing/convert";
import { createStory, replaceChapters } from "@/lib/writing/db";
import { askConfirm } from "@/store/confirm-store";
import { useCodex, useHistory } from "@/store/codex-store";
import { AccountMenu } from "./account-menu";

function SaveIndicator() {
  const status = useCodex((s) => s.saveStatus);
  if (status === "idle") return null;
  const map = {
    saving: { icon: Loader2, text: "Đang lưu", cls: "animate-spin" },
    saved: { icon: CheckCircle2, text: "Đã lưu", cls: "text-emerald-500" },
    error: { icon: TriangleAlert, text: "Lỗi lưu", cls: "text-destructive" },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-live="polite">
      <Icon className={`size-3.5 ${cls}`} />
      {text}
    </span>
  );
}

export function Header({
  onToggleSidebar,
  onOpenMobileNav,
  onOpenSearch,
}: {
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const eras = useCodex((s) => s.data.eras);
  const activeEraId = useCodex((s) => s.data.eraId);
  const worldName = useCodex((s) => s.data.world.name);
  const setEra = useCodex((s) => s.setEra);
  const canUndo = useHistory((s) => s.pastStates.length > 0);
  const canRedo = useHistory((s) => s.futureStates.length > 0);
  const { undo, redo } = useCodex.temporal.getState();
  const fileRef = useRef<HTMLInputElement>(null);

  const eraItems = eras.map((e) => ({ value: e.id, label: e.name }));
  const openImport = () => fileRef.current?.click();
  const exportFile = () => exportCodexFile(useCodex.getState().data);
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const onImport = async (file: File) => {
    const { result, chapters } = await readCodexFile(file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const count = Object.values(result.data.ent).reduce((n, l) => n + l.length, 0);
    askConfirm({
      title: "Nạp dữ liệu từ file?",
      description:
        `File có ${count} mục, ${result.data.elements.length} hệ${chapters.length ? `, ${chapters.length} chương` : ""}. ` +
        "Wiki hiện tại sẽ bị THAY THẾ hoàn toàn — hãy tải file sao lưu trước nếu cần." +
        (chapters.length ? " Các chương sẽ được đưa vào một truyện mới trong mục Viết truyện." : ""),
      confirmLabel: "Nạp và thay thế",
      destructive: true,
      onConfirm: async () => {
        useCodex.getState().replaceData(result.data);
        if (chapters.length) {
          const story = await createStory(result.data.world.name || "Truyện từ Codex");
          await replaceChapters(
            story.id,
            chapters.map((c) => {
              const content = htmlToDoc(textToHtml(c.content) || "<p></p>");
              return { title: c.title, content, wordCount: docWordCount(content) };
            }),
          );
        }
        toast.success(`Đã nạp ${count} mục${chapters.length ? ` và ${chapters.length} chương` : ""}.`);
      },
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Mở menu">
        <Menu />
      </Button>
      <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={onToggleSidebar} aria-label="Ẩn/hiện sidebar">
        <PanelLeft />
      </Button>

      <span className="hidden max-w-48 truncate font-extrabold tracking-tight sm:inline" title={worldName}>
        📖 {worldName || "Codex"}
      </span>

      <Select items={eraItems} value={activeEraId} onValueChange={(v) => v && setEra(v)}>
        <SelectTrigger size="sm" className="max-w-40 min-w-0 sm:max-w-60" aria-label="Chọn thời đại">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {eraItems.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-8 items-center gap-2 rounded-lg border bg-muted/40 px-2.5 text-sm text-muted-foreground hover:text-foreground lg:flex"
      >
        <Search className="size-4" /> Tìm kiếm…
        <kbd className="rounded border bg-background px-1 text-[10px]">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <SaveIndicator />
        <AccountMenu />
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSearch} aria-label="Tìm kiếm (Ctrl+K)">
          <Search />
        </Button>
        <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => undo()} aria-label="Hoàn tác (Ctrl+Z)" title="Hoàn tác (Ctrl+Z)">
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => redo()} aria-label="Làm lại (Ctrl+Y)" title="Làm lại (Ctrl+Y)">
          <Redo2 />
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" onClick={openImport} aria-label="Nhập file JSON" title="Nhập file JSON">
            <Upload />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportFile} aria-label="Xuất file JSON" title="Xuất file JSON">
            <Download />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối">
            <Sun className="hidden dark:block" />
            <Moon className="dark:hidden" />
          </Button>
        </div>

        {/* Narrow screens: secondary actions collapse into a menu so the header never overflows. */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="sm:hidden" aria-label="Thêm thao tác" />}>
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={openImport}>
              <Upload /> Nhập file JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportFile}>
              <Download /> Xuất file JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" /> Đổi sáng/tối
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onImport(file);
        }}
      />
    </header>
  );
}
