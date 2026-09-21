import Dexie, { type EntityTable } from "dexie";
import type { JSONContent } from "@tiptap/core";
import { genId } from "@/lib/id";

/*
 * Stories live outside the wiki JSON: chapter text is large and typing must
 * not flood the wiki's undo history. Each chapter is its own row so saving one
 * chapter never rewrites the whole book.
 */

export interface GDocLink {
  fileId: string;
  url: string;
  /** When we last pushed or pulled successfully (ms). */
  lastSyncedAt: number;
  /** Drive `modifiedTime` observed at that sync (ISO). Used to detect remote edits. */
  lastRemoteModified: string;
  /** Push to the Doc automatically while writing. */
  autoSync?: boolean;
}

/** Thư mục phần truyện: “Phần 1”, “Quyển Hạ”, “Ngoại truyện”. */
export interface Section {
  id: string;
  name: string;
}

export interface Story {
  id: string;
  title: string;
  synopsis: string;
  eraId: string;
  chapterOrder: string[];
  sections?: Section[];
  gdoc?: GDocLink;
  createdAt: number;
  updatedAt: number;
}

export type ChapterStatus = "draft" | "done";

/** Tóm tắt cốt truyện của một chương. “open” là ô quan trọng nhất: câu hỏi chưa trả lời. */
export interface Recap {
  hook: string;
  pov: string;
  /** Chương này thuộc tuyến truyện nào (vd “Tuyến A”, “Hội tụ”). */
  track: string;
  main: string;
  change: string;
  open: string;
  /** Chương này mọc ra từ đâu: tư liệu gốc, lore, chương cũ. */
  origin: string;
}

export const EMPTY_RECAP: Recap = { hook: "", pov: "", track: "", main: "", change: "", open: "", origin: "" };

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  content: JSONContent;
  wordCount: number;
  status: ChapterStatus;
  /** null hoặc thiếu = chưa xếp vào phần nào. */
  sectionId?: string | null;
  recap?: Recap;
  updatedAt: number;
}

class WritingDb extends Dexie {
  stories!: EntityTable<Story, "id">;
  chapters!: EntityTable<Chapter, "id">;

  constructor() {
    super("character_wiki_writing");
    this.version(1).stores({ stories: "id, updatedAt", chapters: "id, storyId, updatedAt" });
  }
}

let instance: WritingDb | null = null;
export function writingDb() {
  instance ??= new WritingDb();
  return instance;
}

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export async function createStory(title: string, eraId = ""): Promise<Story> {
  const now = Date.now();
  const story: Story = { id: genId("st"), title, synopsis: "", eraId, chapterOrder: [], createdAt: now, updatedAt: now };
  await writingDb().stories.add(story);
  return story;
}

export async function addChapter(storyId: string, init: Partial<Chapter> = {}, afterId?: string): Promise<Chapter> {
  const db = writingDb();
  const chapter: Chapter = {
    id: genId("ch"),
    storyId,
    title: "Chương mới",
    content: EMPTY_DOC,
    wordCount: 0,
    status: "draft",
    updatedAt: Date.now(),
    ...init,
  };
  await db.transaction("rw", db.stories, db.chapters, async () => {
    await db.chapters.add(chapter);
    const story = await db.stories.get(storyId);
    if (!story) return;
    const order = [...story.chapterOrder];
    const at = afterId ? order.indexOf(afterId) + 1 : order.length;
    order.splice(at > 0 ? at : order.length, 0, chapter.id);
    await db.stories.update(storyId, { chapterOrder: order, updatedAt: Date.now() });
  });
  return chapter;
}

export async function deleteChapter(storyId: string, chapterId: string) {
  const db = writingDb();
  await db.transaction("rw", db.stories, db.chapters, async () => {
    await db.chapters.delete(chapterId);
    const story = await db.stories.get(storyId);
    if (story)
      await db.stories.update(storyId, { chapterOrder: story.chapterOrder.filter((id) => id !== chapterId), updatedAt: Date.now() });
  });
}

export async function deleteStory(storyId: string) {
  const db = writingDb();
  await db.transaction("rw", db.stories, db.chapters, async () => {
    await db.chapters.where("storyId").equals(storyId).delete();
    await db.stories.delete(storyId);
  });
}

