"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SPLIT_MODES,
  docToText,
  markdownToHtml,
  normalizeGoogleHtml,
  splitHtmlIntoChapters,
  textToHtml,
  type SplitMode,
} from "@/lib/writing/convert";
import { createStory, replaceChapters, updateStory, type Chapter, type GDocLink, type Story } from "@/lib/writing/db";
import { docxToHtml } from "@/lib/writing/docx";
import { parseGoogleDocId } from "@/lib/writing/gdoc-id";
import { exportDocHtml, getDocMeta, googleConfigured, pickGoogleDoc } from "@/lib/writing/google";
import { askConfirm } from "@/store/confirm-store";

export interface ImportSource {
  html: string;
  title: string;
  /** Present when the content came from a Google Doc; the story gets linked to it. */
  gdoc?: Omit<GDocLink, "lastSyncedAt">;
}

/** Fetch a Google Doc's HTML: via Drive API when possible, else the public-link route. */
export async function fetchGoogleDoc(fileId: string, preferDrive: boolean): Promise<ImportSource> {
  if (preferDrive && googleConfigured) {
    const [meta, html] = await Promise.all([getDocMeta(fileId), exportDocHtml(fileId)]);
    return {
      html: normalizeGoogleHtml(html),
      title: meta.name,
      gdoc: { fileId, url: meta.webViewLink, lastRemoteModified: meta.modifiedTime },
    };
  }
  const res = await fetch(`/api/gdoc?id=${encodeURIComponent(fileId)}`);
  const body = (await res.json()) as { html?: string; title?: string; error?: string };
  if (!res.ok || !body.html) throw new Error(body.error ?? "Không đọc được Doc.");
  return {
    html: normalizeGoogleHtml(body.html),
    // The public export has no reliable title; the user can rename afterwards.
    title: body.title || "Truyện từ Google Docs",
    gdoc: { fileId, url: `https://docs.google.com/document/d/${fileId}/edit`, lastRemoteModified: "" },
  };
}

type Diff = "new" | "changed" | "same";

