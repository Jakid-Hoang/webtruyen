"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaField, InlineName, Tag } from "@/components/kit/fields";
import { BulkBar, BulkToggle, EmptyState, PageHeader, SearchBox, SelectCheckbox, useBulkSelect } from "@/components/kit/page";
import { useNav } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { FACTION_CATEGORIES, getFactionCategory } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/text";
import type { Character, Faction } from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useActiveEra, useWorldStore } from "@/store/world-store";
import { FactionClassFields, factionIcon, factionLabel } from "./faction-fields";

const NONE = "__none__";

type FlatFaction = Faction & { locId: string; locName: string };

function groupKeys(f: Faction) {
  const cat = getFactionCategory(f.factionCategory);
  const catKey = cat ? cat.value : NONE;
  const rankKey = cat?.ranks.some((r) => r.value === f.factionRank) ? f.factionRank : NONE;
  return { catKey, rankKey };
}

function Collapsible({
  open,
  onToggle,
  header,
  children,
  level = 1,
}: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  level?: 1 | 2;
}) {
  return (
    <section className={cn(level === 1 ? "rounded-xl border bg-card" : "rounded-lg border bg-background")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn("flex w-full items-center gap-2 text-left", level === 1 ? "px-4 py-3" : "px-3 py-2")}
      >
        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        {header}
      </button>
      {open && <div className={cn(level === 1 ? "grid gap-2 border-t p-3" : "border-t p-3")}>{children}</div>}
    </section>
  );
}