export async function updateStory(storyId: string, patch: Partial<Story>) {
  await writingDb().stories.update(storyId, { ...patch, updatedAt: Date.now() });
}

/**
 * Record a successful Docs sync. Updates only the sync fields (key paths) so it
 * can never clobber a concurrent change such as toggling auto-sync.
 */
export async function markGDocSynced(storyId: string, remote: { modifiedTime: string; webViewLink?: string }) {
  await patchGDoc(storyId, {
    lastSyncedAt: Date.now(),
    lastRemoteModified: remote.modifiedTime,
    ...(remote.webViewLink ? { url: remote.webViewLink } : {}),
  });
}

/** Update individual fields of an existing Docs link, applied to the latest stored row. */
export async function patchGDoc(storyId: string, fields: Partial<GDocLink>) {
  await writingDb()
    .stories.where("id")
    .equals(storyId)
    .modify((s) => {
      if (s.gdoc) Object.assign(s.gdoc, fields);
    });
}

export async function updateChapter(chapterId: string, patch: Partial<Chapter>) {
  await writingDb().chapters.update(chapterId, { ...patch, updatedAt: Date.now() });
}

/** Ghi một ô tóm tắt, giữ nguyên các ô còn lại. */
export async function setRecapField(chapterId: string, field: keyof Recap, value: string) {
  await writingDb()
    .chapters.where("id")
    .equals(chapterId)
    .modify((c) => {
      c.recap = { ...EMPTY_RECAP, ...c.recap, [field]: value };
      c.updatedAt = Date.now();
    });
}

/* ── Thư mục phần truyện ── */

export async function addSection(storyId: string, name: string): Promise<string> {
  const id = genId("sec");
  await writingDb()
    .stories.where("id")
    .equals(storyId)
    .modify((s) => {
      s.sections = [...(s.sections ?? []), { id, name }];
      s.updatedAt = Date.now();
    });
  return id;
}

export async function renameSection(storyId: string, sectionId: string, name: string) {
  await writingDb()
    .stories.where("id")
    .equals(storyId)
    .modify((s) => {
      s.sections = (s.sections ?? []).map((x) => (x.id === sectionId ? { ...x, name } : x));
      s.updatedAt = Date.now();
    });
}

/** Xoá phần: chương bên trong thành “chưa xếp”, KHÔNG xoá chương. */
export async function deleteSection(storyId: string, sectionId: string) {
  const db = writingDb();
  await db.transaction("rw", db.stories, db.chapters, async () => {
    await db.stories
      .where("id")
      .equals(storyId)
      .modify((s) => {
        s.sections = (s.sections ?? []).filter((x) => x.id !== sectionId);
        s.updatedAt = Date.now();
      });
    await db.chapters
      .where("storyId")
      .equals(storyId)
      .modify((c) => {
        if (c.sectionId === sectionId) {
          c.sectionId = null;
          c.updatedAt = Date.now();
        }
      });
  });
}

/** Chapters of a story in reading order (orphans appended). */
export async function getOrderedChapters(storyId: string): Promise<Chapter[]> {
  const db = writingDb();
  const [story, chapters] = await Promise.all([db.stories.get(storyId), db.chapters.where("storyId").equals(storyId).toArray()]);
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const ordered = (story?.chapterOrder ?? []).map((id) => byId.get(id)).filter((c): c is Chapter => !!c);
  const rest = chapters.filter((c) => !story?.chapterOrder.includes(c.id));
  return [...ordered, ...rest];
}

/** Replace all chapters of a story in one transaction (used by import / pull). */
export async function replaceChapters(storyId: string, chapters: { title: string; content: JSONContent; wordCount: number }[]) {
  const db = writingDb();
  const now = Date.now();
  const rows: Chapter[] = chapters.map((c) => ({ id: genId("ch"), storyId, status: "draft", updatedAt: now, ...c }));
  await db.transaction("rw", db.stories, db.chapters, async () => {
    await db.chapters.where("storyId").equals(storyId).delete();
    await db.chapters.bulkAdd(rows);
    await db.stories.update(storyId, { chapterOrder: rows.map((r) => r.id), updatedAt: now });
  });
  return rows;
}
