"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddButton, BulkBar, BulkToggle, EmptyState, PageHeader, SearchBox, useBulkSelect } from "@/components/kit/page";
import { useLookups } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { matches, viCompare } from "@/lib/text";
import { CHARACTER_STATUSES, createEntity, type Character } from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useWorldStore } from "@/store/world-store";
import { CharacterCard, type CardCounts } from "./character-card";
import { CharacterDetail } from "./character-detail";
import { STATUS_META } from "./meta";

const selectCls = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30";

export function CharactersView() {
  const lookups = useLookups();
  const { era } = lookups;
  const addItem = useWorldStore((s) => s.addItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);

  const [q, setQ] = useUrlState("q");
  const [openId, setOpenId] = useUrlState("open");
  const [locFilter, setLocFilter] = useState("");
  const [facFilter, setFacFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cultFilter, setCultFilter] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const bulk = useBulkSelect();

  const counts = useMemo(() => {
    const map = new Map<string, CardCounts>();
    for (const c of era.characters) map.set(c.id, { arts: 0, treasures: 0, skills: 0, hasDomain: false });
    for (const a of era.cultivationArts) for (const id of a.ownerIds) if (map.has(id)) map.get(id)!.arts++;
    for (const s of era.skills) for (const id of s.ownerIds) if (map.has(id)) map.get(id)!.skills++;
    for (const t of era.treasures) if (map.has(t.ownerId)) map.get(t.ownerId)!.treasures++;
    for (const d of era.domains) if (map.has(d.ownerId)) map.get(d.ownerId)!.hasDomain = true;
    return map;
  }, [era]);

  const cultivations = useMemo(
    () => [...new Set(era.characters.map((c) => c.cultivation.trim()).filter(Boolean))].sort(viCompare),
    [era.characters],
  );

  const factionOptions = (locFilter ? era.worldStructure.filter((l) => l.id === locFilter) : era.worldStructure).flatMap((l) => l.factions);

  const filtered = era.characters.filter(
    (c) =>
      (!locFilter || c.locationId === locFilter) &&
      (!facFilter || c.factionId === facFilter) &&
      (!statusFilter || c.status === statusFilter) &&
      (!cultFilter || c.cultivation.trim() === cultFilter) &&
      matches(q, c.name, c.nickname, c.cultivation, c.context, c.currentIdentity, c.hiddenIdentity),
  );
  const advancedCount = [statusFilter, cultFilter].filter(Boolean).length;
  const anyFilter = !!(q || locFilter || facFilter || statusFilter || cultFilter);

  const create = () => {
    const c = createEntity("characters");
    addItem("characters", c, "start");
    setOpenId(c.id);
  };

  const confirmDelete = (c: Character) =>
    askConfirm({
      title: `Xoá vĩnh viễn hồ sơ “${c.name}”?`,
      description: "Quan hệ, công pháp, pháp bảo… liên kết tới nhân vật này sẽ được gỡ. Có thể hoàn tác bằng Ctrl+Z.",
      confirmLabel: "Xoá",
      destructive: true,
      onConfirm: () => {
        deleteItems("characters", [c.id]);
        if (openId === c.id) setOpenId("");
      },
    });

  const clearFilters = () => {
    setQ("");
    setLocFilter("");
    setFacFilter("");
    setStatusFilter("");
    setCultFilter("");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-4">
      <PageHeader icon={Users} title="Hồ Sơ Nhân Vật" subtitle={`${era.characters.length} nhân vật đã được ghi chép trong “${era.name}”`}>
        <BulkToggle bulk={bulk} />
        <AddButton onClick={create}>Khởi tạo nhân vật</AddButton>
      </PageHeader>

      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, tu vi, thân phận…" />
          <select
            value={locFilter}
            onChange={(e) => {
              setLocFilter(e.target.value);
              setFacFilter("");
            }}
            className={selectCls}
            aria-label="Lọc theo vùng đất"
          >
            <option value="">📍 Toàn thế giới</option>
            {era.worldStructure.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select value={facFilter} onChange={(e) => setFacFilter(e.target.value)} className={selectCls} aria-label="Lọc theo thế lực">
            <option value="">🏯 Toàn thế lực</option>
            {factionOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button variant={advanced ? "secondary" : "outline"} onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced}>
            <SlidersHorizontal /> Bộ lọc nâng cao
            {advancedCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{advancedCount}</span>}
          </Button>
        </div>

        {advanced && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Trạng thái">
              {[{ value: "", label: "Tất cả" }, ...CHARACTER_STATUSES.map((s) => ({ value: s, label: `${STATUS_META[s].symbol} ${STATUS_META[s].label}` }))].map(
                (o) => (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={statusFilter === o.value}
                    onClick={() => setStatusFilter(o.value)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium",
                      statusFilter === o.value ? "border-primary bg-primary/15" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </button>
                ),
              )}
            </div>
            <select value={cultFilter} onChange={(e) => setCultFilter(e.target.value)} className={selectCls} aria-label="Lọc theo tu vi">
              <option value="">⚡ Mọi tu vi</option>
              {cultivations.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Hiển thị {filtered.length} / {era.characters.length} nhân vật
            </span>
            {anyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Xoá tất cả bộ lọc
              </Button>
            )}
          </div>
        )}
      </div>

      <BulkBar bulk={bulk} visibleIds={filtered.map((c) => c.id)} onDelete={(ids) => deleteItems("characters", ids)} />

      {filtered.length === 0 ? (
        <EmptyState>
          {era.characters.length === 0 ? (
            <>
              Chưa có nhân vật nào.{" "}
              <button onClick={create} className="font-semibold text-primary hover:underline">
                Khởi tạo nhân vật đầu tiên
              </button>
            </>
          ) : (
            "Không tìm thấy nhân vật nào."
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((c) =>
            openId === c.id ? (
              <CharacterDetail key={c.id} character={c} onCollapse={() => setOpenId("")} onDelete={() => confirmDelete(c)} />
            ) : (
              <CharacterCard
                key={c.id}
                character={c}
                locationName={lookups.locationName(c.locationId)}
                factionName={lookups.factionName(c.factionId)}
                counts={counts.get(c.id)!}
                onOpen={() => setOpenId(c.id)}
                onDelete={() => confirmDelete(c)}
                bulk={bulk.active ? { checked: bulk.selected.has(c.id), toggle: () => bulk.toggle(c.id) } : undefined}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
