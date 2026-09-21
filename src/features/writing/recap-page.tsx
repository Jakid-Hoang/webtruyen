"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { AreaField, TextField } from "@/components/kit/fields";
import { EmptyState, PageHeader } from "@/components/kit/page";
import { useCodexIndex } from "@/features/codex/use-codex-index";
import { readHref } from "@/features/codex/use-codex-index";
import { entityHref, entityName } from "@/lib/codex/select";
import { setRecapField, updateStory, EMPTY_RECAP, type Chapter, type Recap, type Section } from "@/lib/writing/db";
import { useCodex } from "@/store/codex-store";

/**
 * Trang tổng hợp cốt truyện: mỗi truyện một ô tổng quan, mỗi chương một thẻ. Ô
 * “Câu hỏi còn treo” là ô quan trọng nhất — nó cho thấy chương nào mở ra câu hỏi
 * mà chưa chương nào trả lời. “Đầu mối gốc” ghi chương mọc ra từ tư liệu nào.
 */
function ChapterCard({ chapter, number, storyId }: { chapter: Chapter; number: number; storyId: string }) {
  const data = useCodex((s) => s.data);
  const ix = useCodexIndex();
  const r: Recap = { ...EMPTY_RECAP, ...chapter.recap };
  const marks = ix?.index.ch[chapter.id]?.marks ?? [];
  const chars = [...new Set(marks.filter((m) => m.tk === "char").map((m) => m.id))];
  const set = (field: keyof Recap) => (v: string) => void setRecapField(chapter.id, field, v);

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          Chương {number} · {chapter.title}
        </h3>
        <span className="text-xs text-muted-foreground">
          {chapter.wordCount.toLocaleString("vi")} chữ ·{" "}
          <Link href={readHref(storyId, chapter.id)} className="font-semibold text-primary hover:underline">
            đọc
          </Link>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Móc câu mở đầu" value={r.hook} onCommit={set("hook")} placeholder="Câu khiến người đọc muốn đọc tiếp" />
        <TextField label="Góc nhìn" value={r.pov} onCommit={set("pov")} placeholder="Kể từ mắt ai" />
        <TextField label="Tuyến truyện" value={r.track} onCommit={set("track")} placeholder="Tuyến A, Tuyến B, Hội tụ…" />
      </div>
      <AreaField label="Diễn biến chính" value={r.main} onCommit={set("main")} placeholder="Chuyện gì xảy ra, theo thứ tự" rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AreaField
          label="Thay đổi sau chương này"
          value={r.change}
          onCommit={set("change")}
          placeholder="Ai chết, ai phản bội, ai mạnh lên, quan hệ nào đổi"
          rows={3}
        />
        <AreaField label="Câu hỏi còn treo" value={r.open} onCommit={set("open")} placeholder="Thứ chưa giải thích, cần trả lời ở chương sau" rows={3} />
      </div>
      <AreaField
        label="Đầu mối gốc"
        value={r.origin}
        onCommit={set("origin")}
        placeholder="Chương này mọc ra từ đâu: tư liệu gốc, lore, chương cũ"
        rows={3}
      />
      {chars.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chars.map((id) => (
            <Link key={id} href={entityHref("char", id)} className="rounded-full border bg-muted px-2.5 py-0.5 text-xs hover:border-primary">
              {entityName(data, "char", id)}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Chưa nhận ra nhân vật nào trong chương.</p>
      )}
    </section>
  );
}

export function RecapPage() {
  const ix = useCodexIndex();
  if (!ix) return <p className="py-20 text-center text-sm text-muted-foreground">Đang tải…</p>;

  const stories = ix.source.stories.filter((s) => s.chapters.length);
  if (!stories.length)
    return (
      <div className="mx-auto grid max-w-4xl gap-4">
        <PageHeader icon={ClipboardList} title="Tóm tắt cốt truyện" />
        <EmptyState>
          Chưa có chương nào để tóm tắt.{" "}
          <Link href="/write" className="font-semibold text-primary hover:underline">
            Viết truyện
          </Link>
        </EmptyState>
      </div>
    );

  const all = stories.flatMap((s) => s.chapters);
  const done = all.filter((c) => (c.recap?.main ?? "").trim()).length;

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <PageHeader icon={ClipboardList} title="Tóm tắt cốt truyện" subtitle={`${done} / ${all.length} chương đã tóm tắt`} />
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Ghi lại diễn biến từng chương như một trang tổng hợp. Dùng để nhớ lại mạch truyện sau vài tháng, và để dò lỗ
        hổng: chương nào mở ra câu hỏi mà không chương nào trả lời.
      </p>

      {stories.map((story) => {
        const sections: Section[] = story.sections ?? [];
        const group = (id: string | null) =>
          story.chapters.filter((c) => (id ? c.sectionId === id : !c.sectionId || !sections.some((s) => s.id === c.sectionId)));
        const loose = group(null);
        return (
          <div key={story.id} className="grid gap-4">
            {ix.source.stories.length > 1 && <h2 className="text-xl font-extrabold">{story.title}</h2>}
            <section className="grid gap-3 rounded-xl border bg-card p-4">
              <AreaField
                label="Tổng quan truyện"
                value={story.synopsis}
                onCommit={(v) => void updateStory(story.id, { synopsis: v })}
                placeholder="Tình hình chung, các tuyến truyện, trục xung đột, thứ tự đọc — thứ không thuộc riêng chương nào"
                rows={8}
              />
            </section>
            {sections.map((s) =>
              group(s.id).length ? (
                <div key={s.id} className="grid gap-3">
                  <h3 className="font-serif text-lg font-semibold">{s.name}</h3>
                  {group(s.id).map((c) => (
                    <ChapterCard key={c.id} chapter={c.row} number={c.ci + 1} storyId={story.id} />
                  ))}
                </div>
              ) : null,
            )}
            {loose.length > 0 && (
              <div className="grid gap-3">
                {sections.length > 0 && <h3 className="font-serif text-lg font-semibold">Chưa xếp phần</h3>}
                {loose.map((c) => (
                  <ChapterCard key={c.id} chapter={c.row} number={c.ci + 1} storyId={story.id} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
