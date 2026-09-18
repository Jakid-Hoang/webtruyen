"use client";

import { useState } from "react";
import { ChevronRight, MessageSquare, Network, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNav } from "@/hooks/use-lookups";
import { RELATION_CATALOG } from "@/lib/catalog";
import { genId } from "@/lib/id";
import { cn } from "@/lib/utils";
import type { Character, Relationship } from "@/lib/schema/world";
import { useActiveEra, useWorldStore } from "@/store/world-store";

const selectCls = "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30";

function RelationRow({ owner, rel, others }: { owner: Character; rel: Relationship; others: Character[] }) {
  const save = useWorldStore((s) => s.saveRelationship);
  const remove = useWorldStore((s) => s.deleteRelationship);
  const [descOpen, setDescOpen] = useState(!!rel.description);
  const [desc, setDesc] = useState(rel.description);
  const group = RELATION_CATALOG.find((g) => g.key === rel.group)!;

  return (
    <li className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <select
          value={rel.targetId}
          onChange={(e) => save(owner.id, { ...rel, targetId: e.target.value })}
          className={cn(selectCls, "flex-1")}
          aria-label="Nhân vật liên quan"
        >
          <option value="">— Chọn nhân vật —</option>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={rel.type}
          onChange={(e) => save(owner.id, { ...rel, type: e.target.value })}
          className={cn(selectCls, "flex-1")}
          aria-label="Loại quan hệ"
        >
          <option value="">— Loại quan hệ —</option>
          {group.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mô tả chi tiết"
          className={cn(rel.description && "text-primary")}
          onClick={() => setDescOpen((o) => !o)}
        >
          <MessageSquare />
        </Button>
        <Button variant="ghost" size="icon-sm" className="hover:text-destructive" aria-label="Xoá quan hệ" onClick={() => remove(owner.id, rel.id)}>
          <Trash2 />
        </Button>
      </div>
      {descOpen && (
        <textarea
          value={desc}
          rows={2}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => desc !== rel.description && save(owner.id, { ...rel, description: desc })}
          placeholder="Mô tả chi tiết mối quan hệ này…"
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      )}
    </li>
  );
}

export function RelationshipEditor({ character }: { character: Character }) {
  const era = useActiveEra();
  const nav = useNav();
  const save = useWorldStore((s) => s.saveRelationship);
  const [open, setOpen] = useState<Record<string, boolean>>({ family: true, ally: true, enemy: true });
  const others = era.characters.filter((c) => c.id !== character.id);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Quan hệ</h3>
        <Button variant="ghost" size="xs" onClick={() => nav.relations(character.id)}>
          <Network /> Sơ đồ
        </Button>
      </div>
      {RELATION_CATALOG.map((g) => {
        const rels = character.relationships.filter((r) => r.group === g.key);
        const isOpen = open[g.key];
        return (
          <section key={g.key} className={cn("rounded-lg border", g.tone)}>
            <button
              type="button"
              onClick={() => setOpen((s) => ({ ...s, [g.key]: !isOpen }))}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-semibold"
              aria-expanded={isOpen}
            >
              <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
              {g.emoji} {g.label}
              <span className="ml-auto rounded-full bg-background/60 px-1.5 text-xs">{rels.length}</span>
            </button>
            {isOpen && (
              <div className="grid gap-2 border-t border-current/10 bg-background/60 p-2 text-foreground">
                <ul className="grid gap-2">
                  {rels.map((r) => (
                    <RelationRow key={r.id} owner={character} rel={r} others={others} />
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="xs"
                  className="justify-self-start"
                  disabled={others.length === 0}
                  onClick={() => save(character.id, { id: genId("r"), targetId: "", type: "", group: g.key, description: "" })}
                >
                  <Plus /> Thêm
                </Button>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[11px] text-muted-foreground">✓ Quan hệ ngược được tự động đồng bộ 2 chiều.</p>
    </div>
  );
}
