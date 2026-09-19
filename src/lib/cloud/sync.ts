"use client";

/*
 * Đồng bộ hai chiều với Supabase, kiểu “máy mình là chính”:
 * mọi thứ vẫn lưu trong trình duyệt trước, rồi mới đẩy lên; mất mạng vẫn viết
 * được. Wiki là một tài liệu JSON (bảng projects) nên so bằng `version`; truyện
 * so từng dòng bằng `updated_at`, bên nào mới hơn thì bên đó thắng.
 *
 * Xoá: một dòng biến mất ở máy mà trên mạng vẫn còn và đã có từ trước lần đồng
 * bộ gần nhất thì coi là người dùng đã xoá → xoá luôn trên mạng. Dòng mới xuất
 * hiện trên mạng sau lần đồng bộ ấy là máy khác vừa thêm → kéo về.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JSONContent } from "@tiptap/core";
import { cloud } from "@/lib/cloud/client";
import { normalizeCodex, type CodexData } from "@/lib/codex/schema";
import { writingDb, type Chapter, type ChapterStatus, type GDocLink, type Recap, type Section, type Story } from "@/lib/writing/db";

const META_KEY = "cloud_meta_v1";

/** Bật bằng localStorage.cloud_debug = "1" khi cần dò lỗi đồng bộ. */
export function syncLog(...args: unknown[]) {
  try {
    if (localStorage.getItem("cloud_debug") === "1") console.log("[sync]", ...args);
  } catch {
    /* không có localStorage thì thôi */
  }
}

export interface CloudMeta {
  projectId: string;
  /** version của bản wiki mà máy này đã nhận/đẩy gần nhất. */
  version: number;
  /** Thời điểm đồng bộ gần nhất (ms). */
  lastSyncAt: number;
  userId: string;
}

export function readMeta(): CloudMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as CloudMeta) : null;
  } catch {
    return null;
  }
}

export function writeMeta(m: CloudMeta | null) {
  try {
    if (m) localStorage.setItem(META_KEY, JSON.stringify(m));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* trình duyệt chặn lưu — đồng bộ vẫn chạy, chỉ kém thông minh hơn */
  }
}

/* ── Kiểu dòng dữ liệu trên Supabase ───────────────────────────────────────── */

interface ProjectRow {
  id: string;
  name: string;
  data: unknown;
  version: number;
  updated_at: string;
}
interface StoryRow {
  id: string;
  title: string;
  synopsis: string;
  era_id: string;
  chapter_order: string[];
  sections: Section[] | null;
  gdoc: GDocLink | null;
  updated_at: string;
}
interface ChapterRow {
  id: string;
  story_id: string;
  title: string;
  content: JSONContent;
  word_count: number;
  status: string;
  section_id: string | null;
  recap: Recap | null;
  updated_at: string;
}

const STORY_COLS = "id,title,synopsis,era_id,chapter_order,sections,gdoc,updated_at";
const CHAPTER_COLS = "id,story_id,title,content,word_count,status,section_id,recap,updated_at";

const ms = (iso: string) => new Date(iso).getTime();
const iso = (n: number) => new Date(n).toISOString();

/** Wiki coi như “chưa có gì” khi chưa tạo mục nào — lúc đó kéo bản trên mạng về là an toàn. */
export function isEmptyWiki(d: CodexData) {
  return Object.values(d.ent).every((list) => list.length === 0);
}

/* ── Wiki ──────────────────────────────────────────────────────────────────── */

