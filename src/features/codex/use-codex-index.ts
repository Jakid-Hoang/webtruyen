"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { buildIndex, toParas, type CodexIndex, type IndexChapter } from "@/lib/codex/algorithms";
import { docToText } from "@/lib/writing/convert";
import { writingDb, type Chapter, type Section } from "@/lib/writing/db";
import { useCodex } from "@/store/codex-store";

/** Chương đã tách đoạn, kèm bản ghi gốc để các trang khác dùng (tóm tắt, phần truyện). */
export type IndexedChapter = IndexChapter & { row: Chapter; sectionId: string | null; recap?: Chapter["recap"] };

export interface StoryChapters {
  stories: { id: string; title: string; sections: Section[]; chapters: IndexedChapter[] }[];
  /** Mọi chương của mọi truyện, theo thứ tự truyện rồi thứ tự chương. */
  chapters: IndexedChapter[];
}

/** Đọc toàn bộ chương từ IndexedDB và tách đoạn; tự cập nhật khi chương được lưu. */
export function useStoryChapters(): StoryChapters | undefined {
  return useLiveQuery(async () => {
    const db = writingDb();
    const [stories, all] = await Promise.all([db.stories.orderBy("updatedAt").reverse().toArray(), db.chapters.toArray()]);
    const byStory = new Map<string, Chapter[]>();
    for (const c of all) (byStory.get(c.storyId) ?? byStory.set(c.storyId, []).get(c.storyId)!).push(c);
    const out: StoryChapters["stories"] = stories.map((s) => {
      const list = byStory.get(s.id) ?? [];
      const byId = new Map(list.map((c) => [c.id, c]));
      const ordered = [...s.chapterOrder.map((id) => byId.get(id)).filter((c): c is Chapter => !!c), ...list.filter((c) => !s.chapterOrder.includes(c.id))];
      return {
        id: s.id,
        title: s.title,
        sections: s.sections ?? [],
        chapters: ordered.map((c, ci) => ({
          id: c.id,
          storyId: s.id,
          storyTitle: s.title,
          ci,
          title: c.title,
          paras: toParas(docToText(c.content)),
          row: c,
          sectionId: c.sectionId ?? null,
          recap: c.recap,
        })),
      };
    });
    return { stories: out, chapters: out.flatMap((s) => s.chapters) };
  }, []);
}

/** Chỉ mục tự động trên mọi chương — tính lại khi wiki hoặc chương thay đổi. */
export function useCodexIndex(): { index: CodexIndex; source: StoryChapters } | undefined {
  const data = useCodex((s) => s.data);
  const source = useStoryChapters();
  return useMemo(() => (source ? { index: buildIndex(data, source.chapters), source } : undefined), [data, source]);
}

export function readHref(storyId: string, chapterId: string, para?: number) {
  const sp = new URLSearchParams({ story: storyId, ch: chapterId });
  if (para !== undefined) sp.set("p", String(para));
  return `/read?${sp}`;
}
