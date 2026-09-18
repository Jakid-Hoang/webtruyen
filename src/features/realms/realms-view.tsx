"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, GitCompare, Mountain, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AreaField, InlineName, Tag, TextField } from "@/components/kit/fields";
import { AddButton, EmptyState, PageHeader, SearchBox } from "@/components/kit/page";
import { useNav } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { PALETTE, realmTone } from "@/lib/catalog";
import { genId } from "@/lib/id";
import { cn } from "@/lib/utils";
import { fold, matches } from "@/lib/text";
import {
  majorRealmSchema,
  subRealmSchema,
  createEntity,
  type Character,
  type MajorRealm,
  type PowerSystem,
  type SubRealm,
} from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useActiveEra, useWorldStore } from "@/store/world-store";

const sortByOrder = <T extends { order: number }>(arr: T[]) => [...arr].sort((a, b) => a.order - b.order);

/** Characters whose cultivation text mentions the realm name. */
function holders(chars: Character[], name: string) {
  const n = fold(name.trim());
  return n ? chars.filter((c) => fold(c.cultivation).includes(n)) : [];
}

type RealmLike = MajorRealm | SubRealm;

function RealmFields<T extends RealmLike>({ realm, update, withTier }: { realm: T; update: (p: Partial<T>) => void; withTier?: boolean }) {
  const u = (p: Partial<RealmLike>) => update(p as Partial<T>);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        {withTier && <TextField label="Đại cảnh giới (tier)" value={(realm as MajorRealm).tier} onCommit={(tier) => update({ tier } as Partial<T>)} />}
        <TextField label="Chỉ số chiến lực" value={realm.powerIndex} onCommit={(powerIndex) => u({ powerIndex })} />
        <TextField label="Tuổi thọ" value={realm.lifespan} onCommit={(lifespan) => u({ lifespan })} />
        <TextField label="Công pháp yêu cầu" value={realm.cultivationReq} onCommit={(cultivationReq) => u({ cultivationReq })} />
        <TextField label="Số đạo lôi kiếp" value={realm.lightningTribs} onCommit={(lightningTribs) => u({ lightningTribs })} />
      </div>
      <div className="grid content-start gap-3">
        <AreaField label="📖 Mô tả cảnh giới" value={realm.description} onCommit={(description) => u({ description })} rows={2} />
        <AreaField label="⚡ Mô tả vượt kiếp" value={realm.lightningDesc} onCommit={(lightningDesc) => u({ lightningDesc })} rows={2} />
      </div>
      <AreaField label="⚔ Đặc tính chiến đấu" value={realm.combatTraits} onCommit={(combatTraits) => u({ combatTraits })} rows={2} />
      <AreaField label="Điều kiện đột phá" value={realm.breakthroughReq} onCommit={(breakthroughReq) => u({ breakthroughReq })} rows={2} />
      <AreaField label="Khả năng đặc thù" value={realm.abilities} onCommit={(abilities) => u({ abilities })} rows={2} />
      <AreaField label="📝 Ghi chú" value={realm.notes} onCommit={(notes) => u({ notes })} rows={2} />
    </div>
  );
}

function SubRealmCard({ sub, chars, update, remove }: { sub: SubRealm; chars: Character[]; update: (p: Partial<SubRealm>) => void; remove: () => void }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const count = holders(chars, sub.name).length;
  return (
    <li className="rounded-lg border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Mở tiểu cảnh giới">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <InlineName value={sub.name} onCommit={(name) => update({ name })} editing={renaming} setEditing={setRenaming} className="min-w-0 flex-1 text-sm font-semibold" />
        {sub.powerIndex && <Tag>⚡ {sub.powerIndex}</Tag>}
        <span className="text-xs text-muted-foreground">👤 {count}</span>
        <Button variant="ghost" size="icon-xs" aria-label={`Đổi tên ${sub.name}`} onClick={() => setRenaming(true)}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-xs" className="hover:text-destructive" aria-label={`Xoá ${sub.name}`} onClick={remove}>
          <Trash2 />
        </Button>
      </div>
      {open && (
        <div className="border-t p-3">
          <RealmFields realm={sub} update={update} />
        </div>
      )}
    </li>
  );
}