async function fetchProject(db: SupabaseClient, userId: string): Promise<ProjectRow | null> {
  const { data, error } = await db
    .from("projects")
    .select("id,name,data,version,updated_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.[0] as ProjectRow | undefined) ?? null;
}

async function createProject(db: SupabaseClient, userId: string, wiki: CodexData): Promise<ProjectRow> {
  const { data, error } = await db
    .from("projects")
    .insert({ owner_id: userId, name: wiki.world.name, data: wiki })
    .select("id,name,data,version,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectRow;
}

/**
 * Đẩy wiki lên. Chỉ ghi đè khi bản trên mạng vẫn đúng `version` mình đang giữ;
 * nếu máy khác đã sửa thì trả về "conflict" chứ không đè mất bài của họ.
 */
export async function pushWiki(userId: string, wiki: CodexData, meta: CloudMeta): Promise<{ ok: true; version: number } | { ok: false; conflict: true }> {
  const db = cloud();
  if (!db) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await db
    .from("projects")
    .update({ data: wiki, name: wiki.world.name })
    .eq("id", meta.projectId)
    .eq("version", meta.version)
    .select("version")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    syncLog("pushWiki: đụng độ, bản trên mạng đã đổi", { triedVersion: meta.version });
    return { ok: false, conflict: true };
  }
  syncLog("pushWiki: xong", { from: meta.version, to: (data as { version: number }).version });
  return { ok: true, version: (data as { version: number }).version };
}

/* ── Truyện ────────────────────────────────────────────────────────────────── */

const toStory = (r: StoryRow): Story => ({
  id: r.id,
  title: r.title,
  synopsis: r.synopsis,
  eraId: r.era_id,
  chapterOrder: r.chapter_order ?? [],
  sections: r.sections ?? [],
  gdoc: r.gdoc ?? undefined,
  createdAt: ms(r.updated_at),
  updatedAt: ms(r.updated_at),
});

const toChapter = (r: ChapterRow): Chapter => ({
  id: r.id,
  storyId: r.story_id,
  title: r.title,
  content: r.content,
  wordCount: r.word_count,
  status: (r.status === "done" ? "done" : "draft") as ChapterStatus,
  sectionId: r.section_id ?? null,
  recap: r.recap ?? undefined,
  updatedAt: ms(r.updated_at),
});

const storyRow = (s: Story, userId: string, projectId: string) => ({
  id: s.id,
  owner_id: userId,
  project_id: projectId,
  title: s.title,
  synopsis: s.synopsis,
  era_id: s.eraId,
  chapter_order: s.chapterOrder,
  sections: s.sections ?? [],
  gdoc: s.gdoc ?? null,
  updated_at: iso(s.updatedAt),
});

const chapterRow = (c: Chapter, userId: string) => ({
  id: c.id,
  story_id: c.storyId,
  owner_id: userId,
  title: c.title,
  content: c.content,
  word_count: c.wordCount,
  status: c.status,
  section_id: c.sectionId ?? null,
  recap: c.recap ?? null,
  updated_at: iso(c.updatedAt),
});

export interface WritingSyncReport {
  pulled: number;
  pushed: number;
  deletedLocal: number;
  deletedRemote: number;
}

/** Trộn truyện + chương hai chiều. Trả về số dòng đã xử lý để hiện thông báo. */
export async function syncWriting(userId: string, projectId: string, lastSyncAt: number): Promise<WritingSyncReport> {
  const db = cloud();
  if (!db) throw new Error("Chưa cấu hình Supabase.");
  const local = writingDb();

  const [{ data: sRows, error: sErr }, { data: cRows, error: cErr }, localStories, localChapters] = await Promise.all([
    db.from("stories").select(STORY_COLS).eq("owner_id", userId),
    db.from("chapters").select(CHAPTER_COLS).eq("owner_id", userId),
    local.stories.toArray(),
    local.chapters.toArray(),
  ]);
  if (sErr) throw new Error(sErr.message);
  if (cErr) throw new Error(cErr.message);

  const report: WritingSyncReport = { pulled: 0, pushed: 0, deletedLocal: 0, deletedRemote: 0 };
  const remoteStories = new Map((sRows as StoryRow[]).map((r) => [r.id, r]));
  const remoteChapters = new Map((cRows as ChapterRow[]).map((r) => [r.id, r]));
  const localStoryMap = new Map(localStories.map((s) => [s.id, s]));
  const localChapterMap = new Map(localChapters.map((c) => [c.id, c]));

  const storiesToPush: Story[] = [];
  const chaptersToPush: Chapter[] = [];
  const storiesToSave: Story[] = [];
  const chaptersToSave: Chapter[] = [];
  const storiesToDeleteLocal: string[] = [];
  const chaptersToDeleteLocal: string[] = [];
  const storiesToDeleteRemote: string[] = [];
  const chaptersToDeleteRemote: string[] = [];

  for (const s of localStories) {
    const r = remoteStories.get(s.id);
    if (!r) storiesToPush.push(s);
    else if (ms(r.updated_at) > s.updatedAt + 1000) storiesToSave.push(toStory(r));
    else if (s.updatedAt > ms(r.updated_at) + 1000) storiesToPush.push(s);
  }
  for (const [id, r] of remoteStories) {
    if (localStoryMap.has(id)) continue;
    // Có trên mạng, không có ở máy: mới thêm ở máy khác thì kéo về, còn nếu đã
    // tồn tại từ trước lần đồng bộ gần nhất thì là mình vừa xoá → xoá nốt.
    if (ms(r.updated_at) > lastSyncAt) storiesToSave.push(toStory(r));
    else storiesToDeleteRemote.push(id);
  }
  for (const c of localChapters) {
    const r = remoteChapters.get(c.id);
    if (!r) chaptersToPush.push(c);
    else if (ms(r.updated_at) > c.updatedAt + 1000) chaptersToSave.push(toChapter(r));
    else if (c.updatedAt > ms(r.updated_at) + 1000) chaptersToPush.push(c);
  }
  for (const [id, r] of remoteChapters) {
    if (localChapterMap.has(id)) continue;
    if (ms(r.updated_at) > lastSyncAt) chaptersToSave.push(toChapter(r));
    else chaptersToDeleteRemote.push(id);
  }
  // Chương của truyện đã bị xoá hẳn thì bỏ theo.
  const goneStories = new Set(storiesToDeleteRemote);
  for (const [id, r] of remoteChapters) if (goneStories.has(r.story_id) && !chaptersToDeleteRemote.includes(id)) chaptersToDeleteRemote.push(id);

  if (storiesToPush.length) {
    const { error } = await db.from("stories").upsert(storiesToPush.map((s) => storyRow(s, userId, projectId)));
    if (error) throw new Error(error.message);
  }
  if (chaptersToPush.length) {
    const { error } = await db.from("chapters").upsert(chaptersToPush.map((c) => chapterRow(c, userId)));
    if (error) throw new Error(error.message);
  }
  if (storiesToDeleteRemote.length) await db.from("stories").delete().in("id", storiesToDeleteRemote);
  if (chaptersToDeleteRemote.length) await db.from("chapters").delete().in("id", chaptersToDeleteRemote);

  if (storiesToSave.length || chaptersToSave.length || storiesToDeleteLocal.length || chaptersToDeleteLocal.length)
    await local.transaction("rw", local.stories, local.chapters, async () => {
      if (storiesToSave.length) await local.stories.bulkPut(storiesToSave);
      if (chaptersToSave.length) await local.chapters.bulkPut(chaptersToSave);
      if (storiesToDeleteLocal.length) await local.stories.bulkDelete(storiesToDeleteLocal);
      if (chaptersToDeleteLocal.length) await local.chapters.bulkDelete(chaptersToDeleteLocal);
    });

  report.pushed = storiesToPush.length + chaptersToPush.length;
  report.pulled = storiesToSave.length + chaptersToSave.length;
  report.deletedRemote = storiesToDeleteRemote.length + chaptersToDeleteRemote.length;
  report.deletedLocal = storiesToDeleteLocal.length + chaptersToDeleteLocal.length;
  return report;
}

/* ── Đồng bộ toàn bộ ───────────────────────────────────────────────────────── */

export type SyncChoice = "auto" | "useLocal" | "useRemote";

export interface SyncResult {
  /** Cần người dùng chọn: hai bên đều có dữ liệu khác nhau. */
  needsChoice?: { remoteName: string; remoteCount: number; localCount: number };
  wiki?: CodexData;
  writing?: WritingSyncReport;
  meta?: CloudMeta;
}

const countEntities = (d: CodexData) => Object.values(d.ent).reduce((n, l) => n + l.length, 0);

/**
 * Chạy một vòng đồng bộ. `localWiki` là dữ liệu đang mở trên máy.
 * Trả `wiki` khi cần thay dữ liệu đang mở bằng bản trên mạng.
 */
export async function syncAll(userId: string, localWiki: CodexData, choice: SyncChoice = "auto"): Promise<SyncResult> {
  const db = cloud();
  if (!db) throw new Error("Chưa cấu hình Supabase.");
  const prev = readMeta();
  const lastSyncAt = prev && prev.userId === userId ? prev.lastSyncAt : 0;

  let project = await fetchProject(db, userId);
  if (!project) project = await createProject(db, userId, localWiki);

  const parsed = normalizeCodex(project.data);
  const remoteWiki = parsed.ok ? parsed.data : null;
  const remoteCount = remoteWiki ? countEntities(remoteWiki) : 0;
  const localCount = countEntities(localWiki);
  const firstTime = !prev || prev.userId !== userId || prev.projectId !== project.id;

  let take: "local" | "remote" = "local";
  if (choice === "useRemote") take = "remote";
  else if (choice === "useLocal") take = "local";
  else if (!remoteWiki) take = "local";
  // Chốt an toàn: máy đang trống mà trên mạng có dữ liệu thì không bao giờ tự
  // đẩy bản trống lên. Muốn xoá sạch thì người dùng phải tự chọn “giữ bản máy này”.
  else if (isEmptyWiki(localWiki) && !isEmptyWiki(remoteWiki)) take = "remote";
  else if (firstTime) {
    // Lần đầu đăng nhập trên máy này: bên nào trống thì lấy bên kia, cả hai đều
    // có dữ liệu thì hỏi người dùng thay vì tự đè.
    if (isEmptyWiki(localWiki)) take = "remote";
    else if (isEmptyWiki(remoteWiki)) take = "local";
    else return { needsChoice: { remoteName: project.name, remoteCount, localCount } };
  } else if (project.version > prev.version) take = "remote";

  syncLog("syncAll", { choice, take, firstTime, remoteVersion: project.version, prevVersion: prev?.version, remoteCount, localCount });

  let meta: CloudMeta = { projectId: project.id, version: project.version, lastSyncAt: Date.now(), userId };
  let wiki: CodexData | undefined;

  if (take === "remote" && remoteWiki) {
    wiki = remoteWiki;
  } else {
    const res = await pushWiki(userId, localWiki, { ...meta, version: project.version });
    if (!res.ok) {
      // Máy khác vừa ghi đúng lúc: lấy bản mới nhất về rồi để người dùng quyết.
      const fresh = await fetchProject(db, userId);
      const freshParsed = fresh ? normalizeCodex(fresh.data) : null;
      if (fresh && freshParsed?.ok) return { needsChoice: { remoteName: fresh.name, remoteCount: countEntities(freshParsed.data), localCount } };
      throw new Error("Không ghi được lên máy chủ, thử lại sau.");
    }
    meta = { ...meta, version: res.version };
  }

  const writing = await syncWriting(userId, project.id, lastSyncAt);
  // Chưa ghi meta ở đây: phía gọi phải lưu xong dữ liệu kéo về vào máy rồi mới
  // ghi, nếu không tải lại trang giữa chừng sẽ mất bản vừa kéo mà vẫn tưởng đã
  // đồng bộ — lần sau đẩy bản rỗng lên là mất dữ liệu trên mạng.
  return { wiki, writing, meta };
}
