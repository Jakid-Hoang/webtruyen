"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cloud, cloudConfigured } from "@/lib/cloud/client";
import { pushWiki, readMeta, schemaOutdated, syncAll, syncLog, syncWriting, writeMeta, type CloudMeta, type SyncChoice } from "@/lib/cloud/sync";
import { normalizeCodex } from "@/lib/codex/schema";
import { saveLocal } from "@/lib/persistence/local";
import { writingDb } from "@/lib/writing/db";
import { useAuth } from "@/store/auth-store";
import { useCloud } from "@/store/cloud-store";
import { useCodex } from "@/store/codex-store";

const PUSH_DEBOUNCE_MS = 2500;
const POLL_MS = 60_000;

/**
 * Giữ máy này và máy chủ khớp nhau. Vẫn lưu vào trình duyệt trước như cũ; phần
 * này chỉ đẩy lên và kéo về. Không đăng nhập thì mọi thứ chạy y như trước.
 */
export function useCloudSync() {
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.user?.id);
  const hydrated = useCodex((s) => s.hydrated);

  useEffect(() => {
    const db = cloud();
    if (!cloudConfigured || !db || status !== "signed-in" || !userId || !hydrated) {
      useCloud.getState().set({ status: "off", choice: null });
      return;
    }

    const cs = useCloud.getState().set;
    let cancelled = false;
    let meta: CloudMeta | null = readMeta();
    let wikiDirty = false;
    let running = false;
    /* Wiki và truyện có hẹn giờ riêng: dùng chung một bộ đếm thì việc này huỷ việc kia. */
    let wikiTimer: ReturnType<typeof setTimeout> | undefined;
    let writingTimer: ReturnType<typeof setTimeout> | undefined;
    /* Thay đổi xảy ra trong lúc đang đồng bộ được ghi nhận rồi chạy nốt ở vòng sau. */
    const pending = { wiki: false, writing: false };
    let blocked = false; // đang chờ người dùng chọn bản nào
    let applyingRemote = false; // đang thay dữ liệu bằng bản kéo từ máy chủ

    const fail = (e: unknown) => {
      if (cancelled) return;
      cs({ status: "error", error: e instanceof Error ? e.message : String(e) });
    };
    const done = () => cs({ status: "synced", lastSyncAt: Date.now(), error: null, schemaOutdated: schemaOutdated() });

    /** Vòng đồng bộ đầy đủ (lần đầu, và khi người dùng đã chọn giữ bản nào). */
    const full = async (choice: SyncChoice = "auto") => {
      if (running || cancelled) return;
      running = true;
      if (choice !== "auto") blocked = false;
      cs({ status: "syncing" });
      // Giữ ảnh chụp dữ liệu lúc bắt đầu: sửa gì trong lúc đang chạy thì phải
      // đẩy tiếp ở vòng sau, không được coi là đã đồng bộ xong.
      const before = useCodex.getState().data;
      try {
        const res = await syncAll(userId, before, choice);
        if (cancelled) return;
        if (res.needsChoice) {
          blocked = true;
          cs({ status: "idle", choice: res.needsChoice });
          return;
        }
        if (res.wiki) {
          // Bản vừa kéo về không phải “người dùng vừa sửa”, đừng đẩy ngược lên.
          applyingRemote = true;
          useCodex.getState().replaceData(res.wiki);
          applyingRemote = false;
          // Lưu xong vào máy rồi mới coi là đã đồng bộ (xem ghi chú trong syncAll).
          await saveLocal(res.wiki);
        }
        if (res.meta) {
          meta = res.meta;
          writeMeta(meta);
        }
        blocked = false;
        cs({ choice: null });
        const settled = res.wiki ?? before;
        if (useCodex.getState().data === settled) {
          wikiDirty = false;
          done();
        } else {
          schedulePush();
        }
      } catch (e) {
        fail(e);
      } finally {
        running = false;
      }
    };

    /** Đẩy wiki lên sau khi người dùng sửa (chỉ gọi từ drain). */
    const push = async () => {
      if (!meta || cancelled) return;
      cs({ status: "syncing" });
      const sent = useCodex.getState().data;
      try {
        const res = await pushWiki(userId, sent, meta);
        if (cancelled) return;
        if (!res.ok) {
          // Máy khác đã sửa từ lần trước: hỏi người dùng chứ không tự đè.
          const { data } = await db.from("projects").select("name,data").eq("id", meta.projectId).maybeSingle();
          const parsed = data ? normalizeCodex((data as { data: unknown }).data) : null;
          const remoteCount = parsed?.ok ? Object.values(parsed.data.ent).reduce((n, l) => n + l.length, 0) : 0;
          const localCount = Object.values(useCodex.getState().data.ent).reduce((n, l) => n + l.length, 0);
          blocked = true;
          cs({ status: "idle", choice: { remoteName: (data as { name?: string } | null)?.name ?? "Bản trên mạng", remoteCount, localCount } });
          return;
        }
        meta = { ...meta, version: res.version, lastSyncAt: Date.now() };
        writeMeta(meta);
        // Sửa thêm trong lúc đang gửi thì đẩy nốt ở vòng kế tiếp.
        if (useCodex.getState().data !== sent) pending.wiki = true;
        else wikiDirty = false;
        done();
      } catch (e) {
        // Mất mạng hay máy chủ trục trặc: giữ lại việc để thử lại, đừng bỏ quên.
        pending.wiki = true;
        fail(e);
      }
    };

    /** Chạy lần lượt các việc đang chờ; việc mới phát sinh giữa chừng chạy tiếp ở vòng sau. */
    const drain = async () => {
      if (running || cancelled || blocked) return;
      running = true;
      try {
        while (!cancelled && !blocked && (pending.wiki || pending.writing)) {
          if (pending.wiki) {
            pending.wiki = false;
            await push();
          } else {
            pending.writing = false;
            await writingOnce();
          }
        }
      } finally {
        running = false;
      }
    };

    const schedulePush = () => {
      wikiDirty = true;
      pending.wiki = true;
      clearTimeout(wikiTimer);
      wikiTimer = setTimeout(() => void drain(), PUSH_DEBOUNCE_MS);
    };

    /** Kéo về khi máy khác vừa sửa (lúc quay lại tab, và mỗi phút một lần). */
    const pull = async () => {
      if (!meta || cancelled || running) return;
      // Còn thay đổi chưa đẩy được (vd vừa mất mạng) thì đẩy trước đã.
      if (wikiDirty) {
        pending.wiki = true;
        await drain();
        return;
      }
      try {
        const { data } = await db.from("projects").select("version").eq("id", meta.projectId).maybeSingle();
        const version = (data as { version: number } | null)?.version;
        if (version && version > meta.version) await full("useRemote");
        else {
          pending.writing = true;
          await drain();
        }
      } catch (e) {
        fail(e);
      }
    };

    /** Trộn truyện + chương (chỉ gọi từ drain). */
    const writingOnce = async () => {
      if (!meta || cancelled) return;
      cs({ status: "syncing" });
      try {
        await syncWriting(userId, meta.projectId, meta.writingSyncedAt ?? 0);
        if (cancelled) return;
        meta = { ...meta, lastSyncAt: Date.now(), writingSyncedAt: Date.now() };
        writeMeta(meta);
        done();
      } catch (e) {
        pending.writing = true;
        fail(e);
      }
    };

    void full();

    const unsubWiki = useCodex.subscribe((s, prev) => {
      if (s.data !== prev.data && !applyingRemote) schedulePush();
    });
    syncLog("bắt đầu theo dõi thay đổi");

    // Truyện: Dexie báo mỗi khi có thay đổi (kể cả từ tab khác).
    const local = writingDb();
    const onWriting = () => {
      pending.writing = true;
      clearTimeout(writingTimer);
      writingTimer = setTimeout(() => void drain(), PUSH_DEBOUNCE_MS);
    };
    local.stories.hook("creating", onWriting);
    local.stories.hook("updating", onWriting);
    local.stories.hook("deleting", onWriting);
    local.chapters.hook("creating", onWriting);
    local.chapters.hook("updating", onWriting);
    local.chapters.hook("deleting", onWriting);

    const onFocus = () => void pull();
    window.addEventListener("focus", onFocus);
    // Có mạng trở lại: thử ngay, không đợi tới lượt kiểm tra định kỳ.
    const onOnline = () => {
      if (wikiDirty) pending.wiki = true;
      pending.writing = true;
      void drain();
    };
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => void pull(), POLL_MS);

    // Cho hộp thoại gọi lại khi người dùng đã chọn.
    resolveChoice = (c) => void full(c);

    return () => {
      cancelled = true;
      clearTimeout(wikiTimer);
      clearTimeout(writingTimer);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      unsubWiki();
      local.stories.hook("creating").unsubscribe(onWriting);
      local.stories.hook("updating").unsubscribe(onWriting);
      local.stories.hook("deleting").unsubscribe(onWriting);
      local.chapters.hook("creating").unsubscribe(onWriting);
      local.chapters.hook("updating").unsubscribe(onWriting);
      local.chapters.hook("deleting").unsubscribe(onWriting);
      resolveChoice = null;
    };
  }, [status, userId, hydrated]);
}