function FactionCard({
  f,
  members,
  expanded,
  onToggle,
  bulk,
}: {
  f: FlatFaction;
  members: Character[];
  expanded: boolean;
  onToggle: () => void;
  bulk?: { checked: boolean; toggle: () => void };
}) {
  const nav = useNav();
  const updateFaction = useWorldStore((s) => s.updateFaction);
  const deleteFactions = useWorldStore((s) => s.deleteFactions);
  const [renaming, setRenaming] = useState(false);
  const remove = () =>
    askConfirm({
      title: `Xoá thế lực “${f.name}”?`,
      description: "Nhân vật thuộc thế lực này sẽ trở thành tán tu.",
      confirmLabel: "Xoá",
      destructive: true,
      onConfirm: () => deleteFactions([f.id]),
    });

  if (!expanded) {
    return (
      <div
        onClick={onToggle}
        className="group grid cursor-pointer content-start gap-1 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
      >
        <div className="flex items-center gap-2">
          {bulk && <SelectCheckbox checked={bulk.checked} onChange={bulk.toggle} label={`Chọn ${f.name}`} />}
          <span>{factionIcon(f)}</span>
          <button
            type="button"
            aria-expanded={false}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="min-w-0 flex-1 truncate text-left font-semibold hover:text-primary"
          >
            {f.name}
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            aria-label={`Xoá ${f.name}`}
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
          >
            <Trash2 />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          📍 {f.locName} · {members.length} thành viên
        </p>
        {f.description && <p className="line-clamp-2 text-xs text-muted-foreground">{f.description}</p>}
      </div>
    );
  }

  return (
    <div className="col-span-full grid gap-4 rounded-xl border border-primary/50 bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl">{factionIcon(f)}</span>
        <div className="min-w-0 flex-1">
          <InlineName
            value={f.name}
            onCommit={(name) => updateFaction(f.id, { name })}
            editing={renaming}
            setEditing={setRenaming}
            className="block text-lg font-bold"
          />
          <p className="text-xs text-muted-foreground">
            <button type="button" className="hover:text-primary hover:underline" onClick={() => nav.location(f.locId)}>
              📍 {f.locName}
            </button>{" "}
            · {members.length} thành viên
          </p>
        </div>
        <Tag className="border-primary/30 bg-primary/10 text-primary">{factionLabel(f)}</Tag>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          Thu gọn
        </Button>
        <Button variant="ghost" size="icon-sm" className="hover:text-destructive" aria-label={`Xoá ${f.name}`} onClick={remove}>
          <Trash2 />
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <h3 className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">Phân loại & Đẳng cấp</h3>
            <FactionClassFields faction={f} onChange={(patch) => updateFaction(f.id, patch)} />
          </div>
          <AreaField label="Sơ lược tôn chỉ" value={f.description} onCommit={(description) => updateFaction(f.id, { description })} rows={4} />
        </div>
        <div className="grid content-start gap-2">
          <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Thành viên ({members.length})</h3>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Chưa ghi nhận</p>
          ) : (
            <ul className="grid gap-1">
              {members.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => nav.characterById(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {c.name.charAt(0)}
                    </span>
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    {c.cultivation && <span className="text-xs text-muted-foreground">⚡ {c.cultivation}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function FactionsView() {
  const era = useActiveEra();
  const deleteFactions = useWorldStore((s) => s.deleteFactions);
  const [q, setQ] = useUrlState("q");
  const [openId, setOpenId] = useUrlState("open");
  const [locFilter, setLocFilter] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [openRanks, setOpenRanks] = useState<Record<string, boolean>>({});
  const bulk = useBulkSelect();

  const all: FlatFaction[] = useMemo(
    () => era.worldStructure.flatMap((l) => l.factions.map((f) => ({ ...f, locId: l.id, locName: l.name }))),
    [era.worldStructure],
  );
  const visible = all.filter((f) => (!locFilter || f.locId === locFilter) && matches(q, f.name, f.description));

  const membersOf = (fid: string) => era.characters.filter((c) => c.factionId === fid);

  // Deep link: when the opened faction changes, open the groups containing it.
  const [revealedFor, setRevealedFor] = useState("");
  if (openId !== revealedFor) {
    setRevealedFor(openId);
    const f = all.find((x) => x.id === openId);
    if (f) {
      const { catKey, rankKey } = groupKeys(f);
      setOpenCats((s) => ({ ...s, [catKey]: true }));
      setOpenRanks((s) => ({ ...s, [`${catKey}__${rankKey}`]: true }));
    }
  }

  // While searching, show everything expanded.
  const searching = q.trim().length > 0;

  const categories = [...FACTION_CATEGORIES, { value: NONE, label: "Chưa phân loại", icon: "❓", ranks: [] }];

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <PageHeader icon={Shield} title="Thế Lực & Tổ Chức" subtitle={`${all.length} tổ chức được ghi chép`}>
        <BulkToggle bulk={bulk} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm tổ chức…" />
        <select
          value={locFilter}
          onChange={(e) => setLocFilter(e.target.value)}
          aria-label="Lọc theo vùng đất"
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="">📍 Mọi vùng đất</option>
          {era.worldStructure.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-muted-foreground">
          Hiển thị {visible.length} / {all.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Thêm thế lực mới trong mục Thế Giới (mỗi thế lực thuộc một vùng đất).</p>

      <BulkBar bulk={bulk} visibleIds={visible.map((f) => f.id)} onDelete={deleteFactions} />

      {visible.length === 0 ? (
        <EmptyState>{all.length === 0 ? "Chưa có thế lực nào." : "Không có thế lực nào khớp bộ lọc."}</EmptyState>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => {
            const inCat = visible.filter((f) => groupKeys(f).catKey === cat.value);
            if (inCat.length === 0) return null;
            const rankGroups = [...cat.ranks, { value: NONE, label: "Không xác định", icon: "·" }]
              .map((r) => ({ rank: r, items: inCat.filter((f) => groupKeys(f).rankKey === r.value) }))
              .filter((g) => g.items.length > 0);
            const catOpen = searching || !!openCats[cat.value];

            return (
              <Collapsible
                key={cat.value}
                open={catOpen}
                onToggle={() => setOpenCats((s) => ({ ...s, [cat.value]: !catOpen }))}
                header={
                  <span className="flex flex-1 items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-bold">{cat.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {inCat.length} thế lực{cat.ranks.length > 0 && ` · ${cat.ranks.length} đẳng cấp`}
                    </span>
                  </span>
                }
              >
                {rankGroups.map(({ rank, items }) => {
                  const key = `${cat.value}__${rank.value}`;
                  const grid = (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((f) => (
                        <FactionCard
                          key={f.id}
                          f={f}
                          members={membersOf(f.id)}
                          expanded={openId === f.id}
                          onToggle={() => setOpenId(openId === f.id ? "" : f.id)}
                          bulk={bulk.active ? { checked: bulk.selected.has(f.id), toggle: () => bulk.toggle(f.id) } : undefined}
                        />
                      ))}
                    </div>
                  );
                  if (cat.ranks.length === 0) return <div key={key}>{grid}</div>;
                  const rankOpen = searching || !!openRanks[key];
                  return (
                    <Collapsible
                      key={key}
                      level={2}
                      open={rankOpen}
                      onToggle={() => setOpenRanks((s) => ({ ...s, [key]: !rankOpen }))}
                      header={
                        <span className="flex flex-1 items-center gap-2 text-sm">
                          <span>{rank.icon}</span>
                          <span className="font-semibold">{rank.label}</span>
                          <span className="text-xs text-muted-foreground">{items.length} thế lực</span>
                        </span>
                      }
                    >
                      {grid}
                    </Collapsible>
                  );
                })}
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
