"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, PenLine, ShieldAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/kit/page";
import { useUrlState } from "@/hooks/use-url-state";
import { check, type Mark } from "@/lib/codex/algorithms";
import { elementColor, elementName, entityHref, findEntity, tdef } from "@/lib/codex/select";
import { useCodex } from "@/store/codex-store";
import { readHref, useCodexIndex } from "./use-codex-index";

function Paragraph({ text, marks, onPeek }: { text: string; marks: Mark[]; onPeek: (m: Mark) => void }) {
  const out: React.ReactNode[] = [];
  let cur = 0;
  for (const m of [...marks].sort((a, b) => a.pos - b.pos)) {
    if (m.pos < cur) continue;
    out.push(text.slice(cur, m.pos));
    out.push(
      <button
        key={m.pos}
        type="button"
        onClick={() => onPeek(m)}
        className="cursor-pointer rounded-sm underline decoration-2 underline-offset-4 hover:bg-muted"
        style={{ textDecorationColor: m.color }}
      >
        {text.slice(m.pos, m.end)}
      </button>,
    );
    cur = m.end;
  }
  out.push(text.slice(cur));
  return <>{out}</>;
}

function PeekDialog({ mark, onClose }: { mark: Mark | null; onClose: () => void }) {
  const data = useCodex((s) => s.data);
  const router = useRouter();
  const t = mark ? tdef(data, mark.tk) : undefined;
  const e = mark ? findEntity(data, mark.tk, mark.id) : undefined;
  return (
    <Dialog open={!!(t && e)} onOpenChange={(o) => !o && onClose()}>
      {t && e && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {e.icon || t.ic} {e.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{t.l}</p>
          </DialogHeader>
          {e.els.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {e.els.map((x) => (
                <span key={x} className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: elementColor(data, x) }}>
                  {elementName(data, x)}
                </span>
              ))}
            </div>
          )}
          <div className="grid gap-1 text-sm">
            {t.f
              .filter((f) => e.f[f.k])
              .slice(0, 6)
              .map((f) => (
                <p key={f.k}>
                  <span className="text-muted-foreground">{f.l}:</span> {String(e.f[f.k]).slice(0, 220)}
                </p>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => router.push(entityHref(t.k, e.id))}>Mở hồ sơ đầy đủ</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

export function ReadPage() {
  const data = useCodex((s) => s.data);
  const ix = useCodexIndex();
  const router = useRouter();
  const [storyParam] = useUrlState("story");
  const [chParam] = useUrlState("ch");
  const [pParam] = useUrlState("p");
  const [peek, setPeek] = useState<Mark | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);

  const stories = ix?.source.stories ?? [];
  const story = stories.find((s) => s.id === storyParam) ?? stories.find((s) => s.chapters.length) ?? stories[0];
  const chapter = story?.chapters.find((c) => c.id === chParam) ?? story?.chapters[0];
  const target = pParam === "" ? -1 : Number(pParam);

  // Nhảy tới đúng đoạn (A.jump của Codex): cuộn vào giữa màn hình; tô sáng làm bằng CSS.
  useEffect(() => {
    if (target < 0 || !chapter) return;
    const t = setTimeout(() => document.getElementById(`p_${target}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 90);
    return () => clearTimeout(t);
  }, [target, chapter]);

  if (!ix) return <p className="py-20 text-center text-sm text-muted-foreground">Đang tải…</p>;
  if (!story || !chapter)
    return (
      <div className="mx-auto grid max-w-4xl gap-4">
        <PageHeader icon={BookOpen} title="Đọc & kiểm tra" />
        <EmptyState>
          Chưa có chương nào.{" "}
          <Link href="/write" className="font-semibold text-primary hover:underline">
            Viết truyện
          </Link>
        </EmptyState>
      </div>
    );

  const d = ix.index.ch[chapter.id] ?? { paras: [], marks: [] };

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <PageHeader icon={BookOpen} title="Đọc & kiểm tra" subtitle="Bấm vào chữ được gạch chân để mở hồ sơ" />

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {stories.length > 1 && (
            <select
              value={story.id}
              onChange={(e) => router.replace(`/read?story=${e.target.value}`)}
              aria-label="Chọn truyện"
              className="h-8 max-w-full rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            >
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          <select
            value={chapter.id}
            onChange={(e) => router.replace(readHref(story.id, e.target.value))}
            aria-label="Chọn chương"
            className="h-8 max-w-full min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            {story.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                Chương {c.ci + 1} — {c.title}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setWarnings(check(data, ix.index, ix.source.chapters))}>
            <ShieldAlert /> Kiểm tra mâu thuẫn
          </Button>
          <Link href={`/write/${story.id}?ch=${chapter.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <PenLine /> Sửa chương
          </Link>
        </div>
        {warnings &&
          (warnings.length ? (
            <ul className="grid gap-1.5" data-testid="warnings">
              {warnings.map((w) => (
                <li key={w} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm">
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Không tìm thấy mâu thuẫn nào.</p>
          ))}
      </section>

      <article className="rounded-xl border bg-card px-5 py-6 font-serif text-[1.075rem] leading-8 sm:px-10">
        <h2 className="mb-5 text-2xl font-semibold">{chapter.title || "Chương"}</h2>
        {d.paras.length === 0 && <p className="text-muted-foreground">Chương này chưa có nội dung.</p>}
        {d.paras.map((p, pi) => (
          <p
            key={pi === target ? `${pi}-${pParam}` : pi}
            id={`p_${pi}`}
            data-target={pi === target || undefined}
            className="mb-4 rounded-md data-target:animate-[para-flash_2.4s_ease-out]"
          >
            <Paragraph text={p} marks={d.marks.filter((m) => m.para === pi)} onPeek={setPeek} />
          </p>
        ))}
      </article>

      <PeekDialog mark={peek} onClose={() => setPeek(null)} />
    </div>
  );
}
