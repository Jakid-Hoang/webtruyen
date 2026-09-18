"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/kit/page";
import { fold } from "@/lib/text";
import type { Era } from "@/lib/schema/world";
import { useActiveEra } from "@/store/world-store";

type Datum = { label: string; value: number };

const topN = (entries: Datum[], n = 7) => entries.filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, n);

function countBy<T>(items: T[], key: (t: T) => string | undefined): Datum[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it)?.trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([label, value]) => ({ label, value }));
}

function Panel({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
      {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
    </section>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>;
}

/** Single-series horizontal bars: one hue, values in text ink, native tooltip on hover. */
function Bars({ data, unit = "" }: { data: Datum[]; unit?: string }) {
  if (data.length === 0) return <Empty />;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="grid gap-2">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-2 text-sm" title={`${d.label}: ${d.value}${unit}`}>
          <span className="truncate text-muted-foreground">{d.label}</span>
          <span className="h-3 rounded-r bg-muted/60">
            <span
              className="block h-full rounded-r bg-primary/80 transition-colors group-hover:bg-primary"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Donut with an always-visible legend (label + count + %), so color is never the only cue. */
function Donut({ data, colors }: { data: Datum[]; colors: Record<string, string> }) {
  const shown = data.filter((d) => d.value > 0);
  const total = shown.reduce((n, d) => n + d.value, 0);
  if (total === 0) return <Empty />;
  const r = 15.915; // circumference ≈ 100
  // Segment i starts where the previous ones end; 25 rotates the start to 12 o'clock.
  const pcts = shown.map((d) => (d.value / total) * 100);
  const offsets = pcts.map((_, i) => 25 - pcts.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 42 42" className="size-32 shrink-0" role="img" aria-label={shown.map((d) => `${d.label} ${d.value}`).join(", ")}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-muted)" strokeWidth="6" />
        {shown.map((d, i) => {
          const pct = pcts[i];
          const gap = shown.length > 1 ? 0.8 : 0;
          return (
            <circle
              key={d.label}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={colors[d.label]}
              strokeWidth="6"
              strokeDasharray={`${Math.max(0, pct - gap)} ${100 - Math.max(0, pct - gap)}`}
              strokeDashoffset={offsets[i]}
            >
              <title>{`${d.label}: ${d.value} (${Math.round(pct)}%)`}</title>
            </circle>
          );
        })}
        <text x="21" y="22.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="currentColor">
          {total}
        </text>
      </svg>
      <ul className="grid gap-1.5 text-sm">
        {shown.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: colors[d.label] }} />
            <span>{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
            <span className="text-xs text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl border bg-card p-4">
      <span className="text-xs font-semibold text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-3xl font-extrabold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function Highlight({ label, top }: { label: string; top?: Datum }) {
  return (
    <div className="grid gap-0.5 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase">{label}</span>
      <span className="truncate font-bold">{top ? top.label : "—"}</span>
      {top && <span className="text-xs text-muted-foreground">{top.value}</span>}
    </div>
  );
}

function useStats(era: Era) {
  return useMemo(() => {
    const chars = era.characters;
    const validRels = (c: Era["characters"][number]) => c.relationships.filter((r) => r.targetId && r.type);
    const factions = era.worldStructure.flatMap((l) => l.factions);
    const facName = new Map(factions.map((f) => [f.id, f.name]));
    const locName = new Map(era.worldStructure.map((l) => [l.id, l.name]));
    const raceById = new Map(era.races.map((r) => [r.id, r]));
    const majors = era.powerSystems.flatMap((p) => p.majorRealms);
    const holders = (name: string) => {
      const n = fold(name.trim());
      return n ? chars.filter((c) => fold(c.cultivation).includes(n)).length : 0;
    };

    const byFaction = countBy(chars, (c) => facName.get(c.factionId));
    const byArt = era.cultivationArts.map((a) => ({ label: a.name, value: a.ownerIds.length }));
    const byRels = chars.map((c) => ({ label: c.name, value: validRels(c).length }));
    const byRace = countBy(chars, (c) => {
      const r = raceById.get(c.raceId);
      return r ? `${r.emoji} ${r.name}` : undefined;
    });
    const byRealm = majors.map((m) => ({ label: m.name, value: holders(m.name) + m.subRealms.reduce((n, s) => n + holders(s.name), 0) }));
    const relTypes = countBy(chars.flatMap(validRels), (r) => r.type);

    return {
      alive: chars.filter((c) => c.status === "alive").length,
      dead: chars.filter((c) => c.status === "dead").length,
      hidden: chars.filter((c) => c.status === "hidden").length,
      factions: factions.length,
      racesAssigned: chars.filter((c) => raceById.has(c.raceId)).length,
      majors: majors.length,
      subs: majors.reduce((n, m) => n + m.subRealms.length, 0),
      byFaction,
      byArt,
      byRels,
      byRace,
      byRealm,
      relTypes,
      totalRels: Math.round(chars.reduce((n, c) => n + validRels(c).length, 0) / 2),
      byCultivation: countBy(chars, (c) => c.cultivation),
      byLocation: countBy(chars, (c) => locName.get(c.locationId)),
      pillRanks: countBy(era.pills, (p) => p.rank),
      domainLevels: countBy(era.domains, (d) => d.completionLevel || "Chưa xác định"),
    };
  }, [era]);
}

const STATUS_COLORS = { "Còn sống": "#22c55e", "Tử vong": "#ef4444", "Ẩn cư": "#eab308" };
const DOMAIN_COLORS = { "Hoàn chỉnh": "#f43f5e", "Đang hoàn thiện": "#f97316", "Chưa hoàn chỉnh": "#71717a", "Chưa xác định": "#a1a1aa" };

export function StatsView() {
  const era = useActiveEra();
  const s = useStats(era);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <PageHeader icon={BarChart3} title="Thống Kê" subtitle={`${era.name} · ${era.characters.length} nhân vật · dữ liệu thời gian thực`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon="👤" label="Nhân Vật" value={era.characters.length} sub={`${s.alive} còn sống · ${s.dead} đã chết`} />
        <Tile icon="🛡️" label="Thế Lực" value={s.factions} sub={`${era.worldStructure.length} vùng đất`} />
        <Tile icon="🧬" label="Chủng Tộc" value={era.races.length} sub={`${s.racesAssigned}/${era.characters.length} đã gán`} />
        <Tile icon="⛰️" label="Cảnh Giới" value={s.majors} sub={`${era.powerSystems.length} hệ tu luyện`} />
        <Tile icon="📘" label="Công Pháp" value={era.cultivationArts.length} sub={`${era.skills.length} thần thông`} />
        <Tile icon="⚗️" label="Đan Dược" value={era.pills.length} sub={`${era.treasures.length} pháp bảo`} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Highlight label="Thế lực đông nhất" top={topN(s.byFaction, 1)[0]} />
        <Highlight label="Công pháp phổ biến nhất" top={topN(s.byArt, 1)[0]} />
        <Highlight label="Nhiều quan hệ nhất" top={topN(s.byRels, 1)[0]} />
        <Highlight label="Chủng tộc đông nhất" top={topN(s.byRace, 1)[0]} />
        <Highlight label="Cảnh giới đông người nhất" top={topN(s.byRealm, 1)[0]} />
      </div>

      <h2 className="text-lg font-extrabold">Nhân vật</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Tình trạng">
          <Donut
            data={[
              { label: "Còn sống", value: s.alive },
              { label: "Tử vong", value: s.dead },
              { label: "Ẩn cư", value: s.hidden },
            ]}
            colors={STATUS_COLORS}
          />
        </Panel>
        <Panel title="Phân bổ tu vi — Top 7">
          <Bars data={topN(s.byCultivation)} />
        </Panel>
        <Panel title="Thế lực đông người nhất">
          <Bars data={topN(s.byFaction)} />
        </Panel>
      </div>

      <h2 className="text-lg font-extrabold">Thế giới & Tu luyện</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Phân bổ chủng tộc" footer={`${era.characters.length - s.racesAssigned} nhân vật chưa được gán chủng tộc`}>
          <Bars data={topN(s.byRace)} />
        </Panel>
        <Panel title="Phân bổ cảnh giới" footer={`${era.powerSystems.length} hệ · ${s.majors} đại cảnh giới · ${s.subs} tiểu cảnh giới`}>
          <Bars data={topN(s.byRealm)} />
        </Panel>
      </div>

      <h2 className="text-lg font-extrabold">Chi tiết</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Phân bổ địa điểm">
          <Bars data={topN(s.byLocation)} />
        </Panel>
        <Panel title="Công pháp phổ biến">
          <Bars data={topN(s.byArt)} />
        </Panel>
        <Panel title="Mạng lưới quan hệ" footer={`Tổng ${s.totalRels} quan hệ được ghi nhận`}>
          <div className="grid gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Nhiều quan hệ nhất</p>
              <Bars data={topN(s.byRels, 5)} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Loại phổ biến</p>
              <Bars data={topN(s.relTypes, 4)} />
            </div>
          </div>
        </Panel>
      </div>

      <h2 className="text-lg font-extrabold">Đan dược & Lĩnh vực</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Đan dược theo phẩm cấp">
          <Bars data={topN(s.pillRanks, 9)} />
        </Panel>
        <Panel title="Lĩnh vực theo mức hoàn chỉnh">
          <Donut data={s.domainLevels} colors={DOMAIN_COLORS} />
        </Panel>
      </div>
    </div>
  );
}
