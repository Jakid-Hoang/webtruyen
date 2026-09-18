"use client";

import { useState } from "react";
import { Palette, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectCheckbox } from "@/components/kit/page";
import { CARD_ACCENTS, CARD_THEMES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/schema/world";
import { useWorldStore } from "@/store/world-store";
import { STATUS_META, THEME_STYLE, defaultAccent } from "./meta";

export interface CardCounts {
  arts: number;
  treasures: number;
  skills: number;
  hasDomain: boolean;
}

function FramePicker({ c, onClose }: { c: Character; onClose: () => void }) {
  const updateItem = useWorldStore((s) => s.updateItem);
  const set = (patch: Partial<Character>) => updateItem("characters", c.id, patch);
  return (
    <div
      className="absolute top-10 right-2 z-20 grid w-56 gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Khung thẻ</span>
        <div className="grid grid-cols-4 gap-1">
          {CARD_THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              title={t.label}
              onClick={() => set({ cardTheme: t.value })}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border text-lg",
                c.cardTheme === t.value ? "border-primary bg-primary/15" : "hover:bg-muted",
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Màu nhấn</span>
        <div className="flex flex-wrap gap-1.5">
          {CARD_ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Màu ${color}`}
              onClick={() => set({ cardAccent: color })}
              className={cn("size-6 rounded-full border-2", defaultAccent(c) === color ? "border-foreground" : "border-transparent")}
              style={{ background: color }}
            />
          ))}
          <input
            type="color"
            value={defaultAccent(c)}
            onChange={(e) => set({ cardAccent: e.target.value })}
            aria-label="Màu tuỳ chọn"
            className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onClose}>
        Xong
      </Button>
    </div>
  );
}

export function CharacterCard({
  character: c,
  locationName,
  factionName,
  counts,
  onOpen,
  onDelete,
  bulk,
}: {
  character: Character;
  locationName?: string;
  factionName?: string;
  counts: CardCounts;
  onOpen: () => void;
  onDelete: () => void;
  bulk?: { checked: boolean; toggle: () => void };
}) {
  const updateItem = useWorldStore((s) => s.updateItem);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nick, setNick] = useState<string | null>(null);
  const accent = defaultAccent(c);
  const theme = THEME_STYLE[c.cardTheme] ?? THEME_STYLE.classic;
  const status = STATUS_META[c.status];

  return (
    // Whole-card click is a mouse convenience; "Mở hồ sơ" is the accessible control.
    <article
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-card transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `color-mix(in oklch, ${accent} 55%, transparent)`, ["--accent-c" as string]: accent, backgroundImage: theme.bg }}
    >
      {/* Header strip: nickname + status */}
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs" style={{ background: `color-mix(in oklch, ${accent} 18%, transparent)` }}>
        {bulk && <SelectCheckbox checked={bulk.checked} onChange={bulk.toggle} label={`Chọn ${c.name}`} />}
        {nick !== null ? (
          <input
            autoFocus
            value={nick}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNick(e.target.value)}
            onBlur={() => {
              if (nick !== c.nickname) updateItem("characters", c.id, { nickname: nick.trim() });
              setNick(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="h-5 min-w-0 flex-1 rounded bg-background/80 px-1 outline-none"
            placeholder="Biệt danh"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNick(c.nickname);
            }}
            className="min-w-0 flex-1 truncate text-left font-semibold italic opacity-80 hover:opacity-100"
          >
            ✦ {c.nickname || "Biệt danh"}
          </button>
        )}
        <span className={cn("size-2 shrink-0 rounded-full", status.dot)} title={status.label} />
      </div>

      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/40">
        {c.cardImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.cardImage} alt={c.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <span className="text-5xl font-black opacity-30" style={{ color: accent }}>
              {c.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-[11px]">Mở hồ sơ để thêm ảnh</span>
          </div>
        )}
        <span className="pointer-events-none absolute top-1.5 left-2 text-sm opacity-60">{theme.ornament}</span>
        <span className="pointer-events-none absolute right-2 bottom-10 text-sm opacity-60">{theme.ornament}</span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2">
          <h3 className="truncate text-base font-extrabold text-white">{c.name}</h3>
        </div>
      </div>

      {/* Footer */}
      <div className="grid gap-1 px-3 py-2 text-xs">
        {c.cultivation || locationName || factionName ? (
          <>
            {c.cultivation && <span className="truncate">⚡ {c.cultivation}</span>}
            {locationName && <span className="truncate text-muted-foreground">📍 {locationName}</span>}
            {factionName && <span className="truncate text-muted-foreground">🏯 {factionName}</span>}
          </>
        ) : (
          <span className="text-muted-foreground italic">Chưa có thông tin</span>
        )}
        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span title="Công pháp">📘 {counts.arts}</span>
          <span title="Pháp bảo">⚔️ {counts.treasures}</span>
          <span title="Thần thông">⚡ {counts.skills}</span>
          {counts.hasDomain && <span className="font-semibold text-primary">🌀 Lĩnh vực</span>}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-8 right-1.5 flex flex-col gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {[
          { icon: Palette, label: "Tuỳ chỉnh khung", onClick: () => setPickerOpen((o) => !o) },
          { icon: Pencil, label: "Mở hồ sơ", onClick: onOpen },
          { icon: Trash2, label: "Xoá", onClick: onDelete },
        ].map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            aria-label={`${label} ${c.name}`}
            title={label}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex size-7 items-center justify-center rounded-full bg-background/90 shadow hover:text-primary"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      {pickerOpen && <FramePicker c={c} onClose={() => setPickerOpen(false)} />}
    </article>
  );
}
