"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/catalog";

const controlCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </label>
  );
}

function Wrap({ label, id, children, className }: { label?: React.ReactNode; id: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1", className)}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      {children}
    </div>
  );
}

/**
 * Local draft that commits on blur / Enter. Keeps undo history to one step per
 * edit instead of one per keystroke.
 */
function useDraft(value: string, onCommit: (v: string) => void) {
  const [draft, setDraft] = useState(value);
  // Reset the draft when the stored value changes (undo, other editors).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return { draft, setDraft, commit };
}

export function TextField({
  label,
  value,
  onCommit,
  placeholder,
  className,
}: {
  label?: React.ReactNode;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const { draft, setDraft, commit } = useDraft(value, onCommit);
  return (
    <Wrap label={label} id={id} className={className}>
      <input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className={cn(controlCls, "h-8")}
      />
    </Wrap>
  );
}

export function AreaField({
  label,
  value,
  onCommit,
  placeholder,
  rows = 3,
  className,
}: {
  label?: React.ReactNode;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const id = useId();
  const { draft, setDraft, commit } = useDraft(value, onCommit);
  return (
    <Wrap label={label} id={id} className={className}>
      <textarea
        id={id}
        value={draft}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className={cn(controlCls, "field-sizing-content min-h-16 py-1.5 leading-relaxed")}
      />
    </Wrap>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "— Chưa chọn —",
  className,
  allowEmpty = true,
}: {
  label?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: (Option | { value: string; label: string; disabled?: boolean })[];
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
}) {
  const id = useId();
  const known = options.some((o) => o.value === value);
  return (
    <Wrap label={label} id={id} className={className}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(controlCls, "h-8 pr-1")}>
        {allowEmpty && <option value="">{placeholder}</option>}
        {value && !known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={"disabled" in o ? o.disabled : undefined}>
            {"icon" in o && o.icon ? `${o.icon} ` : ""}
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

/** Chip list + "add" select for many-to-many id references. */
export function MultiRefField({
  label,
  values,
  onChange,
  options,
  addLabel,
  onChipClick,
}: {
  label?: React.ReactNode;
  values: string[];
  onChange: (ids: string[]) => void;
  options: { value: string; label: string }[];
  addLabel: string;
  onChipClick?: (id: string) => void;
}) {
  const id = useId();
  const byId = new Map(options.map((o) => [o.value, o.label]));
  const remaining = options.filter((o) => !values.includes(o.value));
  return (
    <Wrap label={label} id={id}>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
            <button type="button" className="hover:underline" onClick={() => onChipClick?.(v)} disabled={!onChipClick}>
              {byId.get(v) ?? "(đã xoá)"}
            </button>
            <button
              type="button"
              aria-label={`Gỡ ${byId.get(v) ?? v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-muted-foreground italic">Chưa có</span>}
      </div>
      {remaining.length > 0 && (
        <select
          id={id}
          value=""
          onChange={(e) => e.target.value && onChange([...values, e.target.value])}
          className={cn(controlCls, "mt-1 h-8 pr-1 text-muted-foreground")}
        >
          <option value="">{addLabel}</option>
          {remaining.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Wrap>
  );
}

/** Toggle-button group for small enums. */
export function ChoiceField({
  label,
  value,
  onChange,
  options,
}: {
  label?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const id = useId();
  return (
    <Wrap label={label} id={id}>
      <div className="flex flex-wrap gap-1" role="radiogroup" id={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(value === o.value ? "" : o.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              value === o.value ? "border-primary bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {o.icon ? `${o.icon} ` : ""}
            {o.label}
          </button>
        ))}
      </div>
    </Wrap>
  );
}

/** Double-click (or pencil) to rename inline. */
export function InlineName({
  value,
  onCommit,
  editing,
  setEditing,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Start every edit session from the current value.
  const syncKey = `${editing}|${value}`;
  const [synced, setSynced] = useState(syncKey);
  if (synced !== syncKey) {
    setSynced(syncKey);
    setDraft(value);
  }
  if (!editing) {
    return (
      <span className={cn("truncate", className)} onDoubleClick={() => setEditing(true)} title="Nhấp đúp để đổi tên">
        {value}
      </span>
    );
  }
  const done = (save: boolean) => {
    const v = draft.trim();
    if (save && v && v !== value) onCommit(v);
    setEditing(false);
  };
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => done(true)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") done(true);
        if (e.key === "Escape") done(false);
      }}
      className={cn(controlCls, "h-7 font-semibold", className)}
    />
  );
}

export function Tag({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", className ?? "bg-muted text-muted-foreground")}>
      {children}
    </span>
  );
}
