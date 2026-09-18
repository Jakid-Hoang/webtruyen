"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { normalizeCodex } from "@/lib/codex/schema";
import { loadLocal, saveLocal } from "@/lib/persistence/local";
import { useCodex } from "@/store/codex-store";

const SAVE_DEBOUNCE_MS = 400;
/**
 * IndexedDB ghi bất đồng bộ nên có thể chưa kịp xong khi tắt/tải lại trang.
 * Thay đổi cuối được ghi đồng bộ vào đây và phát lại ở lần mở sau.
 */
const PENDING_KEY = "codex_pending_v1";

function readPending(): unknown | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Nạp wiki từ IndexedDB một lần, rồi tự lưu mọi thay đổi (gom 400ms). */
export function useLocalPersistence() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    let unsubscribe: (() => void) | undefined;

    // Chỉ coi là “đã lưu” khi IndexedDB ghi xong và dữ liệu chưa đổi thêm: nếu trang
    // bị đóng giữa lúc đang ghi, pagehide vẫn thấy dirty và chép bản dự phòng.
    const flush = () => {
      const { data, setSaveStatus } = useCodex.getState();
      void saveLocal(data).then((ok) => {
        if (!ok) return setSaveStatus("error");
        if (useCodex.getState().data !== data) return;
        dirty = false;
        setSaveStatus("saved");
        clearPending();
      });
    };

    const pending = readPending();
    (pending ? Promise.resolve(pending) : loadLocal()).then((raw) => {
      if (cancelled) return;
      const store = useCodex.getState();
      if (raw) {
        const result = normalizeCodex(raw);
        if (result.ok) store.replaceData(result.data);
        else toast.error(`Dữ liệu lưu trên máy bị lỗi: ${result.error}`);
      } else {
        useCodex.temporal.getState().clear();
      }
      store.setHydrated();
      if (pending) flush();

      unsubscribe = useCodex.subscribe((state, prev) => {
        if (state.data === prev.data) return;
        dirty = true;
        state.setSaveStatus("saving");
        clearTimeout(timer);
        timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
      });
    });

    const onHide = () => {
      if (!dirty) return;
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify(useCodex.getState().data));
      } catch {
        /* quota / private mode: fall back to the async write below */
      }
      flush();
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
      window.removeEventListener("pagehide", onHide);
    };
  }, []);
}
