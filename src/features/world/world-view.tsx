"use client";

import { useState } from "react";
import { ChevronDown, Globe2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaField, InlineName } from "@/components/kit/fields";
import { AddButton, BulkBar, BulkToggle, EmptyState, PageHeader, SelectCheckbox, useBulkSelect } from "@/components/kit/page";
import { useNav } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { createEntity, createFaction, type Faction, type Location } from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useActiveEra, useWorldStore } from "@/store/world-store";
import { FactionClassFields, factionIcon, factionLabel } from "./faction-fields";

function FactionMiniCard({ faction, members }: { faction: Faction; members: number }) {
  const nav = useNav();
  const updateFaction = useWorldStore((s) => s.updateFaction);
  const deleteFactions = useWorldStore((s) => s.deleteFactions);
  const [renaming, setRenaming] = useState(false);

  return (
    <div className="group grid gap-2 rounded-lg border bg-background p-3">
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">{factionIcon(faction)}</span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => !renaming && nav.faction(faction.id)} className="block max-w-full text-left font-semibold hover:text-primary">
            <InlineName value={faction.name} onCommit={(name) => updateFaction(faction.id, { name })} editing={renaming} setEditing={setRenaming} />
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {factionLabel(faction)} · {members} thành viên
          </p>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label={`Đổi tên ${faction.name}`} onClick={() => setRenaming(true)}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="hover:text-destructive"
          aria-label={`Xoá ${faction.name}`}
          onClick={() =>
            askConfirm({
              title: `Xoá thế lực “${faction.name}”?`,
              description: "Nhân vật thuộc thế lực này sẽ trở thành tán tu.",
              confirmLabel: "Xoá",
              destructive: true,
              onConfirm: () => deleteFactions([faction.id]),
            })
          }
        >
          <Trash2 />
        </Button>
      </div>
      <FactionClassFields faction={faction} onChange={(patch) => updateFaction(faction.id, patch)} />
    </div>
  );
}

function LocationRow({
  loc,
  expanded,
  onToggle,
  memberCount,
  bulk,
}: {
  loc: Location;
  expanded: boolean;
  onToggle: () => void;
  memberCount: (factionId: string) => number;
  bulk?: { checked: boolean; toggle: () => void };
}) {
  const updateItem = useWorldStore((s) => s.updateItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);
  const addFaction = useWorldStore((s) => s.addFaction);
  const [renaming, setRenaming] = useState(false);

  return (
    <li className={cn("rounded-xl border bg-card", expanded && "border-primary/50")}>
      <div onClick={onToggle} className="group flex cursor-pointer items-center gap-3 px-4 py-3">
        {bulk && <SelectCheckbox checked={bulk.checked} onChange={bulk.toggle} label={`Chọn ${loc.name}`} />}
        <span className="text-xl">🗺️</span>
        <div className="min-w-0 flex-1">
          <InlineName
            value={loc.name}
            onCommit={(name) => updateItem("worldStructure", loc.id, { name })}
            editing={renaming}
            setEditing={setRenaming}
            className="block font-bold"
          />
          <p className="truncate text-xs text-muted-foreground">
            {loc.factions.length} thế lực {loc.summary && `· ${loc.summary}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Đổi tên ${loc.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:text-destructive"
          aria-label={`Xoá ${loc.name}`}
          onClick={(e) => {
            e.stopPropagation();
            askConfirm({
              title: `Xoá vùng đất “${loc.name}”?`,
              description: `Tất cả ${loc.factions.length} thế lực thuộc vùng đất này cũng sẽ bị xoá.`,
              confirmLabel: "Xoá",
              destructive: true,
              onConfirm: () => deleteItems("worldStructure", [loc.id]),
            });
          }}
        >
          <Trash2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Thu gọn" : "Mở"} ${loc.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded && (
        <div className="grid gap-4 border-t p-4">
          <AreaField
            label="Tóm lược địa dư"
            value={loc.summary}
            onCommit={(summary) => updateItem("worldStructure", loc.id, { summary })}
          />
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Thế lực trực thuộc</h3>
              <Button size="sm" variant="outline" onClick={() => addFaction(loc.id, createFaction())}>
                <Plus /> Thêm thế lực
              </Button>
            </div>
            {loc.factions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Chưa có thế lực nào.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {loc.factions.map((f) => (
                  <FactionMiniCard key={f.id} faction={f} members={memberCount(f.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function WorldView() {
  const era = useActiveEra();
  const addItem = useWorldStore((s) => s.addItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);
  const [openId, setOpenId] = useUrlState("open");
  const bulk = useBulkSelect();

  const memberCount = (fid: string) => era.characters.filter((c) => c.factionId === fid).length;

  const create = () => {
    const loc = createEntity("worldStructure");
    addItem("worldStructure", loc);
    setOpenId(loc.id);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader icon={Globe2} title="Cấu Trúc Thế Giới" subtitle={`Thời đại: ${era.name} · ${era.worldStructure.length} vùng đất`}>
        <BulkToggle bulk={bulk} label="Xoá nhiều vùng đất" />
        <AddButton onClick={create}>Thêm vùng đất</AddButton>
      </PageHeader>
      <BulkBar bulk={bulk} visibleIds={era.worldStructure.map((l) => l.id)} onDelete={(ids) => deleteItems("worldStructure", ids)} />
      {era.worldStructure.length === 0 ? (
        <EmptyState>Chưa có vùng đất nào.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {era.worldStructure.map((loc) => (
            <LocationRow
              key={loc.id}
              loc={loc}
              expanded={openId === loc.id}
              onToggle={() => setOpenId(openId === loc.id ? "" : loc.id)}
              memberCount={memberCount}
              bulk={bulk.active ? { checked: bulk.selected.has(loc.id), toggle: () => bulk.toggle(loc.id) } : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