export function ImportDialog({
  open,
  onOpenChange,
  story,
  existing,
  initial,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When set, the import can replace this story's chapters. */
  story?: Story;
  existing?: Chapter[];
  /** Pre-loaded content (e.g. "Kéo về từ Docs"). */
  initial?: ImportSource | null;
  onImported: (storyId: string) => void;
}) {
  const [source, setSource] = useState<ImportSource | null>(initial ?? null);
  const [mode, setMode] = useState<SplitMode>(initial?.gdoc ? "h1" : "auto");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset when reopened with a different preset.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setSource(initial ?? null);
    setMode(initial?.gdoc ? "h1" : "auto");
  }

  const chapters = useMemo(() => (source ? splitHtmlIntoChapters(source.html, mode) : []), [source, mode]);

  const diff = useMemo(() => {
    if (!existing?.length) return null;
    // Whitespace is normalised: round-trips through Docs/Word collapse spaces.
    const norm = (doc: Chapter["content"]) => docToText(doc).replace(/\s+/g, " ").trim();
    const byTitle = new Map(existing.map((c) => [c.title.trim(), norm(c.content)]));
    const marks: Diff[] = chapters.map((c) => {
      const old = byTitle.get(c.title.trim());
      if (old === undefined) return "new";
      return old === norm(c.content) ? "same" : "changed";
    });
    const incoming = new Set(chapters.map((c) => c.title.trim()));
    const removed = existing.filter((c) => !incoming.has(c.title.trim()));
    return { marks, removed };
  }, [chapters, existing]);

  const localEditsSinceSync =
    story?.gdoc && existing ? existing.filter((c) => c.updatedAt > story.gdoc!.lastSyncedAt).length : 0;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const loadFile = (file: File) =>
    run(async () => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const title = file.name.replace(/\.[^.]+$/, "");
      let html: string;
      if (ext === "docx") html = await docxToHtml(await file.arrayBuffer());
      else if (ext === "md" || ext === "markdown") html = markdownToHtml(await file.text());
      else if (ext === "html" || ext === "htm") html = normalizeGoogleHtml(await file.text());
      else if (ext === "txt") html = textToHtml(await file.text());
      else throw new Error("Định dạng chưa hỗ trợ. Dùng .docx, .md, .txt hoặc .html.");
      setSource({ html, title });
    });

  const loadLink = () =>
    run(async () => {
      const id = parseGoogleDocId(link);
      if (!id) throw new Error("Link Google Docs không hợp lệ.");
      setSource(await fetchGoogleDoc(id, false));
    });

  const loadPicker = () =>
    run(async () => {
      const picked = await pickGoogleDoc();
      if (picked) setSource(await fetchGoogleDoc(picked.id, true));
    });

  const gdocLink = (): GDocLink | undefined => (source?.gdoc ? { ...source.gdoc, lastSyncedAt: Date.now() } : undefined);

  const toNewStory = () =>
    run(async () => {
      const s = await createStory(source!.title || "Truyện nhập", story?.eraId ?? "");
      await replaceChapters(s.id, chapters);
      const g = gdocLink();
      if (g) await updateStory(s.id, { gdoc: g });
      toast.success(`Đã tạo truyện với ${chapters.length} chương.`);
      onOpenChange(false);
      onImported(s.id);
    });

  const replaceCurrent = () => {
    const apply = () =>
      run(async () => {
        await replaceChapters(story!.id, chapters);
        const g = gdocLink();
        // Pulling from the same Doc keeps its auto-sync setting.
        if (g) await updateStory(story!.id, { gdoc: { ...g, autoSync: story!.gdoc?.fileId === g.fileId && story!.gdoc.autoSync } });
        toast.success(`Đã cập nhật ${chapters.length} chương.`);
        onOpenChange(false);
        onImported(story!.id);
      });
    askConfirm({
      title: `Thay thế toàn bộ chương của “${story!.title}”?`,
      description:
        (localEditsSinceSync > 0 ? `⚠️ ${localEditsSinceSync} chương đã sửa trên máy sau lần đồng bộ trước sẽ bị ghi đè. ` : "") +
        "Nên xuất .docx sao lưu trước nếu chưa chắc chắn.",
      confirmLabel: "Thay thế",
      destructive: true,
      onConfirm: () => void apply(),
    });
  };

  const DIFF_BADGE: Record<Diff, { label: string; cls: string }> = {
    new: { label: "Mới", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    changed: { label: "Đã sửa", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    same: { label: "Giữ nguyên", cls: "bg-muted text-muted-foreground" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle>{initial?.gdoc && story ? "Kéo nội dung từ Google Docs" : "Nhập truyện"}</DialogTitle>
          <DialogDescription>Từ file Word/Markdown/TXT hoặc Google Docs. Chương được tách tự động, bạn xem trước rồi mới áp dụng.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
          {!initial && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid content-start gap-2 rounded-xl border p-3">
                <p className="text-sm font-semibold">📄 Từ file</p>
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <FileUp /> Chọn .docx / .md / .txt / .html
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept=".docx,.md,.markdown,.txt,.html,.htm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void loadFile(f);
                  }}
                />
              </div>
              <div className="grid content-start gap-2 rounded-xl border p-3">
                <p className="text-sm font-semibold">🔗 Từ Google Docs</p>
                <div className="flex gap-1.5">
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void loadLink()}
                    placeholder="Dán link Doc công khai…"
                    aria-label="Link Google Docs"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                  />
                  <Button variant="outline" onClick={() => void loadLink()} disabled={busy || !link.trim()}>
                    <Link2 /> Đọc
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Doc cần bật “Bất kỳ ai có đường liên kết”.</p>
                <Button variant="ghost" size="sm" onClick={() => void loadPicker()} disabled={busy || !googleConfigured} className="justify-self-start">
                  Hoặc chọn Doc riêng tư từ Google Drive…
                </Button>
                {!googleConfigured && <p className="text-[11px] text-muted-foreground">Doc riêng tư cần cấu hình Google API (xem README).</p>}
              </div>
            </div>
          )}

          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang đọc…
            </p>
          )}

          {source && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm">
                  Nguồn: <span className="font-semibold">{source.title || "(không tên)"}</span>
                </p>
                <label className="flex items-center gap-2 text-sm">
                  Tách chương
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as SplitMode)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                  >
                    {SPLIT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <ol className="grid max-h-72 gap-1 overflow-y-auto rounded-xl border p-2">
                {chapters.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm odd:bg-muted/40">
                    <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{c.wordCount.toLocaleString("vi")} chữ</span>
                    {diff && (
                      <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", DIFF_BADGE[diff.marks[i]].cls)}>{DIFF_BADGE[diff.marks[i]].label}</span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">
                {chapters.length} chương · {chapters.reduce((n, c) => n + c.wordCount, 0).toLocaleString("vi")} chữ
                {diff && diff.removed.length > 0 && (
                  <span className="text-destructive"> · {diff.removed.length} chương hiện có sẽ bị xoá: {diff.removed.map((c) => c.title).join(", ")}</span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="m-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          {story && (
            <Button variant={initial ? "default" : "outline"} disabled={!source || busy} onClick={replaceCurrent}>
              Thay thế “{story.title}”
            </Button>
          )}
          {!(initial && story) && (
            <Button disabled={!source || busy} onClick={() => void toNewStory()}>
              Tạo truyện mới
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
