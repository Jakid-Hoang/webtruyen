"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/kit/page";
import { allTypes, elementName, entityName } from "@/lib/codex/select";
import { writingDb } from "@/lib/writing/db";
import { useCodex } from "@/store/codex-store";
import { useCodexIndex } from "./use-codex-index";

type Datum = { label: string; value: number };

function top(entries: Datum[], n = 8) {
  return entries.filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, n);
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

/** Cột ngang một màu; giá trị ghi bằng chữ thường, rê chuột hiện chi tiết. */
function Bars({ data }: { data: Datum[] }) {
  if (data.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="grid gap-2">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-2 text-sm" title={`${d.label}: ${d.value}`}>
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-3 rounded-r bg-muted/60">
            <span className="block h-full rounded-r bg-primary/80 group-hover:bg-primary" style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatsPage() {
  const data = useCodex((s) => s.data);
  const writing = useLiveQuery(async () => {
    const chapters = await writingDb().chapters.toArray();
    return { chapters: chapters.length, words: chapters.reduce((n, c) => n + c.wordCount, 0) };
  }, []);

  const s = useMemo(() => {
    const chars = data.ent.char ?? [];
    const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    const status = new Map<string, number>();
    for (const c of chars) count(status, c.f.status || "Chưa rõ");
    const byElement = new Map<string, number>();
    for (const t of allTypes(data)) if (t.els) for (const e of data.ent[t.k] ?? []) for (const id of e.els) count(byElement, id);
    const byFaction = new Map<string, number>();
    for (const c of chars) for (const f of c.r.faction ?? []) count(byFaction, f);
    return {
      status: [...status].map(([label, value]) => ({ label, value })),
      elements: [...byElement].map(([id, value]) => ({ label: elementName(data, id), value })),
      factions: [...byFaction].map(([id, value]) => ({ label: entityName(data, "faction", id), value })),
      relations: chars.map((c) => ({ label: c.name, value: c.rel.length })),
    };
  }, [data]);

  const ix = useCodexIndex();
  const appear = (data.ent.char ?? []).map((c) => ({ label: c.name, value: ix?.index.by[`char:${c.id}`]?.length ?? 0 }));

  const era = data.eras.find((e) => e.id === data.eraId);

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <PageHeader icon={BarChart3} title="Thống kê" subtitle={`${data.world.name} · thời đại ${era?.name ?? ""}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {allTypes(data).map((t) => (
          <div key={t.k} className="grid gap-0.5 rounded-xl border bg-card p-3">
            <span className="truncate text-xs text-muted-foreground">
              {t.ic} {t.l}
            </span>
            <span className="text-2xl font-extrabold tabular-nums">{(data.ent[t.k] ?? []).length}</span>
          </div>
        ))}
        <div className="grid gap-0.5 rounded-xl border bg-card p-3">
          <span className="text-xs text-muted-foreground">📖 Chương</span>
          <span className="text-2xl font-extrabold tabular-nums">{writing?.chapters ?? 0}</span>
        </div>
        <div className="grid gap-0.5 rounded-xl border bg-card p-3">
          <span className="text-xs text-muted-foreground">✍ Chữ đã viết</span>
          <span className="text-2xl font-extrabold tabular-nums">{(writing?.words ?? 0).toLocaleString("vi")}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tình trạng nhân vật">
          <Bars data={top(s.status)} />
        </Panel>
        <Panel title="Phân bố hệ">
          <Bars data={top(s.elements)} />
        </Panel>
        <Panel title="Thế lực đông người">
          <Bars data={top(s.factions)} />
        </Panel>
        <Panel title="Nhiều quan hệ nhất">
          <Bars data={top(s.relations, 6)} />
        </Panel>
      </div>
      <Panel title="Xuất hiện nhiều nhất trong truyện">
        <Bars data={top(appear)} />
      </Panel>
    </div>
  );
}
