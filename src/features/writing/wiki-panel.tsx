"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildIndex, candidates, toParas, type IndexChapter } from "@/lib/codex/algorithms";
import { entityHref, findEntity, tdef } from "@/lib/codex/select";
import { useCodex } from "@/store/codex-store";

/** Panel phải: mục wiki nhận ra trong chương đang mở + tên lạ (cùng thuật toán với chỉ mục và Dò tên lạ). */
export function WikiPanel({ text }: { text: string }) {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);

  const chapter = useMemo<IndexChapter>(() => ({ id: "cur", storyId: "", storyTitle: "", ci: 0, title: "", paras: toParas(text) }), [text]);

  const present = useMemo(() => {
    const counts = new Map<string, { tk: string; id: string; count: number }>();
    for (const m of buildIndex(data, [chapter]).ch.cur.marks) {
      const key = `${m.tk}:${m.id}`;
      const prev = counts.get(key);
      counts.set(key, { tk: m.tk, id: m.id, count: (prev?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  }, [data, chapter]);

  const unknown = useMemo(() => candidates(data, [chapter]).slice(0, 8), [data, chapter]);

  const characters = present.filter((p) => p.tk === "char");
  const others = present.filter((p) => p.tk !== "char");

  return (
    <div className="grid content-start gap-5 p-3 text-sm">
      <section className="grid gap-1.5">
        <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Nhân vật trong chương ({characters.length})</h3>
        {characters.length === 0 && <p className="text-xs text-muted-foreground italic">Chưa nhận ra nhân vật nào. Gõ @ để chèn.</p>}
        {characters.map(({ id, count }) => {
          const c = findEntity(data, "char", id);
          if (!c) return null;
          const info = [c.f.role, c.f.status, c.f.rank && `bậc ${c.f.rank}`].filter(Boolean).join(" · ");
          return (
            <div key={id} className="grid gap-0.5 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(entityHref("char", id))}
                  className="min-w-0 flex-1 truncate text-left font-semibold hover:text-primary hover:underline"
                >
                  {c.icon || "👤"} {c.name}
                </button>
                <span className="text-[11px] text-muted-foreground">×{count}</span>
              </div>
              {info && <p className="text-[11px] text-muted-foreground">{info}</p>}
            </div>
          );
        })}
      </section>

      {others.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Khác trong wiki</h3>
          {others.map(({ tk, id, count }) => {
            const t = tdef(data, tk);
            const e = findEntity(data, tk, id);
            if (!t || !e) return null;
            return (
              <button
                key={`${tk}:${id}`}
                type="button"
                onClick={() => router.push(entityHref(tk, id))}
                title={t.l}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
              >
                <span>{e.icon || t.ic}</span>
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                <span className="text-[11px] text-muted-foreground">×{count}</span>
              </button>
            );
          })}
        </section>
      )}

      <section className="grid gap-1">
        <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Tên lạ trong chương</h3>
        {unknown.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Không thấy tên lạ nào.</p>
        ) : (
          unknown.map((u) => (
            <div key={u.txt} className="flex items-center gap-2 rounded-md px-1.5 py-1">
              <span className="min-w-0 flex-1 truncate">{u.txt}</span>
              <span className="text-[11px] text-muted-foreground">×{u.n}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Tạo nhân vật ${u.txt}`}
                title="Tạo nhân vật"
                onClick={() => {
                  addEntity("char", { name: u.txt });
                  toast.success(`Đã tạo nhân vật “${u.txt}” trong wiki.`);
                }}
              >
                <UserPlus />
              </Button>
            </div>
          ))
        )}
        <Link href="/scan" className="px-1.5 text-xs font-semibold text-primary hover:underline">
          Dò toàn bộ truyện →
        </Link>
      </section>
    </div>
  );
}
