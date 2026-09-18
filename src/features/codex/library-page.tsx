"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Shuffle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, SearchBox } from "@/components/kit/page";
import { useUrlState } from "@/hooks/use-url-state";
import { entityHref } from "@/lib/codex/select";
import { SKILL_SEED, seedToEntity, skillFolders } from "@/lib/codex/skill-library";
import { cn } from "@/lib/utils";
import { useCodex } from "@/store/codex-store";

const FOLDERS = skillFolders();
const FOLDER_KEYS = Object.keys(FOLDERS).sort();
const TYPES = [...new Set(SKILL_SEED.map((s) => s[2]))].sort();
const MECHS = [...new Set(SKILL_SEED.map((s) => s[4]))].sort();
const SHOWN = 300;

/** Xáo trộn có hạt giống: cùng hạt → cùng thứ tự, nên render lại không đổi kết quả. */
function seededPick<T>(list: T[], seed: number, n: number): T[] {
  const c = list.slice();
  let x = seed || 1;
  const rand = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, n);
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px]">{children}</span>;
}

export function LibraryPage() {
  const router = useRouter();
  const addEntity = useCodex((s) => s.addEntity);
  const storySkills = useCodex((s) => (s.data.ent.skill ?? []).length);
  const [folder, setFolder] = useUrlState("folder");
  const [openParam, setOpen] = useUrlState("open");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [mech, setMech] = useState("");
  const [rnd, setRnd] = useState(0);

  const filtered = useMemo(() => {
    let L = SKILL_SEED.map((s, i) => ({ s, i }));
    if (folder) L = L.filter(({ s }) => s[1] === folder);
    if (type) L = L.filter(({ s }) => s[2] === type);
    if (mech) L = L.filter(({ s }) => s[4] === mech);
    if (q) {
      const n = q.toLowerCase();
      L = L.filter(({ s }) => (s[0] + s[4] + s[5] + s[6]).toLowerCase().includes(n));
    }
    return L;
  }, [folder, type, mech, q]);

  const total = filtered.length;
  const shown = rnd && total > 12 ? seededPick(filtered, rnd, 12) : filtered.slice(0, SHOWN);
  const open = openParam === "" ? null : SKILL_SEED[Number(openParam)];

  const addToStory = () => {
    if (!open) return;
    const e = addEntity("skill", seedToEntity(open));
    toast.success("Đã thêm vào truyện");
    router.push(entityHref("skill", e.id));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <PageHeader
        icon={Library}
        title="Thư viện skill mẫu"
        subtitle={`${SKILL_SEED.length} nguyên mẫu · ${FOLDER_KEYS.length} thư mục · bấm một skill để đưa vào truyện`}
      >
        <Button variant="outline" nativeButton={false} render={<Link href="/e/skill" />}>
          Skill trong truyện ({storySkills})
        </Button>
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-card p-2" aria-label="Thư mục">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Thư mục"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm lg:hidden dark:bg-input/30"
          >
            <option value="">Tất cả ({SKILL_SEED.length})</option>
            {FOLDER_KEYS.map((f) => (
              <option key={f} value={f}>
                {f.slice(3)} ({FOLDERS[f]})
              </option>
            ))}
          </select>
          <ul className="hidden max-h-[75dvh] grid-cols-1 gap-0.5 overflow-y-auto lg:grid">
            {["", ...FOLDER_KEYS].map((f) => (
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
                  <span className="text-xs text-muted-foreground tabular-nums">{f ? FOLDERS[f] : SKILL_SEED.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid gap-3">
          <section className="grid gap-2 rounded-xl border bg-card p-3">
            <div className="flex flex-wrap gap-2">
              <SearchBox value={q} onChange={setQ} placeholder="Tìm tên, mô tả, cơ chế…" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Loại"
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
              >
                <option value="">Mọi loại</option>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select
                value={mech}
                onChange={(e) => setMech(e.target.value)}
                aria-label="Cơ chế"
                className="h-8 max-w-48 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
              >
                <option value="">Mọi cơ chế</option>
                {MECHS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground" data-testid="lib-status">
                {rnd ? `Đang bốc ngẫu nhiên 12 trong ${total} skill khớp bộ lọc.` : `Đang hiện ${Math.min(total, SHOWN)} / ${total} kết quả.`}
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
            <EmptyState>Không có skill nào khớp.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="lib-cards">
              {shown.map(({ s, i }) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpen(String(i))}
                    className="grid h-full w-full content-start gap-2 overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary"
                  >
                    <span className="flex items-center justify-between bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      <span>{s[2]}</span>
                      <span>{s[3]}</span>
                    </span>
                    <span className="grid gap-1.5 px-3 pb-3">
                      <span className="font-serif text-base font-semibold">{s[0]}</span>
                      <span className="line-clamp-3 text-sm text-muted-foreground">{s[5]}</span>
                      <span className="flex flex-wrap gap-1">
                        <Chip>{s[4]}</Chip>
                        {s[6] && <Chip>{s[6]}</Chip>}
                      </span>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{open[0]}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-1">
              <Chip>{open[2]}</Chip>
              <Chip>{open[3]}</Chip>
              <Chip>{open[4]}</Chip>
              {open[6] && <Chip>{open[6]}</Chip>}
            </div>
            <p className="text-sm">{open[5]}</p>
            <p className="text-xs text-muted-foreground">Thư mục: {open[1]}</p>
            <p className="text-xs text-muted-foreground">
              Đưa vào truyện sẽ tạo một bản sao sửa được, và từ đó tên skill sẽ được dò tự động trong các chương.
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
