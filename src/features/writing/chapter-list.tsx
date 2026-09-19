"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderPlus, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addSection, deleteChapter, deleteSection, renameSection, updateStory, type Chapter, type Story } from "@/lib/writing/db";
import { askConfirm } from "@/store/confirm-store";

function Row({ chapter, index, active, onSelect, storyId }: { chapter: Chapter; index: number; active: boolean; onSelect: () => void; storyId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1 text-sm",
        active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isDragging && "z-10 bg-muted shadow",
      )}
    >
      <button type="button" className="cursor-grab touch-none p-1 opacity-40 hover:opacity-100" aria-label={`Kéo để sắp xếp ${chapter.title}`} {...attributes} {...listeners}>
        <GripVertical className="size-3.5" />
      </button>
      <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined} className="min-w-0 flex-1 py-1.5 text-left">
        <span className="flex items-center gap-1.5">
          <span className="w-5 shrink-0 text-right text-[11px] tabular-nums opacity-60">{index + 1}</span>
          <span className={cn("size-1.5 shrink-0 rounded-full", chapter.status === "done" ? "bg-emerald-500" : "bg-muted-foreground/40")} />
          <span className="truncate font-medium">{chapter.title}</span>
        </span>
        <span className="block pl-8 text-[11px] opacity-70">{chapter.wordCount.toLocaleString("vi")} chữ</span>
      </button>
      <button
        type="button"
        aria-label={`Xoá ${chapter.title}`}
        onClick={() =>
          askConfirm({
            title: `Xoá “${chapter.title}”?`,
            description: `${chapter.wordCount.toLocaleString("vi")} chữ sẽ bị xoá vĩnh viễn (không hoàn tác được).`,
            confirmLabel: "Xoá chương",
            destructive: true,
            onConfirm: () => void deleteChapter(storyId, chapter.id),
          })
        }
        className="rounded p-1 opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

export function ChapterList({
  story,
  chapters,
  activeId,
  onSelect,
  onAdd,
}: {
  story: Story;
  chapters: Chapter[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = chapters.map((c) => c.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    void updateStory(story.id, { chapterOrder: next });
  };

  const total = chapters.reduce((n, c) => n + c.wordCount, 0);
  const sections = story.sections ?? [];
  const indexOf = new Map(chapters.map((c, i) => [c.id, i]));
  const inSection = (id: string | null) =>
    chapters.filter((c) => (id ? c.sectionId === id : !c.sectionId || !sections.some((s) => s.id === c.sectionId)));
  const loose = inSection(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-2 pb-2">
        <div>
          <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Chương ({chapters.length})</h2>
          <p className="text-[11px] text-muted-foreground">{total.toLocaleString("vi")} chữ</p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={() => void addSection(story.id, `Phần ${sections.length + 1}`)}>
            <FolderPlus /> Phần
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={onAdd} aria-label="Thêm chương">
            <Plus />
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto">
            {sections.map((s) => (
              <li key={s.id} className="grid gap-0.5">
                <div className="flex items-center gap-1 pt-2 pl-1">
                  <input
                    defaultValue={s.name}
                    aria-label={`Tên phần ${s.name}`}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && void renameSection(story.id, s.id, e.target.value.trim())}
                    className="min-w-0 flex-1 border-b border-transparent bg-transparent text-[11px] font-bold tracking-widest text-muted-foreground uppercase outline-none focus:border-input"
                  />
                  <span className="text-[11px] text-muted-foreground tabular-nums">{inSection(s.id).length}</span>
                  <button
                    type="button"
                    aria-label={`Xoá phần ${s.name}`}
                    onClick={() =>
                      askConfirm({
                        title: `Xoá phần “${s.name}”?`,
                        description: "Các chương bên trong chuyển thành “chưa xếp phần”, không chương nào bị xoá.",
                        confirmLabel: "Xoá phần",
                        destructive: true,
                        onConfirm: () => void deleteSection(story.id, s.id),
                      })
                    }
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <ol className="grid gap-0.5">
                  {inSection(s.id).map((c) => (
                    <Row key={c.id} chapter={c} index={indexOf.get(c.id) ?? 0} active={c.id === activeId} onSelect={() => onSelect(c.id)} storyId={story.id} />
                  ))}
                  {inSection(s.id).length === 0 && <li className="px-3 py-1 text-[11px] text-muted-foreground italic">trống</li>}
                </ol>
              </li>
            ))}
            {sections.length > 0 && loose.length > 0 && (
              <li className="px-1 pt-2 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Chưa xếp phần</li>
            )}
            {loose.map((c) => (
              <Row key={c.id} chapter={c} index={indexOf.get(c.id) ?? 0} active={c.id === activeId} onSelect={() => onSelect(c.id)} storyId={story.id} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {chapters.length === 0 && (
        <Button variant="outline" size="sm" onClick={onAdd} className="mx-2">
          <Plus /> Chương đầu tiên
        </Button>
      )}
    </div>
  );
}
