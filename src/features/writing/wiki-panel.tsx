"use client";

import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNav } from "@/hooks/use-lookups";
import { createEntity } from "@/lib/schema/world";
import { MENTION_KINDS, parseMentionId } from "@/lib/writing/schema";
import { useActiveEra, useWorldStore } from "@/store/world-store";
import { findUnknownNames, type WikiEntry } from "./editor/wiki-entries";

/** Right panel: wiki entities appearing in the current chapter + unknown-name suggestions. */
export function WikiPanel({ text, entries, chapterNumber }: { text: string; entries: WikiEntry[]; chapterNumber: number }) {
  const era = useActiveEra();
  const nav = useNav();
  const addItem = useWorldStore((s) => s.addItem);
  const updateItem = useWorldStore((s) => s.updateItem);

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

  const characters = present.filter((p) => p.entry.kind === "c");
  const others = present.filter((p) => p.entry.kind !== "c");
  const byId = new Map(era.characters.map((c) => [c.id, c]));

  const open = (e: WikiEntry) => {
    const parsed = parseMentionId(`${e.kind}:${e.id}`)!;
    nav.item(MENTION_KINDS[parsed.kind].view, parsed.id);
  };

  return (
    <div className="grid content-start gap-5 p-3 text-sm">
      <section className="grid gap-1.5">
        <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Nhân vật trong chương ({characters.length})</h3>
        {characters.length === 0 && <p className="text-xs text-muted-foreground italic">Chưa nhận ra nhân vật nào. Gõ @ để chèn.</p>}
        {characters.map(({ entry, count }) => {
          const c = byId.get(entry.id);
          return (
            <div key={entry.id} className="grid gap-1 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => open(entry)} className="min-w-0 flex-1 truncate text-left font-semibold hover:text-primary hover:underline">
                  👤 {c?.name ?? entry.name}
                </button>
                <span className="text-[11px] text-muted-foreground">×{count}</span>
              </div>
              {c?.cultivation && <p className="text-[11px] text-muted-foreground">⚡ {c.cultivation}</p>}
              {c && !c.firstChapter && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="justify-self-start"
                  onClick={() => {
                    updateItem("characters", c.id, { firstChapter: String(chapterNumber) });
                    toast.success(`Đặt chương xuất hiện của ${c.name} = ${chapterNumber}`);
                  }}
                >
                  📖 Xuất hiện lần đầu ở chương {chapterNumber}
                </Button>
              )}
            </div>
          );
        })}
      </section>

      {others.length > 0 && (
        <section className="grid gap-1">
          <h3 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Khác trong wiki</h3>
          {others.map(({ entry, count }) => (
            <button key={`${entry.kind}:${entry.id}`} type="button" onClick={() => open(entry)} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted">
              <span>{MENTION_KINDS[entry.kind].icon}</span>
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
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
                  addItem("characters", createEntity("characters", { name: u.name, firstChapter: String(chapterNumber) }), "start");
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
