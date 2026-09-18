"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildNav } from "@/lib/nav";
import { askConfirm } from "@/store/confirm-store";
import { useCodex } from "@/store/codex-store";

function EraItem({ id, name, active, startEditing }: { id: string; name: string; active: boolean; startEditing?: boolean }) {
  const setEra = useCodex((s) => s.setEra);
  const renameEra = useCodex((s) => s.renameEra);
  const deleteEra = useCodex((s) => s.deleteEra);
  const canDelete = useCodex((s) => s.data.eras.length > 1);
  const [editing, setEditing] = useState(!!startEditing);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) renameEra(id, trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        className="flex items-center gap-1 px-2 py-1"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <input
          autoFocus
          value={draft}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          aria-label="Tên thời đại"
          className="h-7 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
        <button type="submit" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Lưu">
          <Check className="size-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors",
        active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <button onClick={() => setEra(id)} className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left font-medium">
        {name}
      </button>
      <button
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
        aria-label={`Đổi tên ${name}`}
      >
        <Pencil className="size-3.5" />
      </button>
      {canDelete && (
        <button
          onClick={() =>
            askConfirm({
              title: `Xoá thời đại “${name}”?`,
              description: "Các mục thuộc thời đại này sẽ thành “xuyên suốt” (không bị xoá). Có thể hoàn tác bằng Ctrl+Z.",
              confirmLabel: "Xoá",
              destructive: true,
              onConfirm: () => deleteEra(id),
            })
          }
          className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
          aria-label={`Xoá ${name}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function SidebarNav({ activeView, onNavigate }: { activeView: string | null; onNavigate?: () => void }) {
  const data = useCodex((s) => s.data);
  const addEra = useCodex((s) => s.addEra);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const groups = useMemo(() => buildNav(data), [data]);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-3">
      <section>
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Thời đại</h2>
          <button
            onClick={() => setJustAdded(addEra("Thời đại mới"))}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Thêm thời đại"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="grid gap-0.5">
          {data.eras.map((era) => (
            <EraItem key={era.id} id={era.id} name={era.name} active={era.id === data.eraId} startEditing={era.id === justAdded} />
          ))}
        </div>
      </section>

      <nav className="grid gap-4" aria-label="Danh mục">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <h2 className="mb-1 px-2.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{group}</h2>
            <ul className="grid gap-0.5">
              {items.map((it) => (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={activeView === it.key ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                      activeView === it.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="w-4 text-center" aria-hidden>
                      {it.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {!!it.count && <span className="text-[11px] opacity-60">{it.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  );
}
