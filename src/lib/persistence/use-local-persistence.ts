"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { normalizeWorld } from "@/lib/schema/world";
import { loadLocalWorld, saveLocalWorld } from "@/lib/persistence/local";
import { useWorldStore } from "@/store/world-store";

const SAVE_DEBOUNCE_MS = 400;
/**
 * IndexedDB writes are async and may not finish while the page unloads, so an
 * edit made just before closing/reloading is also written synchronously here
 * and replayed on the next load.
 */
const PENDING_KEY = "character_wiki_pending_v1";

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

/** Load the world from IndexedDB once, then auto-save every change (debounced). */
export function useLocalPersistence() {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    let unsubscribe: (() => void) | undefined;

    const flush = () => {
      dirty = false;
      const { data, setSaveStatus } = useWorldStore.getState();
      void saveLocalWorld(data).then((ok) => {
        setSaveStatus(ok ? "saved" : "error");
        if (ok) clearPending();
      });
    };

    const pending = readPending();
    (pending ? Promise.resolve(pending) : loadLocalWorld()).then((raw) => {
      if (cancelled) return;
      const store = useWorldStore.getState();
      if (raw) {
        const result = normalizeWorld(raw);
        if (result.ok) store.replaceData(result.data);
        else toast.error(`Dữ liệu lưu trên máy bị lỗi: ${result.error}`);
      } else {
        useWorldStore.temporal.getState().clear();
      }
      store.setHydrated();
      // Persist a replayed pending snapshot into IndexedDB right away.
      if (pending) flush();

      unsubscribe = useWorldStore.subscribe((state, prev) => {
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
        localStorage.setItem(PENDING_KEY, JSON.stringify(useWorldStore.getState().data));
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