function MajorRealmCard({
  realm,
  index,
  total,
  chars,
  expanded,
  onToggle,
  update,
  move,
  remove,
  compare,
}: {
  realm: MajorRealm;
  index: number;
  total: number;
  chars: Character[];
  expanded: boolean;
  onToggle: () => void;
  update: (fn: (m: MajorRealm) => MajorRealm) => void;
  move: (dir: -1 | 1) => void;
  remove: () => void;
  compare?: { selected: boolean; toggle: () => void };
}) {
  const nav = useNav();
  const [renaming, setRenaming] = useState(false);
  const tone = realmTone(realm.tier, realm.name);
  const direct = holders(chars, realm.name);
  const subCount = realm.subRealms.reduce((n, s) => n + holders(chars, s.name).length, 0);
  const patch = (p: Partial<MajorRealm>) => update((m) => ({ ...m, ...p }));
  const patchSub = (id: string, p: Partial<SubRealm>) =>
    update((m) => ({ ...m, subRealms: m.subRealms.map((s) => (s.id === id ? { ...s, ...p } : s)) }));

  return (
    <li className={cn("relative overflow-hidden rounded-xl border bg-card", expanded && "border-primary/50")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone?.bar ?? "var(--color-primary)" }} />
      <div className="flex items-center gap-2 py-2.5 pr-2 pl-4">
        {compare && (
          <button
            type="button"
            onClick={compare.toggle}
            aria-pressed={compare.selected}
            aria-label={`Chọn ${realm.name} để so sánh`}
            className={cn("size-5 shrink-0 rounded-full border-2", compare.selected ? "border-primary bg-primary" : "border-muted-foreground/40")}
          />
        )}
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
          <div className="flex flex-wrap items-center gap-2">
            {realm.tier && <Tag className={tone?.tone}>{realm.tier}</Tag>}
            <InlineName value={realm.name} onCommit={(name) => patch({ name })} editing={renaming} setEditing={setRenaming} className="font-bold" />
            {realm.powerIndex && <span className="text-xs text-muted-foreground">⚡ {realm.powerIndex}</span>}
            <span className="text-xs text-muted-foreground">👤 {direct.length + subCount}</span>
          </div>
          {!expanded && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {realm.description || "Chưa có mô tả"} · {realm.subRealms.length} tiểu cảnh giới
            </p>
          )}
        </button>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon-xs" disabled={index === 0} aria-label="Lên" onClick={() => move(-1)}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-xs" disabled={index === total - 1} aria-label="Xuống" onClick={() => move(1)}>
            <ArrowDown />
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label={`Đổi tên ${realm.name}`} onClick={() => setRenaming(true)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-xs" className="hover:text-destructive" aria-label={`Xoá ${realm.name}`} onClick={remove}>
            <Trash2 />
          </Button>
          <ChevronDown className={cn("ml-1 size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </div>

      {expanded && (
        <div className="grid gap-4 border-t p-4 pl-5">
          <RealmFields realm={realm} update={patch} withTier />
          {direct.length > 0 && (
            <div className="grid gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Nhân vật đang ở cảnh giới này</span>
              <div className="flex flex-wrap gap-1.5">
                {direct.map((c) => (
                  <button key={c.id} type="button" onClick={() => nav.characterById(c.id)} className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium hover:border-primary">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold">Tiểu cảnh giới ({realm.subRealms.length})</h4>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  update((m) => ({
                    ...m,
                    subRealms: [...m.subRealms, subRealmSchema.parse({ id: genId("sr"), order: m.subRealms.length })],
                  }))
                }
              >
                <Plus /> Thêm tiểu CG
              </Button>
            </div>
            <ul className="grid gap-1.5">
              {sortByOrder(realm.subRealms).map((s) => (
                <SubRealmCard
                  key={s.id}
                  sub={s}
                  chars={chars}
                  update={(p) => patchSub(s.id, p)}
                  remove={() => update((m) => ({ ...m, subRealms: m.subRealms.filter((x) => x.id !== s.id) }))}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

function PowerSystemPanel({
  ps,
  color,
  chars,
  q,
  openRealm,
  setOpenRealm,
  compareSel,
  toggleCompare,
  comparing,
}: {
  ps: PowerSystem;
  color: string;
  chars: Character[];
  q: string;
  openRealm: string;
  setOpenRealm: (id: string) => void;
  compareSel: string[];
  toggleCompare: (id: string) => void;
  comparing: boolean;
}) {
  const updateItem = useWorldStore((s) => s.updateItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const update = (fn: (p: PowerSystem) => PowerSystem) => updateItem("powerSystems", ps.id, fn);
  const sorted = sortByOrder(ps.majorRealms);
  const visible = sorted.filter((m) => matches(q, m.name, m.tier));

  const updateRealm = (id: string, fn: (m: MajorRealm) => MajorRealm) =>
    update((p) => ({ ...p, majorRealms: p.majorRealms.map((m) => (m.id === id ? fn(m) : m)) }));

  const move = (id: string, dir: -1 | 1) =>
    update((p) => {
      const arr = sortByOrder(p.majorRealms);
      const i = arr.findIndex((m) => m.id === id);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, majorRealms: arr.map((m, order) => ({ ...m, order })) };
    });

  return (
    <section className="overflow-hidden rounded-2xl border" style={{ borderColor: `color-mix(in oklch, ${color} 40%, transparent)` }}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}>
        <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} aria-label="Thu gọn/mở rộng">
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
        <span className="size-3 rounded-full" style={{ background: color }} />
        <InlineName value={ps.name} onCommit={(name) => update((p) => ({ ...p, name }))} editing={renaming} setEditing={setRenaming} className="text-lg font-extrabold" />
        <span className="text-xs text-muted-foreground">{ps.majorRealms.length} đại CG</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Đổi tên ${ps.name}`} onClick={() => setRenaming(true)}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hover:text-destructive"
            aria-label={`Xoá ${ps.name}`}
            onClick={() =>
              askConfirm({
                title: `Xoá “${ps.name}” và toàn bộ cảnh giới bên trong?`,
                confirmLabel: "Xoá",
                destructive: true,
                onConfirm: () => deleteItems("powerSystems", [ps.id]),
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="grid gap-3 p-4">
          <TextField
            value={ps.description}
            onCommit={(description) => update((p) => ({ ...p, description }))}
            placeholder="Mô tả ngắn về phương thức tu hành này (VD: Tu tiên, Tu ma, Võ đạo…)"
          />
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">{ps.majorRealms.length ? "Không có cảnh giới khớp tìm kiếm." : "Chưa có đại cảnh giới nào."}</p>
          ) : (
            <ul className="grid gap-2">
              {visible.map((m) => (
                <MajorRealmCard
                  key={m.id}
                  realm={m}
                  index={sorted.indexOf(m)}
                  total={sorted.length}
                  chars={chars}
                  expanded={openRealm === m.id}
                  onToggle={() => setOpenRealm(openRealm === m.id ? "" : m.id)}
                  update={(fn) => updateRealm(m.id, fn)}
                  move={(dir) => move(m.id, dir)}
                  remove={() =>
                    askConfirm({
                      title: `Xoá đại cảnh giới “${m.name}”?`,
                      description: "Toàn bộ tiểu cảnh giới bên trong cũng bị xoá.",
                      confirmLabel: "Xoá",
                      destructive: true,
                      onConfirm: () => update((p) => ({ ...p, majorRealms: p.majorRealms.filter((x) => x.id !== m.id) })),
                    })
                  }
                  compare={comparing ? { selected: compareSel.includes(m.id), toggle: () => toggleCompare(m.id) } : undefined}
                />
              ))}
            </ul>
          )}
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              const m = majorRealmSchema.parse({ id: genId("mr"), order: ps.majorRealms.length });
              update((p) => ({ ...p, majorRealms: [...p.majorRealms, m] }));
              setOpenRealm(m.id);
            }}
          >
            <Plus /> Thêm đại cảnh giới
          </Button>
        </div>
      )}
    </section>
  );
}

const COMPARE_ROWS: { key: keyof MajorRealm; label: string }[] = [
  { key: "tier", label: "Tier" },
  { key: "powerIndex", label: "Chỉ số chiến lực" },
  { key: "lifespan", label: "Tuổi thọ" },
  { key: "cultivationReq", label: "Công pháp yêu cầu" },
  { key: "lightningTribs", label: "Số đạo lôi kiếp" },
  { key: "lightningDesc", label: "Mô tả vượt kiếp" },
  { key: "breakthroughReq", label: "Điều kiện đột phá" },
  { key: "combatTraits", label: "Đặc tính chiến đấu" },
  { key: "abilities", label: "Khả năng đặc thù" },
];

export function RealmsView() {
  const era = useActiveEra();
  const addItem = useWorldStore((s) => s.addItem);
  const [q, setQ] = useUrlState("q");
  const [openRealm, setOpenRealm] = useUrlState("open");
  const [comparing, setComparing] = useState(false);
  const [compareSel, setCompareSel] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const majors = era.powerSystems.flatMap((p) => p.majorRealms);
  const subCount = majors.reduce((n, m) => n + m.subRealms.length, 0);
  const selected = compareSel.map((id) => majors.find((m) => m.id === id)).filter(Boolean) as MajorRealm[];

  const toggleCompare = (id: string) =>
    setCompareSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader
        icon={Mountain}
        title="Hệ Thống Cảnh Giới"
        subtitle={`${era.powerSystems.length} phương thức · ${majors.length} đại CG · ${subCount} tiểu CG`}
      >
        <Button
          variant={comparing ? "secondary" : "outline"}
          onClick={() => {
            setComparing((c) => !c);
            setCompareSel([]);
          }}
        >
          <GitCompare /> So sánh
        </Button>
        <AddButton onClick={() => addItem("powerSystems", createEntity("powerSystems"))}>Thêm phương thức</AddButton>
      </PageHeader>

      <SearchBox value={q} onChange={setQ} placeholder="Tìm cảnh giới…" className="flex-none" />
      <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        💡 Chỉ số chiến lực, đặc tính chiến đấu và điều kiện đột phá được dùng khi so kèo nhân vật bằng AI. Tu vi của nhân vật khớp theo tên cảnh giới.
      </p>

      {comparing && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 p-2 text-sm">
          <span className="text-muted-foreground">Chọn 2 đại cảnh giới để so sánh ({selected.length}/2):</span>
          {selected.map((m) => (
            <Tag key={m.id}>{m.name}</Tag>
          ))}
          <Button size="sm" className="ml-auto" disabled={selected.length !== 2} onClick={() => setCompareOpen(true)}>
            Xem so sánh
          </Button>
        </div>
      )}

      {era.powerSystems.length === 0 ? (
        <EmptyState>Chưa có phương thức tu hành nào. Nhấn “Thêm phương thức” để bắt đầu.</EmptyState>
      ) : (
        era.powerSystems.map((ps, i) => (
          <PowerSystemPanel
            key={ps.id}
            ps={ps}
            color={PALETTE[i % PALETTE.length]}
            chars={era.characters}
            q={q}
            openRealm={openRealm}
            setOpenRealm={setOpenRealm}
            compareSel={compareSel}
            toggleCompare={toggleCompare}
            comparing={comparing}
          />
        ))
      )}

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>So sánh cảnh giới</DialogTitle>
          </DialogHeader>
          {selected.length === 2 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="w-40 py-2" />
                  {selected.map((m) => (
                    <th key={m.id} className="py-2 font-bold">
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.key} className="border-t align-top">
                    <td className="py-2 pr-3 text-xs font-semibold text-muted-foreground">{r.label}</td>
                    {selected.map((m) => (
                      <td key={m.id} className="py-2 pr-3 whitespace-pre-wrap">
                        {String(m[r.key] ?? "") || <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
