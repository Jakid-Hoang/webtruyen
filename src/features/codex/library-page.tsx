"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Shuffle, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, SearchBox } from "@/components/kit/page";
import { useUrlState } from "@/hooks/use-url-state";
import { entityHref, tdef } from "@/lib/codex/select";
import { SEED_LIBRARIES, colKey, folderCounts, seedLibrary, seedToEntity, type SeedLibrary, type SeedRow } from "@/lib/codex/seed-libraries";
import { cn } from "@/lib/utils";
import { useCodex } from "@/store/codex-store";

const SHOWN = 300;

/** Xáo trộn có hạt giống: cùng hạt → cùng thứ tự, nên render lại không đổi kết quả. */
function seededPick<T>(list: T[], seed: number, n: number): T[] {
  const c = list.slice();
  let x = seed || 1;
  const rand = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, n);
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">{children}</span>;
}

/** Dải chuyển giữa các thư viện mẫu. */
function LibrarySwitcher({ current }: { current: string }) {
  const data = useCodex((s) => s.data);
  return (
    <nav aria-label="Chọn thư viện" className="flex gap-1.5 overflow-x-auto pb-1">
      {SEED_LIBRARIES.map((l) => {
        const t = tdef(data, l.k);
        return (
          <Link
            key={l.k}
            href={`/library/${l.k}`}
            aria-current={l.k === current ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
              l.k === current ? "border-primary bg-primary/15 text-primary" : "hover:bg-muted",
            )}
          >
            {t?.ic} {t?.l}
          </Link>
        );
      })}
    </nav>
  );
}

export function LibraryPage({ typeKey }: { typeKey: string }) {
  const lib = seedLibrary(typeKey);
  const [rows, setRows] = useState<{ k: string; rows: SeedRow[] } | null>(null);

  useEffect(() => {
    if (!lib) return;
    let alive = true;
    void lib.load().then((r) => alive && setRows({ k: lib.k, rows: r }));
    return () => {
      alive = false;
    };
  }, [lib]);

  if (!lib)
    return (
      <div className="mx-auto grid max-w-6xl gap-4">
        <LibrarySwitcher current={typeKey} />
        <EmptyState>Loại mục này chưa có thư viện mẫu.</EmptyState>
      </div>
    );
  if (!rows || rows.k !== lib.k) return <p className="py-20 text-center text-sm text-muted-foreground">Đang mở thư viện…</p>;
  return <LibraryView key={lib.k} lib={lib} rows={rows.rows} />;
}

