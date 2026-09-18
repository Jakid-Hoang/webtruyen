"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, SearchBox } from "@/components/kit/page";
import { candidates, type Candidate } from "@/lib/codex/algorithms";
import { allTypes, entityHref } from "@/lib/codex/select";
import { matches } from "@/lib/text";
import { useCodex } from "@/store/codex-store";
import { useStoryChapters } from "./use-codex-index";

function AliasDialog({ cand, onClose }: { cand: Candidate | null; onClose: () => void }) {
  const data = useCodex((s) => s.data);
  const updateEntity = useCodex((s) => s.updateEntity);
  const [q, setQ] = useState("");
  const rows = allTypes(data).flatMap((t) => (data.ent[t.k] ?? []).map((e) => ({ t, e })));
  const visible = rows.filter(({ e }) => matches(q, e.name, e.aliases)).slice(0, 200);

  const merge = (k: string, id: string, name: string) => {
    if (!cand) return;
    updateEntity(k, id, (e) => {
      const cur = e.aliases
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (!cur.some((x) => x.toLowerCase() === cand.txt.toLowerCase())) cur.push(cand.txt);
      return { ...e, aliases: cur.join(", ") };
    });
    toast.success(`“${cand.txt}” giờ là biệt danh của ${name}`);
    onClose();
  };

  return (
    <Dialog open={!!cand} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gộp “{cand?.txt}” làm biệt danh của</DialogTitle>
        </DialogHeader>
        <SearchBox value={q} onChange={setQ} placeholder="Tìm…" className="flex-none" />
        <ul className="grid max-h-[54dvh] gap-0.5 overflow-y-auto">
          {visible.map(({ t, e }) => (
            <li key={`${t.k}:${e.id}`}>
              <button
                type="button"
                onClick={() => merge(t.k, e.id, e.name)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span>{e.icon || t.ic}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.l}</span>
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Chưa có mục nào để gộp vào.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function ScanPage() {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);
  const ignoreName = useCodex((s) => s.ignoreName);
  const unignoreName = useCodex((s) => s.unignoreName);
  const source = useStoryChapters();
  const [typeFor, setTypeFor] = useState<Record<string, string>>({});
  const [aliasFor, setAliasFor] = useState<Candidate | null>(null);

  const list = useMemo(() => (source ? candidates(data, source.chapters) : []), [data, source]);
  const types = allTypes(data);
  const manyStories = (source?.stories.length ?? 0) > 1;

  if (!source) return <p className="py-20 text-center text-sm text-muted-foreground">Đang dò…</p>;

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <PageHeader icon={ScanSearch} title="Dò tên lạ" subtitle="Những cái tên xuất hiện trong truyện nhưng chưa có hồ sơ" />

      {source.chapters.length === 0 ? (
        <EmptyState>
          Chưa có chương nào để dò.{" "}
          <Link href="/write" className="font-semibold text-primary hover:underline">
            Viết vài chương trước đã.
          </Link>
        </EmptyState>
      ) : (
        <>
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Hệ thống tìm các cụm từ viết hoa giữa câu. Ưu tiên cụm xuất hiện nhiều lần và không đứng đầu câu, vì đầu câu thì chữ nào cũng hoa. Dò được{" "}
            <b className="text-foreground">{list.length}</b> cái tên khả nghi.
          </p>

          {list.length === 0 ? (
            <EmptyState>Không còn tên lạ nào. Mọi cái tên trong truyện đều đã có hồ sơ hoặc đã bị bỏ qua.</EmptyState>
          ) : (
            <ul className="grid gap-2" data-testid="candidates">
              {list.map((o) => {
                const tk = typeFor[o.txt] ?? "char";
                return (
                  <li key={o.txt} className="grid gap-1.5 rounded-xl border bg-card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong className="font-serif text-lg" data-testid="cand-name">
                          {o.txt}
                        </strong>
                        <p className="text-xs text-muted-foreground">
                          {o.n} lần · {o.mid} lần giữa câu · lần đầu ở {manyStories && `${o.storyTitle}, `}chương {o.ci + 1}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={tk}
                          onChange={(e) => setTypeFor((m) => ({ ...m, [o.txt]: e.target.value }))}
                          aria-label={`Loại mục cho ${o.txt}`}
                          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
                        >
                          {types.map((t) => (
                            <option key={t.k} value={t.k}>
                              {t.l}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => {
                            const t = types.find((x) => x.k === tk);
                            const e = addEntity(tk, { name: o.txt });
                            toast.success(`Đã tạo ${t?.l.toLowerCase()} “${o.txt}”`);
                            router.push(entityHref(tk, e.id));
                          }}
                        >
                          Tạo
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAliasFor(o)}>
                          Gộp làm biệt danh
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:text-destructive" onClick={() => ignoreName(o.txt)}>
                          Bỏ qua
                        </Button>
                      </div>
                    </div>
                    <p className="font-serif text-sm text-muted-foreground">…{o.ex}…</p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {data.ignore.length > 0 && (
        <section className="grid gap-2 rounded-xl border bg-card p-4">
          <h3 className="font-bold">Đã bỏ qua ({data.ignore.length})</h3>
          <div className="flex flex-wrap gap-1.5">
            {data.ignore.map((x, i) => (
              <button
                key={`${x}-${i}`}
                type="button"
                onClick={() => unignoreName(i)}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
              >
                {x} <X className="size-3" />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Bấm để đưa trở lại danh sách dò.</p>
        </section>
      )}

      <AliasDialog key={aliasFor?.txt} cand={aliasFor} onClose={() => setAliasFor(null)} />
    </div>
  );
}