/** Hàm do hook đặt vào; hộp thoại bên dưới gọi để chạy lại đồng bộ theo lựa chọn. */
let resolveChoice: ((c: SyncChoice) => void) | null = null;

/** Hỏi giữ bản nào khi máy này và máy chủ khác nhau. */
export function CloudConflictDialog() {
  const choice = useCloud((s) => s.choice);
  const set = useCloud((s) => s.set);
  const pick = (c: SyncChoice) => {
    set({ choice: null });
    resolveChoice?.(c);
    toast.info(c === "useRemote" ? "Đang lấy bản trên mạng về…" : "Đang đẩy bản trên máy này lên…");
  };

  return (
    <Dialog open={!!choice} onOpenChange={(o) => !o && set({ choice: null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hai bản dữ liệu khác nhau</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Máy này đang có <b className="text-foreground">{choice?.localCount ?? 0} mục</b>, còn bản trên mạng (
          {choice?.remoteName}) có <b className="text-foreground">{choice?.remoteCount ?? 0} mục</b>. Hãy chọn giữ bản
          nào — bản kia sẽ bị thay thế, nên nếu chưa chắc thì bấm Huỷ rồi tải file JSON sao lưu trước.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => set({ choice: null })}>
            Huỷ
          </Button>
          <Button variant="outline" onClick={() => pick("useLocal")}>
            Giữ bản trên máy này
          </Button>
          <Button onClick={() => pick("useRemote")}>Giữ bản trên mạng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
