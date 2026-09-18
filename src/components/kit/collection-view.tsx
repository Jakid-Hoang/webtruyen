"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLookups, type Lookups } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import type { Option } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { matches, viCompare } from "@/lib/text";
import { createEntity, type EraCollectionKey, type EraItem } from "@/lib/schema/world";
import { askConfirm } from "@/store/confirm-store";
import { useWorldStore } from "@/store/world-store";
import { InlineName } from "./fields";
import { AddButton, BulkBar, BulkToggle, EmptyState, PageHeader, SearchBox, SelectCheckbox, useBulkSelect } from "./page";

type Named = { id: string; name: string };

export interface EditorProps<T> {
  item: T;
  update: (patch: Partial<T>) => void;
  lookups: Lookups;
}

export interface CollectionConfig<K extends EraCollectionKey> {
  collection: K;
  icon: LucideIcon;
  title: string;
  /** Singular noun, e.g. "công pháp". */
  noun: string;
  emoji: string | ((item: EraItem<K>) => string);
  addLabel: string;
  searchPlaceholder?: string;
  /** Extra fields matched by search (name is always included). */
  searchFields?: (item: EraItem<K>) => (string | undefined)[];
  filter?: { label: string; options: Option[]; test: (item: EraItem<K>, value: string) => boolean };
  sorts?: { key: string; label: string; value: (item: EraItem<K>) => string | number }[];
  /** Badges / meta shown on the collapsed row. */
  summary: (item: EraItem<K>, lookups: Lookups) => React.ReactNode;
  Editor: React.ComponentType<EditorProps<EraItem<K>>>;
  /** Enter rename mode right after creating. */
  renameOnCreate?: boolean;
}

