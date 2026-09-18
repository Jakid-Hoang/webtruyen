"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { entityHref, findEntity } from "@/lib/codex/select";
import { useCodex } from "@/store/codex-store";
import { findUnknownNames, type WikiEntry } from "./editor/wiki-entries";

/** Panel phải: mục wiki xuất hiện trong chương đang mở + gợi ý tên lạ. */
export function WikiPanel({ text, entries }: { text: string; entries: WikiEntry[] }) {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);

  // Gộp tên + biệt danh của cùng một mục, cộng số lần xuất hiện.
  const present = useMemo(() => {
    const seen = new Map<string, { entry: WikiEntry; count: number }>();
    for (const e of entries) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${e.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu");
      const count = text.match(re)?.length ?? 0;
      if (!count) continue;
      const key = `${e.kind}:${e.id}`;
      const prev = seen.get(key);
      seen.set(key, { entry: prev?.entry ?? e, count: (prev?.count ?? 0) + count });
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [text, entries]);

  const unknown = useMemo(() => findUnknownNames(text, new Set(entries.map((e) => e.name))), [text, entries]);

  const characters = present.filter((p) => p.entry.kind === "char");
  const others = present.filter((p) => p.entry.kind !== "char");
  const open = (e: WikiEntry) => router.push(entityHref(e.kind, e.id));

  return (
    <div className="grid content-start gap-5 p-3 text-sm">
      <section className="grid gap-1.5">
        <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Nhân vật trong chương ({characters.length})</h3>
        {characters.length === 0 && <p className="text-xs text-muted-foreground italic">Chưa nhận ra nhân vật nào. Gõ @ để chèn.</p>}
        {characters.map(({ entry, count }) => {
          const c = findEntity(data, "char", entry.id);
          const info = [c?.f.role, c?.f.status, c?.f.rank && `bậc ${c.f.rank}`].filter(Boolean).join(" · ");
          return (
            <div key={entry.id} className="grid gap-0.5 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => open(entry)} className="min-w-0 flex-1 truncate text-left font-semibold hover:text-primary hover:underline">
                  {entry.icon} {entry.canonical}
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
          {others.map(({ entry, count }) => (
            <button
              key={`${entry.kind}:${entry.id}`}
              type="button"
              onClick={() => open(entry)}
              title={entry.typeLabel}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
            >
              <span>{entry.icon}</span>
              <span className="min-w-0 flex-1 truncate">{entry.canonical}</span>
              <span className="text-[11px] text-muted-foreground">×{count}</span>
            </button>
          ))}
        </section>
      )}

      {unknown.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Tên lạ xuất hiện nhiều</h3>
          <p className="text-[11px] text-muted-foreground">Có thể là nhân vật chưa có trong wiki.</p>
          {unknown.map((u) => (
            <div key={u.name} className="flex items-center gap-2 rounded-md px-1.5 py-1">
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <span className="text-[11px] text-muted-foreground">×{u.count}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Tạo nhân vật ${u.name}`}
                title="Tạo nhân vật"
                onClick={() => {
                  addEntity("char", { name: u.name });
                  toast.success(`Đã tạo nhân vật “${u.name}” trong wiki.`);
                }}
              >
                <UserPlus />
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
