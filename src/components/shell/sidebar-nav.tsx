"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/nav";
import { askConfirm } from "@/store/confirm-store";
import { useWorldStore } from "@/store/world-store";

function EraItem({ id, name, active }: { id: string; name: string; active: boolean }) {
  const setActiveEra = useWorldStore((s) => s.setActiveEra);
  const renameEra = useWorldStore((s) => s.renameEra);
  const deleteEra = useWorldStore((s) => s.deleteEra);
  const canDelete = useWorldStore((s) => s.data.eras.length > 1);
  const [editing, setEditing] = useState(false);
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
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
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
      <button onClick={() => setActiveEra(id)} className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left font-medium">
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
              title: `Xoá Era “${name}”?`,
              description: "Toàn bộ dữ liệu trong Era này sẽ bị xoá. Bạn có thể hoàn tác bằng Ctrl+Z.",
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

export function SidebarNav({
  activeView,
  onNewEra,
  onNavigate,
}: {
  activeView: string | null;
  onNewEra: () => void;
  onNavigate?: () => void;
}) {
  const eras = useWorldStore((s) => s.data.eras);
  const activeEraId = useWorldStore((s) => s.activeEraId);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <section>
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Era</h2>
          <button
            onClick={onNewEra}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tạo Era mới"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="grid gap-0.5">
          {eras.map((era) => (
            <EraItem key={era.id} id={era.id} name={era.name} active={era.id === activeEraId} />
          ))}
        </div>
      </section>

      <nav>
        <h2 className="mb-1.5 px-2.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Danh mục</h2>
        <ul className="grid gap-0.5">
          {NAV_LINKS.map(({ key, href, label, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={activeView === key ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  activeView === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
