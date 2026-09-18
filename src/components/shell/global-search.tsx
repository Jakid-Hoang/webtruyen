"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { viewHref } from "@/hooks/use-url-state";
import type { ViewKey } from "@/lib/nav";
import { fold } from "@/lib/text";
import { cn } from "@/lib/utils";
import { useActiveEra } from "@/store/world-store";

interface Hit {
  key: string;
  category: string;
  icon: string;
  title: string;
  sub?: string;
  href: string;
}

const MAX_HITS = 48;

function Highlight({ text, needle }: { text: string; needle: string }) {
  const i = fold(text).indexOf(fold(needle));
  if (!needle || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-primary/25 text-inherit">{text.slice(i, i + needle.length)}</mark>
      {text.slice(i + needle.length)}
    </>
  );
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Tìm kiếm toàn bộ wiki</DialogTitle>
        {/* Mounted only while open, so query/selection reset on every open. */}
        {open && <SearchBody onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const era = useActiveEra();
  const router = useRouter();
  const [q, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const setQ = (v: string) => {
    setQuery(v);
    setActive(0);
  };

  const hits = useMemo<Hit[]>(() => {
    const n = fold(q.trim());
    if (!n) return [];
    const has = (...xs: (string | undefined)[]) => xs.some((x) => x && fold(x).includes(n));
    const out: Hit[] = [];
    const push = (h: Hit) => out.length < MAX_HITS && out.push(h);
    const to = (view: ViewKey, params: Record<string, string>) => viewHref(view, params);

    for (const c of era.characters)
      if (has(c.name, c.nickname, c.cultivation, c.context, c.currentIdentity, c.hiddenIdentity))
        push({
          key: c.id,
          category: "Nhân vật",
          icon: "👤",
          title: c.name,
          sub: [c.cultivation, c.status === "dead" ? "Đã tử vong" : c.status === "hidden" ? "Ẩn cư" : ""].filter(Boolean).join(" · "),
          href: to("characters", { open: c.id }),
        });
    for (const l of era.worldStructure) {
      if (has(l.name, l.summary))
        push({ key: l.id, category: "Vùng đất", icon: "🗺️", title: l.name, sub: l.summary.slice(0, 60), href: to("world", { open: l.id }) });
      for (const f of l.factions)
        if (has(f.name, f.description))
          push({ key: f.id, category: "Thế lực", icon: "🛡️", title: f.name, sub: l.name, href: to("factions", { open: f.id }) });
    }
    const simple = [
      { list: era.cultivationArts, view: "arts" as const, category: "Công pháp", icon: "📘", fields: (x: (typeof era.cultivationArts)[number]) => [x.rank, x.origin] },
      { list: era.treasures, view: "treasures" as const, category: "Pháp bảo", icon: "⚔️", fields: (x: (typeof era.treasures)[number]) => [x.rank, x.type] },
      { list: era.skills, view: "skills" as const, category: "Thần thông", icon: "⚡", fields: (x: (typeof era.skills)[number]) => [x.rank, x.type] },
      { list: era.domains, view: "domains" as const, category: "Lĩnh vực", icon: "🌀", fields: (x: (typeof era.domains)[number]) => [x.completionLevel] },
      { list: era.pills, view: "pills" as const, category: "Đan dược", icon: "⚗️", fields: (x: (typeof era.pills)[number]) => [x.rank, x.type] },
    ];
    for (const group of simple)
      for (const x of group.list as { id: string; name: string }[]) {
        const extra = (group.fields as (x: unknown) => string[])(x);
        if (has(x.name, ...extra))
          push({ key: x.id, category: group.category, icon: group.icon, title: x.name, sub: extra.filter(Boolean).join(" · "), href: to(group.view, { open: x.id }) });
      }
    for (const r of era.races)
      if (has(r.name, r.alias, r.summary)) push({ key: r.id, category: "Chủng tộc", icon: r.emoji || "🧬", title: r.name, sub: r.alias, href: to("races", { open: r.id }) });
    for (const ps of era.powerSystems)
      for (const m of ps.majorRealms)
        if (has(m.name, m.tier)) push({ key: m.id, category: "Cảnh giới", icon: "⛰️", title: m.name, sub: ps.name, href: to("realms", { open: m.id }) });
    return out;
  }, [q, era]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (h: Hit) => {
    onDone();
    router.push(h.href);
  };

  let lastCategory = "";

  return (
    <>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && hits[active]) {
                go(hits[active]);
              }
            }}
            placeholder="Tìm trên toàn bộ wiki…"
            aria-label="Tìm trên toàn bộ wiki"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border px-1.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <ul ref={listRef} className="max-h-[50dvh] overflow-y-auto p-2" role="listbox">
          {q.trim() && hits.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy kết quả.</li>}
          {!q.trim() && <li className="py-8 text-center text-sm text-muted-foreground">Nhập để tìm nhân vật, thế lực, công pháp…</li>}
          {hits.map((h, i) => {
            const header = h.category !== lastCategory ? h.category : null;
            lastCategory = h.category;
            return (
              <li key={`${h.category}-${h.key}`}>
                {header && <p className="px-2 pt-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase">{header}</p>}
                <button
                  type="button"
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm", i === active && "bg-muted")}
                >
                  <span>{h.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      <Highlight text={h.title} needle={q.trim()} />
                    </span>
                    {h.sub && <span className="block truncate text-xs text-muted-foreground">{h.sub}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {hits.length > 0 && (
          <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
            {hits.length}
            {hits.length === MAX_HITS && "+"} kết quả · ↑↓ để chọn · Enter để mở
          </p>
        )}
    </>
  );
}
