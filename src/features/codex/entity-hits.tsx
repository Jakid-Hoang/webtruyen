"use client";

import Link from "next/link";
import { useCodexIndex, readHref } from "./use-codex-index";

/** “Nơi xuất hiện trong truyện” — tự dò tên + biệt danh trong mọi chương (hits() của Codex). */
export function EntityHits({ tk, id }: { tk: string; id: string }) {
  const ix = useCodexIndex();
  if (!ix) return <p className="text-sm text-muted-foreground">Đang dò…</p>;
  const h = ix.index.by[`${tk}:${id}`] ?? [];
  if (!h.length)
    return <p className="text-sm text-muted-foreground">Chưa xuất hiện trong chương nào. Viết tên này vào một chương, hệ thống tự tìm ra.</p>;
  const manyStories = ix.source.stories.length > 1;
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-muted-foreground" data-testid="hit-summary">
        {h.length} lần · {new Set(h.map((x) => x.cid)).size} chương
      </p>
      <ul className="grid gap-1.5">
        {h.slice(0, 60).map((x, i) => (
          <li key={i}>
            <Link href={readHref(x.storyId, x.cid, x.para)} className="block rounded-lg border px-3 py-2 text-left hover:border-primary hover:bg-muted/50">
              <span className="block text-xs font-semibold text-muted-foreground">
                {manyStories && `${x.storyTitle} · `}Chương {x.ci + 1} · {x.title} · đoạn {x.para + 1}
              </span>
              <span className="block font-serif text-sm">
                …{x.snip.slice(0, x.off)}
                <b className="text-primary">{x.snip.substr(x.off, x.len)}</b>
                {x.snip.slice(x.off + x.len)}…
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
