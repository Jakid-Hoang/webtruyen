"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { matches } from "@/lib/text";

/** Hộp chọn nhiều mục (liên kết r) có ô tìm. */
export function RefPicker({
  open,
  onOpenChange,
  title,
  options,
  selected,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  options: { id: string; name: string; icon?: string; sub?: string }[];
  selected: string[];
  onSave: (ids: string[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && <PickerBody options={options} selected={selected} onSave={onSave} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({
  options,
  selected,
  onSave,
  onClose,
}: {
  options: { id: string; name: string; icon?: string; sub?: string }[];
  selected: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);
  const visible = options.filter((o) => matches(q, o.name, o.sub));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-2 p-4">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm…"
          aria-label="Tìm"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        />
        <ul className="grid max-h-[50dvh] gap-0.5 overflow-y-auto">
          {visible.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                <input type="checkbox" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} className="size-4 accent-(--color-primary)" />
                {o.icon && <span aria-hidden>{o.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.name || "(chưa đặt tên)"}</span>
                  {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                </span>
              </label>
            </li>
          ))}
          {visible.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Không có mục nào.</li>}
        </ul>
      </div>
      <DialogFooter className="m-0">
        <span className="mr-auto self-center text-xs text-muted-foreground">Đã chọn {picked.length}</span>
        <Button variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button
          onClick={() => {
            onSave(picked);
            onClose();
          }}
        >
          Xong
        </Button>
      </DialogFooter>
    </>
  );
}
