"use client";

import { useState } from "react";
import { Dna, Minimize2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaField, InlineName, TextField } from "@/components/kit/fields";
import { AddButton, BulkBar, BulkToggle, EmptyState, PageHeader, SearchBox, SelectCheckbox, useBulkSelect } from "@/components/kit/page";
import { useNav } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { PALETTE, RACE_GENDERS, RACE_REL_TYPE_OPTIONS } from "@/lib/catalog";
import { genId } from "@/lib/id";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/text";
import { RACE_REL_TYPES, createEntity, type Character, type Race } from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useActiveEra, useWorldStore } from "@/store/world-store";
import { STATUS_META } from "@/features/characters/meta";

const TABS = ["core", "bio", "habitat", "cultivation", "relations", "members"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  core: "Tổng quan",
  bio: "Sinh học",
  habitat: "Sinh cảnh",
  cultivation: "Tu luyện",
  relations: "Quan hệ",
  members: "Nhân vật",
};

function RaceDetail({ race, color, members, onCollapse, onDelete }: { race: Race; color: string; members: Character[]; onCollapse: () => void; onDelete: () => void }) {
  const nav = useNav();
  const updateItem = useWorldStore((s) => s.updateItem);
  const [tab, setTab] = useState<Tab>("core");
  const [renaming, setRenaming] = useState(false);
  const set = (patch: Partial<Race>) => updateItem("races", race.id, patch);
  const setRelations = (relations: Race["relations"]) => set({ relations });

  return (
    <article className="grid gap-4 rounded-2xl border-2 bg-card p-4" style={{ borderColor: `color-mix(in oklch, ${color} 55%, transparent)` }}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl text-2xl" style={{ background: `color-mix(in oklch, ${color} 20%, transparent)` }}>
          {race.emoji || "🧬"}
        </span>
        <div className="min-w-0 flex-1">
          <InlineName value={race.name} onCommit={(name) => set({ name })} editing={renaming} setEditing={setRenaming} className="block text-xl font-extrabold" />
          <p className="text-xs text-muted-foreground">
            {race.alias && `${race.alias} · `}
            {members.length} nhân vật
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCollapse}>
          <Minimize2 /> Thu gọn
        </Button>
        <Button variant="ghost" size="icon-sm" className="hover:text-destructive" aria-label={`Xoá ${race.name}`} onClick={onDelete}>
          <Trash2 />
        </Button>
      </header>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-1.5 text-sm font-semibold",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABEL[t]}
            {t === "members" && ` (${members.length})`}
          </button>
        ))}
      </div>

      {tab === "core" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Tên chủng tộc" value={race.name} onCommit={(name) => set({ name })} />
          <TextField label="Bí danh / Tên khác" value={race.alias} onCommit={(alias) => set({ alias })} />
          <TextField label="Biểu tượng emoji" value={race.emoji} onCommit={(emoji) => set({ emoji })} />
          <AreaField label="Tóm tắt về chủng tộc" value={race.summary} onCommit={(summary) => set({ summary })} className="sm:col-span-3" rows={4} />
        </div>
      )}

      {tab === "bio" && (
        <div className="grid gap-3">
          <AreaField label="Đặc điểm sinh học" value={race.biology} onCommit={(biology) => set({ biology })} rows={4} />
          <div className="grid gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Giới tính</span>
            <div className="flex flex-wrap gap-1.5">
              {RACE_GENDERS.map((g) => {
                const on = race.genders.includes(g.value);
                return (
                  <button
                    key={g.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ genders: on ? race.genders.filter((x) => x !== g.value) : [...race.genders, g.value] })}
                    className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", on ? "border-primary bg-primary/15" : "text-muted-foreground hover:bg-muted")}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "habitat" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <AreaField label="Môi trường sống" value={race.habitat} onCommit={(habitat) => set({ habitat })} rows={4} />
          <TextField label="Tuổi thọ trung bình" value={race.lifespan} onCommit={(lifespan) => set({ lifespan })} />
        </div>
      )}

      {tab === "cultivation" && (
        <div className="grid gap-3 md:grid-cols-3">
          <AreaField label="Khả năng tự nhiên" value={race.naturalAbility} onCommit={(naturalAbility) => set({ naturalAbility })} />
          <AreaField label="Dễ tu luyện loại gì" value={race.easyToLearn} onCommit={(easyToLearn) => set({ easyToLearn })} />
          <AreaField label="Điểm yếu tự nhiên / khắc chế" value={race.weaknesses} onCommit={(weaknesses) => set({ weaknesses })} />
        </div>
      )}

      {tab === "relations" && (
        <div className="grid gap-2">
          {race.relations.map((r) => (
            <div key={r.id} className="grid gap-1.5 rounded-lg border p-2 sm:grid-cols-[1fr_10rem_1.5fr_auto] sm:items-center">
              <input
                defaultValue={r.targetRaceId}
                placeholder="Tên chủng tộc"
                onBlur={(e) => setRelations(race.relations.map((x) => (x.id === r.id ? { ...x, targetRaceId: e.target.value } : x)))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                list={`races-${race.id}`}
                aria-label="Chủng tộc liên quan"
              />
              <select
                value={r.relType}
                onChange={(e) =>
                  setRelations(race.relations.map((x) => (x.id === r.id ? { ...x, relType: e.target.value as (typeof RACE_REL_TYPES)[number] } : x)))
                }
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                aria-label="Loại quan hệ"
              >
                {RACE_REL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.icon} {o.label}
                  </option>
                ))}
              </select>
              <input
                defaultValue={r.note}
                placeholder="Ghi chú"
                onBlur={(e) => setRelations(race.relations.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                aria-label="Ghi chú"
              />
              <Button variant="ghost" size="icon-sm" aria-label="Xoá quan hệ" onClick={() => setRelations(race.relations.filter((x) => x.id !== r.id))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setRelations([...race.relations, { id: genId("rr"), targetRaceId: "", relType: "ally", note: "" }])}
          >
            <Plus /> Thêm quan hệ
          </Button>
        </div>
      )}

      {tab === "members" &&
        (members.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Chưa có nhân vật nào thuộc chủng tộc này. Gán trong hồ sơ nhân vật.</p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {members.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => nav.characterById(c.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{c.name.charAt(0)}</span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  {c.cultivation && <span className="text-xs text-muted-foreground">⚡ {c.cultivation}</span>}
                  <span className={cn("size-2 rounded-full", STATUS_META[c.status].dot)} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </article>
  );
}

export function RacesView() {
  const era = useActiveEra();
  const addItem = useWorldStore((s) => s.addItem);
  const updateItem = useWorldStore((s) => s.updateItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);
  const [q, setQ] = useUrlState("q");
  const [openId, setOpenId] = useUrlState("open");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const bulk = useBulkSelect();

  const membersOf = (id: string) => era.characters.filter((c) => c.raceId === id);
  const assigned = era.characters.filter((c) => c.raceId && era.races.some((r) => r.id === c.raceId)).length;
  const visible = era.races.filter((r) => matches(q, r.name, r.alias, r.summary));
  const colorOf = (r: Race) => PALETTE[era.races.indexOf(r) % PALETTE.length];
  const open = era.races.find((r) => r.id === openId);

  const remove = (r: Race) =>
    askConfirm({
      title: `Xoá chủng tộc “${r.name}”?`,
      description: "Nhân vật thuộc chủng tộc này sẽ được gỡ chủng tộc (không bị xoá).",
      confirmLabel: "Xoá",
      destructive: true,
      onConfirm: () => deleteItems("races", [r.id]),
    });

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <datalist id={open ? `races-${open.id}` : undefined}>
        {era.races.map((r) => (
          <option key={r.id} value={r.name} />
        ))}
      </datalist>
      <PageHeader icon={Dna} title="Chủng Tộc" subtitle={`${era.races.length} chủng tộc · ${assigned} nhân vật đã gán`}>
        <BulkToggle bulk={bulk} />
        <AddButton
          onClick={() => {
            const r = createEntity("races");
            addItem("races", r);
            setOpenId(r.id);
          }}
        >
          Khởi tạo chủng tộc
        </AddButton>
      </PageHeader>
      <SearchBox value={q} onChange={setQ} placeholder="Tìm chủng tộc…" className="flex-none" />
      <BulkBar bulk={bulk} visibleIds={visible.map((r) => r.id)} onDelete={(ids) => deleteItems("races", ids)} />

      {open && <RaceDetail race={open} color={colorOf(open)} members={membersOf(open.id)} onCollapse={() => setOpenId("")} onDelete={() => remove(open)} />}

      {visible.length === 0 ? (
        <EmptyState>{era.races.length === 0 ? "Chưa có chủng tộc nào." : "Không có chủng tộc nào khớp."}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible
            .filter((r) => r.id !== openId)
            .map((r) => {
              const color = colorOf(r);
              return (
                <div
                  key={r.id}
                  onClick={() => setOpenId(r.id)}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  {bulk.active && <SelectCheckbox checked={bulk.selected.has(r.id)} onChange={() => bulk.toggle(r.id)} label={`Chọn ${r.name}`} />}
                  <button
                    type="button"
                    aria-label={`Mở ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(r.id);
                    }}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: `color-mix(in oklch, ${color} 20%, transparent)` }}
                  >
                    {r.emoji || "🧬"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <InlineName
                      value={r.name}
                      onCommit={(name) => updateItem("races", r.id, { name })}
                      editing={renamingId === r.id}
                      setEditing={(v) => setRenamingId(v ? r.id : null)}
                      className="block font-bold"
                    />
                    {r.alias && <p className="truncate text-xs text-muted-foreground">{r.alias}</p>}
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `color-mix(in oklch, ${color} 18%, transparent)` }}>
                    👤 {membersOf(r.id).length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                    aria-label={`Xoá ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(r);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
