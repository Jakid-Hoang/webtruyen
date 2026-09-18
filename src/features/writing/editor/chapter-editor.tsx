"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateChapter, type Chapter } from "@/lib/writing/db";
import { StoryStarterKit, WikiMention } from "@/lib/writing/schema";
import { mentionSuggestion } from "./mention-suggestion";
import type { WikiEntry } from "./wiki-entries";
import { WikiHighlight, setWikiNames, wikiHighlightKey } from "./wiki-highlight";

const SAVE_DEBOUNCE_MS = 700;

export type SaveState = "saved" | "saving" | "error";

function ToolbarButton({ active, onClick, label, children, disabled }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 px-2 py-1 backdrop-blur" role="toolbar" aria-label="Định dạng">
      <ToolbarButton label="Hoàn tác (Ctrl+Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Làm lại (Ctrl+Y)" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="In đậm (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="In nghiêng (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Gạch chân (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Gạch ngang" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Tiêu đề phụ" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Tiêu đề nhỏ" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Danh sách" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Danh sách số" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Trích dẫn" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Ngắt cảnh (* * *)" onClick={() => c().setHorizontalRule().run()}>
        <Minus className="size-4" />
      </ToolbarButton>
      <span className="ml-auto hidden pr-1 text-[11px] text-muted-foreground md:inline">Gõ @ để chèn nhân vật · Ctrl+Click tên để mở</span>
    </div>
  );
}

export function ChapterEditor({
  chapter,
  entries,
  onOpenEntity,
  onSaveState,
  onTextChange,
}: {
  chapter: Chapter;
  entries: WikiEntry[];
  onOpenEntity: (mentionId: string) => void;
  onSaveState: (s: SaveState) => void;
  /** Called (debounced) with the chapter's plain text, for the wiki panel. */
  onTextChange: (text: string, words: number) => void;
}) {
  const callbacks = useRef({ onOpenEntity, onSaveState, onTextChange });
  useEffect(() => {
    callbacks.current = { onOpenEntity, onSaveState, onTextChange };
  });

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<(() => Promise<void>) | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StoryStarterKit,
        WikiMention.configure({ suggestion: mentionSuggestion() }),
        Placeholder.configure({ placeholder: "Bắt đầu viết chương này…" }),
        CharacterCount,
        WikiHighlight,
      ],
      content: chapter.content,
      editorProps: {
        attributes: { class: "story-prose", spellcheck: "false", "aria-label": `Nội dung ${chapter.title}` },
        handleClick: (_view, _pos, event) => {
          if (!(event.ctrlKey || event.metaKey)) return false;
          const el = (event.target as HTMLElement).closest<HTMLElement>("[data-wiki],[data-type='mention']");
          const id = el?.getAttribute("data-wiki") ?? el?.getAttribute("data-id");
          if (!id) return false;
          callbacks.current.onOpenEntity(id);
          return true;
        },
      },
      onCreate: ({ editor: e }) => callbacks.current.onTextChange(e.getText(), e.storage.characterCount.words()),
      onUpdate: ({ editor: e }) => {
        callbacks.current.onSaveState("saving");
        // Snapshot now: the editor may already be destroyed when a flush runs on unmount.
        const content = e.getJSON();
        const words = e.storage.characterCount.words();
        const text = e.getText();
        const save = async () => {
          pending.current = null;
          try {
            await updateChapter(chapter.id, { content, wordCount: words });
            callbacks.current.onSaveState("saved");
            callbacks.current.onTextChange(text, words);
          } catch {
            callbacks.current.onSaveState("error");
          }
        };
        pending.current = save;
        clearTimeout(timer.current);
        timer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
      },
    },
    [chapter.id],
  );

  // Flush unsaved text when switching chapter, unmounting or closing the tab.
  useEffect(() => {
    const flush = () => {
      clearTimeout(timer.current);
      void pending.current?.();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [chapter.id]);

  // Keep highlighted wiki names in sync with the wiki.
  useEffect(() => {
    if (!editor) return;
    setWikiNames(editor.storage.wikiHighlight, entries);
    editor.view.dispatch(editor.state.tr.setMeta(wikiHighlightKey, true));
  }, [editor, entries]);

  if (!editor) return <div className="p-8 text-sm text-muted-foreground">Đang mở editor…</div>;

  return (
    <div className="flex min-h-0 flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8" />
    </div>
  );
}
