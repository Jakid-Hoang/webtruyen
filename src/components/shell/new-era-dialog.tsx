"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorldStore } from "@/store/world-store";

const EMPTY = "__empty__";

export function NewEraDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const eras = useWorldStore((s) => s.data.eras);
  const addEra = useWorldStore((s) => s.addEra);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<string>(EMPTY);

  const items = [
    { value: EMPTY, label: "Bắt đầu trống" },
    ...eras.map((e) => ({ value: e.id, label: `Sao chép cấu trúc thế giới từ “${e.name}”` })),
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addEra(trimmed, copyFrom === EMPTY ? undefined : copyFrom);
    setName("");
    setCopyFrom(EMPTY);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Tạo Era mới</DialogTitle>
            <DialogDescription>Mỗi Era là một giai đoạn của thế giới truyện, có dữ liệu riêng.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="era-name">Tên Era</Label>
            <Input id="era-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Thời kỳ Loạn Thế" />
          </div>
          <div className="grid gap-2">
            <Label>Dữ liệu ban đầu</Label>
            <Select items={items} value={copyFrom} onValueChange={(v) => setCopyFrom(v ?? EMPTY)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Tạo Era
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
