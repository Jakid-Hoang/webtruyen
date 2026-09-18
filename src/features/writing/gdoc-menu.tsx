"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CloudCheck,
  CloudDownload,
  CloudOff,
  CloudUpload,
  ExternalLink,
  FilePlus2,
  KeyRound,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { storyToHtml } from "@/lib/writing/convert";
import { getOrderedChapters, markGDocSynced, patchGDoc, updateStory, type Story } from "@/lib/writing/db";
import {
  createDocFromHtml,
  getAccessToken,
  getDocMeta,
  getDriveUser,
  googleConfigured,
  pickGoogleDoc,
  updateDocFromHtml,
  type DocMeta,
} from "@/lib/writing/google";
import { askConfirm } from "@/store/confirm-store";
import { fetchGoogleDoc, type ImportSource } from "./import-dialog";
import type { AutoSyncState } from "./use-gdoc-autosync";

const fmt = (ms: number) => new Date(ms).toLocaleString("vi", { dateStyle: "short", timeStyle: "short" });
const time = (ms: number) => new Date(ms).toLocaleTimeString("vi", { hour: "2-digit", minute: "2-digit" });

interface AutoSync {
  state: AutoSyncState;
  pushNow: (force?: boolean) => Promise<void>;
}

function useBusy() {
  const [busy, setBusy] = useState(false);
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
  return { busy, run };
}

/**
 * Make sure this app may write to the Doc. Docs imported via a public link are
 * readable by anyone but writable only after the user picks them in Google
 * Picker (that is how the `drive.file` scope grants access).
 */
async function ensureWriteAccess(fileId: string): Promise<DocMeta> {
  await getAccessToken();
  try {
    return await getDocMeta(fileId);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404 && status !== 403) throw e;
    toast.info("Chọn Doc này trong cửa sổ Google để cấp quyền ghi cho app.");
    const picked = await pickGoogleDoc(fileId);
    if (!picked) throw new Error("Chưa cấp quyền ghi cho Doc.");
    if (picked.id !== fileId) throw new Error("Bạn đã chọn một Doc khác. Hãy chọn đúng Doc đang liên kết.");
    // The Picker grant can take a few seconds to reach the Drive API.
    for (const wait of [500, 1000, 1500, 2000, 3000]) {
      await new Promise((r) => setTimeout(r, wait));
      try {
        return await getDocMeta(fileId);
      } catch (err) {
        const s = (err as { status?: number }).status;
        if (s !== 404 && s !== 403) throw err;
      }
    }
    const user = await getDriveUser().catch(() => null);
    throw new Error(
      `Google chưa cho tài khoản ${user?.emailAddress ?? "đang đăng nhập"} truy cập Doc này qua app. ` +
        "Doc cần thuộc tài khoản đó, hoặc được chia sẻ quyền “Người chỉnh sửa” cho tài khoản đó (không phải chỉ “ai có link đều xem được”).",
    );
  }
}

/** Compact status shown next to the save indicator; offers the fix for each problem. */
export function GDocSyncBadge({ story, autoSync, onPulled }: { story: Story; autoSync: AutoSync; onPulled: (src: ImportSource) => void }) {
  const { busy, run } = useBusy();
  const { state, pushNow } = autoSync;
  const linked = story.gdoc;
  if (!linked || state.kind === "off") return null;

  const base = "flex items-center gap-1 text-xs";
  switch (state.kind) {
    case "idle":
    case "synced":
      return (
        <span className={`${base} text-muted-foreground`} title={`Tự đồng bộ với Google Docs · lần cuối ${fmt(linked.lastSyncedAt)}`}>
          <CloudCheck className="size-3.5 text-emerald-500" /> Docs {state.kind === "synced" ? time(state.at) : time(linked.lastSyncedAt)}
        </span>
      );
    case "pending":
      return (
        <span className={`${base} text-muted-foreground`}>
          <CloudUpload className="size-3.5" /> Chờ đồng bộ Docs…
        </span>
      );
    case "syncing":
      return (
        <span className={`${base} text-muted-foreground`}>
          <Loader2 className="size-3.5 animate-spin" /> Đang đồng bộ Docs
        </span>
      );
    case "needs-auth":
      return (
        <Button size="xs" variant="outline" disabled={busy} onClick={() => void run(async () => (await getAccessToken(), pushNow()))}>
          <KeyRound /> Kết nối lại Google để đồng bộ
        </Button>
      );
    case "no-access":
      return (
        <Button size="xs" variant="outline" disabled={busy} onClick={() => void run(async () => (await ensureWriteAccess(linked.fileId), pushNow()))}>
          <KeyRound /> Cấp quyền ghi Doc
        </Button>
      );
    case "error":
      return (
        <Button size="xs" variant="outline" disabled={busy} title={state.message} onClick={() => void pushNow()}>
          <CloudOff /> Lỗi đồng bộ · Thử lại
        </Button>
      );
    case "conflict":
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="xs" variant="destructive" />}>
            <AlertTriangle /> Doc bị sửa bên ngoài <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Doc được sửa trực tiếp trên Google Docs lúc {fmt(Date.parse(state.remoteModified))}. Tự đồng bộ đang tạm dừng để không ghi đè.
            </p>
            <DropdownMenuItem onClick={() => void run(async () => onPulled(await fetchGoogleDoc(linked.fileId, true)))}>
              <CloudDownload /> Kéo về (xem trước, rồi thay bản trong app)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void pushNow(true)}>
              <CloudUpload /> Ghi đè Doc bằng bản trong app
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
  }
}