/** List page with search, filter, sort, bulk delete and accordion rows. */
export function CollectionView<K extends EraCollectionKey>({
  config,
  headless = false,
}: {
  config: CollectionConfig<K>;
  /** Render without the page header (used inside tabbed pages). */
  headless?: boolean;
}) {
  const { collection, noun } = config;
  const lookups = useLookups();
  const items = lookups.era[collection] as unknown as (EraItem<K> & Named)[];
  const addItem = useWorldStore((s) => s.addItem);
  const updateItem = useWorldStore((s) => s.updateItem);
  const deleteItems = useWorldStore((s) => s.deleteItems);

  const [q, setQ] = useUrlState("q");
  const [openId, setOpenId] = useUrlState("open");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const bulk = useBulkSelect();

  const visible = useMemo(() => {
    let out = items.filter((it) => matches(q, it.name, ...(config.searchFields?.(it) ?? [])));
    if (filter && config.filter) out = out.filter((it) => config.filter!.test(it, filter));
    if (sort) {
      const s = config.sorts?.find((x) => x.key === sort.key);
      if (s)
        out = [...out].sort((a, b) => {
          const va = s.value(a);
          const vb = s.value(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : viCompare(String(va), String(vb));
          return cmp * sort.dir;
        });
    }
    return out;
  }, [items, q, filter, sort, config]);

  const create = () => {
    const item = createEntity(collection) as EraItem<K> & Named;
    addItem(collection, item);
    setOpenId(item.id);
    if (config.renameOnCreate) setRenamingId(item.id);
  };

  const remove = (it: Named) =>
    askConfirm({
      title: `Xoá vĩnh viễn ${noun} “${it.name}”?`,
      description: "Các liên kết tới mục này sẽ được gỡ. Có thể hoàn tác bằng Ctrl+Z.",
      confirmLabel: "Xoá",
      destructive: true,
      onConfirm: () => deleteItems(collection, [it.id]),
    });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={q} onChange={setQ} placeholder={config.searchPlaceholder ?? `Tìm ${noun}…`} />
      {config.filter && (
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={config.filter.label}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="">{config.filter.label}: Tất cả</option>
          {config.filter.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.icon ? `${o.icon} ` : ""}
              {o.label}
            </option>
          ))}
        </select>
      )}
      {config.sorts && (
        <div className="flex items-center gap-1" role="group" aria-label="Sắp xếp">
          <span className="text-xs text-muted-foreground">Sắp xếp:</span>
          {config.sorts.map((s) => {
            const active = sort?.key === s.key;
            return (
              <Button
                key={s.key}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                onClick={() => setSort(active ? (sort!.dir === 1 ? { key: s.key, dir: -1 } : null) : { key: s.key, dir: 1 })}
              >
                {s.label}
                {active && (sort!.dir === 1 ? <ArrowUp /> : <ArrowDown />)}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("grid gap-4", !headless && "mx-auto max-w-5xl")}>
      {headless ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {items.length} {noun}
          </p>
          <div className="flex gap-2">
            <BulkToggle bulk={bulk} />
            <AddButton onClick={create}>{config.addLabel}</AddButton>
          </div>
        </div>
      ) : (
        <PageHeader icon={config.icon} title={config.title} subtitle={`${items.length} ${noun} đã được ghi chép`}>
          <BulkToggle bulk={bulk} />
          <AddButton onClick={create}>{config.addLabel}</AddButton>
        </PageHeader>
      )}

      {toolbar}
      <BulkBar bulk={bulk} visibleIds={visible.map((v) => v.id)} onDelete={(ids) => deleteItems(collection, ids)} />

      {visible.length === 0 ? (
        <EmptyState>{items.length === 0 ? `Chưa có ${noun} nào được ghi chép.` : `Không có ${noun} nào khớp bộ lọc.`}</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {visible.map((it) => (
            <CollectionRow
              key={it.id}
              item={it}
              config={config}
              lookups={lookups}
              expanded={openId === it.id}
              onToggle={() => setOpenId(openId === it.id ? "" : it.id)}
              renaming={renamingId === it.id}
              setRenaming={(v) => setRenamingId(v ? it.id : null)}
              update={(patch) => updateItem(collection, it.id, patch as Partial<EraItem<K>>)}
              onDelete={() => remove(it)}
              bulk={bulk.active ? { checked: bulk.selected.has(it.id), toggle: () => bulk.toggle(it.id) } : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionRow<K extends EraCollectionKey>({
  item,
  config,
  lookups,
  expanded,
  onToggle,
  renaming,
  setRenaming,
  update,
  onDelete,
  bulk,
}: {
  item: EraItem<K> & Named;
  config: CollectionConfig<K>;
  lookups: Lookups;
  expanded: boolean;
  onToggle: () => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  update: (patch: Partial<EraItem<K>>) => void;
  onDelete: () => void;
  bulk?: { checked: boolean; toggle: () => void };
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { Editor } = config;
  const emoji = typeof config.emoji === "function" ? config.emoji(item) : config.emoji;

  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [expanded]);

  return (
    <li ref={ref} className={cn("rounded-xl border bg-card transition-colors", expanded ? "border-primary/50" : "hover:border-primary/30")}>
      {/* Row click is a mouse convenience; the chevron button is the accessible toggle. */}
      <div onClick={onToggle} className="group flex cursor-pointer items-center gap-3 px-3 py-2.5">
        {bulk && <SelectCheckbox checked={bulk.checked} onChange={bulk.toggle} label={`Chọn ${item.name}`} />}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">{emoji}</span>
        <div className="min-w-0 flex-1">
          <InlineName
            value={item.name}
            onCommit={(name) => update({ name } as unknown as Partial<EraItem<K>>)}
            editing={renaming}
            setEditing={setRenaming}
            className="block font-semibold"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{config.summary(item, lookups)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Đổi tên ${item.name}`}
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
            aria-label={`Xoá ${item.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Thu gọn" : "Mở"} ${item.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>
      {expanded && (
        <div className="border-t p-4">
          <Editor item={item} update={update} lookups={lookups} />
        </div>
      )}
    </li>
  );
}
