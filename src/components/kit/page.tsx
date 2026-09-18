"use client";

import { useState } from "react";
import { CheckSquare, Plus, Search, Square, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Icon className="size-6 shrink-0 text-primary" /> {title}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button onClick={onClick}>
      <Plus /> {children}
    </Button>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-48 flex-1", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 w-full rounded-lg border border-input bg-transparent pr-2.5 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">{children}</div>;
}

/* ── Bulk selection ── */

export interface BulkSelect {
  active: boolean;
  selected: Set<string>;
  start: () => void;
  exit: () => void;
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
}

export function useBulkSelect(): BulkSelect {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return {
    active,
    selected,
    start: () => setActive(true),
    exit: () => {
      setActive(false);
      setSelected(new Set());
    },
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (ids) => setSelected(new Set(ids)),
    clear: () => setSelected(new Set()),
  };
}

export function BulkToggle({ bulk, label = "Chọn nhiều" }: { bulk: BulkSelect; label?: string }) {
  if (bulk.active) return null;
  return (
    <Button variant="outline" onClick={bulk.start}>
      <CheckSquare /> {label}
    </Button>
  );
}

export function BulkBar({
  bulk,
  visibleIds,
  onDelete,
}: {
  bulk: BulkSelect;
  visibleIds: string[];
  onDelete: (ids: string[]) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!bulk.active) return null;
  const count = bulk.selected.size;
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => bulk.selected.has(id));

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-background/95 p-2 shadow-sm backdrop-blur">
      <Button variant="ghost" size="sm" onClick={() => (allSelected ? bulk.clear() : bulk.setAll(visibleIds))}>
        {allSelected ? <Square /> : <CheckSquare />}
        {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
      </Button>
      <span className="text-sm text-muted-foreground">
        {count} / {visibleIds.length}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm font-medium text-destructive">Xoá {count} mục?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete([...bulk.selected]);
                setConfirming(false);
                bulk.exit();
              }}
            >
              Xác nhận
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Huỷ
            </Button>
          </>
        ) : (
          <Button variant="destructive" size="sm" disabled={count === 0} onClick={() => setConfirming(true)}>
            <Trash2 /> Xoá đã chọn
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={bulk.exit} aria-label="Thoát chế độ chọn">
          <X />
        </Button>
      </div>
    </div>
  );
}

export function SelectCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="size-4 shrink-0 accent-(--color-primary)"
    />
  );
}
