"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { allTypes, entityHref, tdef } from "@/lib/codex/select";
import { SEED_LIBRARIES, type SeedRow } from "@/lib/codex/seed-libraries";
import { fold } from "@/lib/text";
import { cn } from "@/lib/utils";
import { useCodex } from "@/store/codex-store";

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
  const data = useCodex((s) => s.data);
  const router = useRouter();
  const [q, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  // Dữ liệu thư viện mẫu khá nặng nên chỉ tải khi hộp tìm kiếm mở.
  const [library, setLibrary] = useState<Record<string, SeedRow[]> | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all(SEED_LIBRARIES.map((l) => l.load().then((rows) => [l.k, rows] as const))).then(
      (all) => alive && setLibrary(Object.fromEntries(all)),
    );
    return () => {
      alive = false;
    };
  }, []);
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

    // Mọi loại mục (kể cả loại tự tạo): tên, biệt danh và nội dung các ô thông tin.
    for (const t of allTypes(data))
      for (const e of data.ent[t.k] ?? []) {
        const fields = Object.values(e.f);
        if (!has(e.name, e.gloss, e.aliases, ...fields)) continue;
        const sub =
          e.gloss ||
          [e.aliases, ...t.f.filter((f) => f.t === "sel" || f.t === "rank").map((f) => e.f[f.k])].filter(Boolean).join(" · ");
        push({ key: `${t.k}:${e.id}`, category: t.l, icon: e.icon || t.ic, title: e.name || "(chưa đặt tên)", sub, href: entityHref(t.k, e.id) });
      }
    for (const el of data.elements)
      if (has(el.name, el.desc)) push({ key: `el:${el.id}`, category: "Hệ nguyên tố", icon: el.icon, title: el.name, sub: el.desc.slice(0, 60), href: "/world" });
    // Thư viện mẫu: chỉ khớp theo tên, tối đa 2 mỗi loại và 8 tất cả — mục trong
    // truyện của người dùng luôn phải đứng trước mẫu.
    if (library && n.length >= 2) {
      let budget = 8;
      for (const [k, rows] of Object.entries(library)) {
        const label = tdef(data, k)?.l ?? k;
        let found = 0;
        for (let i = 0; i < rows.length && found < 2 && budget > 0; i++) {
          if (!fold(rows[i][0]).includes(n)) continue;
          found++;
          budget--;
          push({ key: `lib:${k}:${i}`, category: `Thư viện mẫu · ${label}`, icon: "📚", title: rows[i][0], sub: rows[i][1], href: `/library/${k}?open=${i}` });
        }
      }
    }
    return out;
  }, [q, data, library]);

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
            placeholder="Tìm nhân vật, skill, địa danh, hệ…"
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
