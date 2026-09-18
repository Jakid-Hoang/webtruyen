"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, Download, FileUp, Loader2, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InlineName } from "@/components/kit/fields";
import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { addChapter, updateChapter, updateStory, writingDb, type Chapter } from "@/lib/writing/db";
import { entityHref } from "@/lib/codex/select";
import { parseMentionId } from "@/lib/writing/schema";
import { useCodex } from "@/store/codex-store";
import { ChapterList } from "./chapter-list";
import { ChapterEditor, type SaveState } from "./editor/chapter-editor";
import { useWikiEntries } from "./editor/wiki-entries";
import { EXPORT_FORMATS, exportStory } from "./export";
import { GDocMenu, GDocSyncBadge } from "./gdoc-menu";
import { ImportDialog, type ImportSource } from "./import-dialog";
import { useGDocAutoSync } from "./use-gdoc-autosync";
import { WikiPanel } from "./wiki-panel";

const EMPTY: Chapter[] = [];

function SaveBadge({ state }: { state: SaveState }) {
  const map = {
    saving: { icon: Loader2, text: "Đang lưu", cls: "animate-spin" },
    saved: { icon: CheckCircle2, text: "Đã lưu", cls: "text-emerald-500" },
    error: { icon: AlertCircle, text: "Lỗi lưu", cls: "text-destructive" },
  } as const;
  const { icon: Icon, text, cls } = map[state];
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      <Icon className={cn("size-3.5", cls)} /> {text}
    </span>
  );
}

function ChapterHeader({ chapter, index }: { chapter: Chapter; index: number }) {
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-4 pt-6 sm:px-8">
      <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
      <InlineName
        value={chapter.title}
        onCommit={(title) => void updateChapter(chapter.id, { title })}
        editing={renaming}
        setEditing={setRenaming}
        className="min-w-0 flex-1 text-2xl font-extrabold tracking-tight"
      />
      <Button variant="ghost" size="xs" onClick={() => setRenaming(true)}>
        Đổi tên
      </Button>
      <button
        type="button"
        onClick={() => void updateChapter(chapter.id, { status: chapter.status === "done" ? "draft" : "done" })}
        className={cn(
          "rounded-full border px-2 py-0.5 text-xs font-semibold",
          chapter.status === "done" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
        )}
        aria-pressed={chapter.status === "done"}
      >
        {chapter.status === "done" ? "✓ Hoàn thành" : "Bản nháp"}
      </button>
    </div>
  );
}

export function StoryWorkspace({ storyId }: { storyId: string }) {
  const router = useRouter();
  const eras = useCodex((s) => s.data.eras);
  const entries = useWikiEntries();
  const [chapterParam, setChapterParam] = useUrlState("ch");
  const [panelOpen, setPanelOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [text, setText] = useState("");
  const [titleEditing, setTitleEditing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pulled, setPulled] = useState<ImportSource | null>(null);

  const data = useLiveQuery(async () => {
    const db = writingDb();
    const story = await db.stories.get(storyId);
    if (!story) return { story: null, chapters: [] as Chapter[] };
    const all = await db.chapters.where("storyId").equals(storyId).toArray();
    const byId = new Map(all.map((c) => [c.id, c]));
    const ordered = story.chapterOrder.map((id) => byId.get(id)).filter((c): c is Chapter => !!c);
    return { story, chapters: [...ordered, ...all.filter((c) => !story.chapterOrder.includes(c.id))] };
  }, [storyId]);

  const onOpenEntity = useCallback(
    (mentionId: string) => {
      const p = parseMentionId(mentionId);
      if (p) router.push(entityHref(p.kind, p.id));
    },
    [router],
  );
  const onTextChange = useCallback((t: string) => setText(t), []);
  const autoSync = useGDocAutoSync(data?.story ?? null, data?.chapters ?? EMPTY);

  if (!data) return <p className="py-20 text-center text-sm text-muted-foreground">Đang tải truyện…</p>;
  if (!data.story)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Không tìm thấy truyện.{" "}
        <Link href="/write" className="font-semibold text-primary hover:underline">
          Về danh sách
        </Link>
      </div>
    );

  const { story, chapters } = data;
  const activeIndex = Math.max(0, chapters.findIndex((c) => c.id === chapterParam));
  const active = chapters[activeIndex];

  const newChapter = async () => {
    const c = await addChapter(story.id, { title: `Chương ${chapters.length + 1}` }, active?.id);
    setChapterParam(c.id);
  };

  return (
    <div className="-m-4 flex h-[calc(100dvh-3rem)] flex-col sm:-m-6 md:-m-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/write")} aria-label="Về danh sách truyện">
          <ArrowLeft />
        </Button>
        <InlineName
          value={story.title}
          onCommit={(title) => void updateStory(story.id, { title })}
          editing={titleEditing}
          setEditing={setTitleEditing}
          className="max-w-[40vw] text-base font-bold"
        />
        <select
          value={story.eraId}
          onChange={(e) => void updateStory(story.id, { eraId: e.target.value })}
          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
          aria-label="Gắn với Era"
        >
          <option value="">Không gắn Era</option>
          {eras.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <SaveBadge state={saveState} />
        <GDocSyncBadge story={story} autoSync={autoSync} onPulled={setPulled} />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <FileUp /> Nhập
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Download /> Xuất <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {EXPORT_FORMATS.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => void exportStory(story, f.value)}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <GDocMenu story={story} autoSync={autoSync} onPulled={setPulled} />
          <Button
            variant={panelOpen ? "secondary" : "ghost"}
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Ẩn/hiện panel wiki"
            aria-pressed={panelOpen}
          >
            <PanelRight />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r py-3 pl-1 md:block">
          <ChapterList story={story} chapters={chapters} activeId={active?.id ?? ""} onSelect={setChapterParam} onAdd={() => void newChapter()} />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {/* Mobile chapter picker */}
          <div className="flex gap-2 border-b p-2 md:hidden">
            <select
              value={active?.id ?? ""}
              onChange={(e) => setChapterParam(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
              aria-label="Chọn chương"
            >
              {chapters.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {i + 1}. {c.title}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => void newChapter()}>
              + Chương
            </Button>
          </div>

          {active ? (
            <>
              <ChapterHeader chapter={active} index={activeIndex} />
              <ChapterEditor
                key={active.id}
                chapter={active}
                entries={entries}
                onOpenEntity={onOpenEntity}
                onSaveState={setSaveState}
                onTextChange={onTextChange}
              />
            </>
          ) : (
            <div className="grid place-items-center gap-3 py-24 text-center text-sm text-muted-foreground">
              <p>Truyện chưa có chương nào.</p>
              <div className="flex gap-2">
                <Button onClick={() => void newChapter()}>Viết chương đầu tiên</Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  Nhập từ file / Google Docs
                </Button>
              </div>
            </div>
          )}
        </div>

        {panelOpen && active && (
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-l lg:block" aria-label="Wiki trong chương">
            <WikiPanel text={text} entries={entries} />
          </aside>
        )}
      </div>

      <ImportDialog
        open={importOpen || !!pulled}
        onOpenChange={(o) => {
          if (!o) {
            setImportOpen(false);
            setPulled(null);
          }
        }}
        story={story}
        existing={chapters}
        initial={pulled}
        onImported={(id) => {
          if (id !== story.id) router.push(`/write/${id}`);
          else setChapterParam("");
        }}
      />
    </div>
  );
}