function LibraryView({ lib, rows }: { lib: SeedLibrary; rows: SeedRow[] }) {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);
  const t = tdef(data, lib.k)!;
  const inStory = (data.ent[lib.k] ?? []).length;
  const [folder, setFolder] = useUrlState("folder");
  const [openParam, setOpen] = useUrlState("open");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Record<number, string>>({});
  const [rnd, setRnd] = useState(0);

  const folders = useMemo(() => folderCounts(rows, lib), [rows, lib]);
  const folderKeys = useMemo(() => Object.keys(folders).sort(), [folders]);
  const options = useMemo(() => Object.fromEntries(lib.filters.map((c) => [c, [...new Set(rows.map((r) => r[c]))].sort()])), [lib, rows]);
  const label = (c: number) => t.f.find((f) => f.k === colKey(lib, c))?.l ?? "";

  const filtered = useMemo(() => {
    let L = rows.map((s, i) => ({ s, i }));
    if (folder) L = L.filter(({ s }) => s[lib.folderCol] === folder);
    for (const [c, v] of Object.entries(filter)) if (v) L = L.filter(({ s }) => s[+c] === v);
    if (q) {
      const n = q.toLowerCase();
      L = L.filter(({ s }) => s.filter((_, j) => j !== lib.folderCol).join(" ").toLowerCase().includes(n));
    }
    return L;
  }, [rows, folder, filter, q, lib]);

  const total = filtered.length;
  const shown = rnd && total > 12 ? seededPick(filtered, rnd, 12) : filtered.slice(0, SHOWN);
  const open = openParam === "" ? null : rows[Number(openParam)];

  const addToStory = () => {
    if (!open) return;
    const e = addEntity(lib.k, seedToEntity(lib, open, t.ic));
    toast.success("Đã thêm vào truyện");
    router.push(entityHref(lib.k, e.id));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <LibrarySwitcher current={lib.k} />
      <PageHeader
        icon={Library}
        title={`Thư viện mẫu · ${t.l}`}
        subtitle={`${rows.length} nguyên mẫu · ${folderKeys.length} thư mục · bấm một mục để đưa vào truyện`}
      >
        <Link href={`/e/${lib.k}`} className={buttonVariants({ variant: "outline" })}>
          {t.l} trong truyện ({inStory})
        </Link>
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-card p-2" aria-label="Thư mục">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Thư mục"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm lg:hidden dark:bg-input/30"
          >
            <option value="">Tất cả ({rows.length})</option>
            {folderKeys.map((f) => (
              <option key={f} value={f}>
                {f.slice(3)} ({folders[f]})
              </option>
            ))}
          </select>
          <ul className="hidden max-h-[75dvh] grid-cols-1 gap-0.5 overflow-y-auto lg:grid">
            {["", ...folderKeys].map((f) => (
              <li key={f || "all"}>
                <button
                  type="button"
                  onClick={() => setFolder(f)}
                  aria-current={folder === f ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                    folder === f ? "bg-primary/15 font-semibold" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate">{f ? f.slice(3) : "Tất cả"}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{f ? folders[f] : rows.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid gap-3">
          <section className="grid gap-2 rounded-xl border bg-card p-3">
            <div className="flex flex-wrap gap-2">
              <SearchBox value={q} onChange={setQ} placeholder="Tìm tên, mô tả…" />
              {lib.filters.map((c) => (
                <select
                  key={c}
                  value={filter[c] ?? ""}
                  onChange={(e) => setFilter((m) => ({ ...m, [c]: e.target.value }))}
                  aria-label={label(c)}
                  className="h-8 max-w-48 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                >
                  <option value="">{label(c)}: tất cả</option>
                  {options[c].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground" data-testid="lib-status">
                {rnd ? `Đang bốc ngẫu nhiên 12 trong ${total} mục khớp bộ lọc.` : `Đang hiện ${Math.min(total, SHOWN)} / ${total} kết quả.`}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant={rnd ? "default" : "outline"} onClick={() => setRnd(Math.floor(Math.random() * 2e9) + 1)}>
                  <Shuffle /> {rnd ? "Bốc lại" : "Bốc ngẫu nhiên 12"}
                </Button>
                {!!rnd && (
                  <Button size="sm" variant="ghost" onClick={() => setRnd(0)}>
                    <X /> Tắt
                  </Button>
                )}
              </div>
            </div>
          </section>

          {shown.length === 0 ? (
            <EmptyState>Không có mục nào khớp.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="lib-cards">
              {shown.map(({ s, i }) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpen(String(i))}
                    className="grid h-full w-full content-start gap-2 overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary"
                  >
                    <span className="flex items-center justify-between gap-2 bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      <span className="truncate">{s[lib.head[0]]}</span>
                      {lib.head[1] !== undefined && <span className="truncate">{s[lib.head[1]]}</span>}
                    </span>
                    <span className="grid gap-1.5 px-3 pb-3">
                      <span className="font-serif text-base font-semibold">{s[0]}</span>
                      {lib.glossCol >= 0 && s[lib.glossCol] && <span className="text-xs font-medium text-primary">{s[lib.glossCol]}</span>}
                      <span className="line-clamp-3 text-sm text-muted-foreground">{s[lib.body]}</span>
                      {lib.tags.some((c) => s[c]) && (
                        <span className="flex flex-wrap gap-1">
                          {lib.tags.map((c) => s[c] && <Chip key={c}>{s[c]}</Chip>)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen("")}>
        {open && (
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{open[0]}</DialogTitle>
              {lib.glossCol >= 0 && open[lib.glossCol] && <p className="font-medium text-primary">{open[lib.glossCol]}</p>}
            </DialogHeader>
            <dl className="grid gap-2 text-sm">
              {lib.cols.map((k, j) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{t.f.find((f) => f.k === k)?.l ?? k}</dt>
                  <dd>{open[j + lib.firstCol]}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">Thư mục: {open[lib.folderCol]}</p>
            <p className="text-xs text-muted-foreground">
              Đưa vào truyện sẽ tạo một bản sao sửa được, và từ đó tên này sẽ được dò tự động trong các chương.
            </p>
            <DialogFooter>
              <Button onClick={addToStory}>Đưa vào truyện</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