/** Google Docs actions for a story. `onPulled` opens the import preview with remote content. */
export function GDocMenu({ story, autoSync, onPulled }: { story: Story; autoSync: AutoSync; onPulled: (src: ImportSource) => void }) {
  const { busy, run } = useBusy();
  const linked = story.gdoc;
  const needsSetup = !googleConfigured;

  const createNewDoc = () =>
    run(async () => {
      const chapters = await getOrderedChapters(story.id);
      if (chapters.length === 0) throw new Error("Truyện chưa có chương nào để xuất.");
      const meta = await createDocFromHtml(story.title, storyToHtml(story.title, chapters));
      // A Doc created by the app is always writable, so auto-sync starts right away.
      await updateStory(story.id, {
        gdoc: { fileId: meta.id, url: meta.webViewLink, lastSyncedAt: Date.now(), lastRemoteModified: meta.modifiedTime, autoSync: true },
      });
      toast.success("Đã tạo Google Doc mới — từ giờ viết đến đâu sẽ tự đồng bộ đến đó.", {
        action: { label: "Mở Doc", onClick: () => window.open(meta.webViewLink, "_blank", "noopener") },
      });
    });

  const pushManual = () =>
    run(async () => {
      if (!linked) return;
      const meta = await ensureWriteAccess(linked.fileId);
      const doPush = () =>
        run(async () => {
          const chapters = await getOrderedChapters(story.id);
          const res = await updateDocFromHtml(linked.fileId, storyToHtml(story.title, chapters));
          await markGDocSynced(story.id, res);
          toast.success("Đã đẩy lên Google Docs.");
        });
      if (linked.lastRemoteModified && meta.modifiedTime !== linked.lastRemoteModified) {
        askConfirm({
          title: "Doc đã bị sửa trên Google Docs",
          description: `Doc được sửa lúc ${fmt(Date.parse(meta.modifiedTime))}, sau lần đồng bộ trước (${fmt(linked.lastSyncedAt)}). Đẩy lên sẽ GHI ĐÈ các thay đổi đó. Cân nhắc “Kéo về” trước.`,
          confirmLabel: "Vẫn ghi đè",
          destructive: true,
          onConfirm: () => void doPush(),
        });
      } else await doPush();
    });

  const enableAutoSync = () =>
    run(async () => {
      if (!linked) return;
      const meta = await ensureWriteAccess(linked.fileId);
      askConfirm({
        title: "Bật tự đồng bộ với Google Docs?",
        description: `Mỗi khi bạn ngừng gõ vài giây, toàn bộ truyện trong app sẽ được ghi lên Doc “${meta.name}”, thay cho nội dung hiện có trên Doc. Nếu sau đó Doc bị sửa trực tiếp trên Google Docs, app sẽ tạm dừng và hỏi bạn thay vì ghi đè.`,
        confirmLabel: "Bật và đồng bộ ngay",
        onConfirm: () =>
          void run(async () => {
            await patchGDoc(story.id, { autoSync: true, url: meta.webViewLink, lastRemoteModified: meta.modifiedTime });
            await autoSync.pushNow(true);
            toast.success("Đã bật tự đồng bộ.");
          }),
      });
    });

  const pull = () =>
    run(async () => {
      if (linked) onPulled(await fetchGoogleDoc(linked.fileId, googleConfigured));
    });

  const linkExisting = () =>
    run(async () => {
      const picked = await pickGoogleDoc();
      if (picked) onPulled(await fetchGoogleDoc(picked.id, true));
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={linked ? "secondary" : "outline"} size="sm" disabled={busy} />}>
        {busy ? <Loader2 className="animate-spin" /> : <span aria-hidden>📄</span>}
        Google Docs
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {linked ? (
          <>
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Đã liên kết · đồng bộ lần cuối {fmt(linked.lastSyncedAt)}
              {linked.autoSync ? " · tự đồng bộ đang BẬT" : ""}
            </p>
            <DropdownMenuItem onClick={() => window.open(linked.url, "_blank", "noopener")}>
              <ExternalLink /> Mở Doc
            </DropdownMenuItem>
            {linked.autoSync ? (
              <DropdownMenuItem onClick={() => void patchGDoc(story.id, { autoSync: false })}>
                <CloudOff /> Tắt tự đồng bộ khi viết
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={needsSetup} onClick={() => void enableAutoSync()}>
                <RefreshCw /> Bật tự đồng bộ khi viết
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={needsSetup} onClick={() => void pushManual()}>
              <CloudUpload /> Đẩy lên Docs ngay (ghi đè Doc)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void pull()}>
              <CloudDownload /> Kéo về (xem trước rồi thay thế)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={needsSetup} onClick={() => void createNewDoc()}>
              <FilePlus2 /> Xuất ra một Doc mới
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                askConfirm({
                  title: "Huỷ liên kết Google Doc?",
                  description: "Doc trên Drive vẫn giữ nguyên, chỉ là truyện không còn đồng bộ với nó.",
                  confirmLabel: "Huỷ liên kết",
                  onConfirm: () => void updateStory(story.id, { gdoc: undefined }),
                })
              }
            >
              <Link2Off /> Huỷ liên kết
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem disabled={needsSetup} onClick={() => void createNewDoc()}>
              <FilePlus2 /> Xuất thành Google Doc mới (tự đồng bộ)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={needsSetup} onClick={() => void linkExisting()}>
              <Link2 /> Liên kết Doc có sẵn trên Drive…
            </DropdownMenuItem>
          </>
        )}
        {needsSetup && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
              ⚠️ Ghi lên Google Docs (kể cả tự đồng bộ) cần cấu hình Google API trong <code>.env.local</code> — xem README, mục “Cấu hình Google Docs”.
              Hiện chỉ đọc được Doc công khai.
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
