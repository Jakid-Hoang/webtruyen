"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { storyToHtml } from "@/lib/writing/convert";
import { getOrderedChapters, markGDocSynced, writingDb, type Chapter, type Story } from "@/lib/writing/db";
import { NeedsAuthError, getDocMeta, googleConfigured, updateDocFromHtml, withoutPopup } from "@/lib/writing/google";

/** Wait this long after the last change before pushing (keeps Drive calls low while typing). */
const IDLE_MS = 4000;
/** Our own write can bump Drive's modifiedTime slightly later; ignore drift within this window. */
const OWN_WRITE_TOLERANCE_MS = 15_000;

export type AutoSyncState =
  | { kind: "off" }
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "syncing" }
  | { kind: "synced"; at: number }
  | { kind: "needs-auth" }
  | { kind: "no-access" }
  | { kind: "conflict"; remoteModified: string }
  | { kind: "error"; message: string };

/** Everything that ends up in the Doc: order, titles and each chapter's last save. */
function signature(chapters: Chapter[]) {
  return chapters.map((c) => `${c.id}:${c.updatedAt}:${c.title}`).join("|");
}

/**
 * Pushes the story to its linked Google Doc a few seconds after each change.
 * Never opens popups: when the token expires or access is missing it pauses
 * and reports a state the UI can act on (reconnect / grant / resolve conflict).
 */
export function useGDocAutoSync(story: Story | null, chapters: Chapter[]) {
  const enabled = Boolean(googleConfigured && story?.gdoc?.autoSync);
  const [state, setState] = useState<AutoSyncState>({ kind: enabled ? "idle" : "off" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const running = useRef(false);
  const again = useRef(false);
  const storyRef = useRef(story);
  const lastSig = useRef<string | null>(null);

  useEffect(() => {
    storyRef.current = story;
  });

  const [prevEnabled, setPrevEnabled] = useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setState({ kind: enabled ? "idle" : "off" });
  }

  /** Push now. `force` skips the remote-change check (user chose to overwrite). */
  const push = async (force = false): Promise<void> => {
    const s = storyRef.current;
    if (!s?.gdoc) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setState({ kind: "syncing" });
    try {
      await withoutPopup(async () => {
        // Always act on the stored link, not the render-time copy (it may be stale
        // right after auto-sync was switched on).
        const gdoc = (await writingDb().stories.get(s.id))?.gdoc;
        if (!gdoc || (!force && !gdoc.autoSync)) {
          setState({ kind: "idle" });
          return;
        }
        const meta = await getDocMeta(gdoc.fileId);
        const remote = Date.parse(meta.modifiedTime);
        const known = Date.parse(gdoc.lastRemoteModified || "");
        const editedElsewhere = !force && gdoc.lastRemoteModified && remote - known > OWN_WRITE_TOLERANCE_MS;
        if (editedElsewhere) {
          setState({ kind: "conflict", remoteModified: meta.modifiedTime });
          again.current = false;
          return;
        }
        const chapters = await getOrderedChapters(s.id);
        const result = await updateDocFromHtml(gdoc.fileId, storyToHtml(s.title, chapters));
        await markGDocSynced(s.id, result);
        setState({ kind: "synced", at: Date.now() });
      });
    } catch (e) {
      again.current = false;
      if (e instanceof NeedsAuthError) setState({ kind: "needs-auth" });
      else if ((e as { status?: number }).status === 404 || (e as { status?: number }).status === 403) setState({ kind: "no-access" });
      else setState({ kind: "error", message: (e as Error).message });
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        void pushRef.current();
      }
    }
  };

  // Effects/timers call the latest `push` through a stable wrapper.
  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  });
  const pushNow = useCallback((force?: boolean) => pushRef.current(force), []);

  // Schedule a push whenever chapter content/order/titles change (not on first load).
  const sig = signature(chapters);
  useEffect(() => {
    if (!enabled) {
      lastSig.current = sig;
      return;
    }
    if (lastSig.current === null || lastSig.current === sig) {
      lastSig.current = sig;
      return;
    }
    lastSig.current = sig;
    setState((st) => (st.kind === "conflict" || st.kind === "needs-auth" || st.kind === "no-access" ? st : { kind: "pending" }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void pushNow(), IDLE_MS);
  }, [sig, enabled, pushNow]);

  // Leaving the tab: push pending changes right away instead of waiting.
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (document.visibilityState === "hidden" && state.kind === "pending") {
        clearTimeout(timer.current);
        void pushNow();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [enabled, state.kind, pushNow]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { state, pushNow };
}
