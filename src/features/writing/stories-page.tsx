"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { FileUp, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton, EmptyState, PageHeader } from "@/components/kit/page";
import { createStory, deleteStory, writingDb } from "@/lib/writing/db";
import { askConfirm } from "@/store/confirm-store";
import { useWorldStore } from "@/store/world-store";
import { ImportDialog } from "./import-dialog";

export function StoriesPage() {
  const router = useRouter();
  const activeEraId = useWorldStore((s) => s.activeEraId);
  const eras = useWorldStore((s) => s.data.eras);
  const [importOpen, setImportOpen] = useState(false);

  const stories = useLiveQuery(async () => {
    const db = writingDb();
    const [all, chapters] = await Promise.all([db.stories.orderBy("updatedAt").reverse().toArray(), db.chapters.toArray()]);
    return all.map((s) => {
      const own = chapters.filter((c) => c.storyId === s.id);
      return { ...s, chapterCount: own.length, words: own.reduce((n, c) => n + c.wordCount, 0) };
    });
  }, []);

  const create = async () => {
    const s = await createStory("Truyện mới", activeEraId);
    router.push(`/write/${s.id}`);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader icon={PenLine} title="Viết Truyện" subtitle="Viết theo chương, liên kết nhân vật trong wiki, xuất / nhập Word và Google Docs">
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <FileUp /> Nhập truyện
        </Button>
        <AddButton onClick={() => void create()}>Truyện mới</AddButton>
      </PageHeader>

      {stories === undefined ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : stories.length === 0 ? (
        <EmptyState>
          Chưa có truyện nào.{" "}
          <button onClick={() => void create()} className="font-semibold text-primary hover:underline">
            Bắt đầu viết
          </button>{" "}
          hoặc nhập từ file / Google Docs.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {stories.map((s) => (
            <li key={s.id} className="group relative grid gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
              <Link href={`/write/${s.id}`} className="text-lg font-bold after:absolute after:inset-0 hover:text-primary">
                {s.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {s.chapterCount} chương · {s.words.toLocaleString("vi")} chữ
                {s.eraId && ` · ${eras.find((e) => e.id === s.eraId)?.name ?? "Era đã xoá"}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Sửa lần cuối {new Date(s.updatedAt).toLocaleString("vi", { dateStyle: "medium", timeStyle: "short" })}
                {s.gdoc && " · 📄 Đã liên kết Google Docs"}
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                aria-label={`Xoá ${s.title}`}
                onClick={() =>
                  askConfirm({
                    title: `Xoá truyện “${s.title}”?`,
                    description: `${s.chapterCount} chương (${s.words.toLocaleString("vi")} chữ) sẽ bị xoá vĩnh viễn. Doc trên Google Drive (nếu có) không bị ảnh hưởng.`,
                    confirmLabel: "Xoá truyện",
                    destructive: true,
                    onConfirm: () => void deleteStory(s.id),
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={(id) => router.push(`/write/${id}`)} />
    </div>
  );
}
