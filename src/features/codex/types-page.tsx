"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shapes, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/kit/fields";
import { EmptyState, PageHeader } from "@/components/kit/page";
import { genId } from "@/lib/id";
import { GROUPS, type FieldDef } from "@/lib/codex/types";
import { askConfirm } from "@/store/confirm-store";
import { useCodex } from "@/store/codex-store";

const inputCls = "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export function TypesPage() {
  const router = useRouter();
  const custom = useCodex((s) => s.data.custom);
  const ent = useCodex((s) => s.data.ent);
  const addCustomType = useCodex((s) => s.addCustomType);
  const deleteCustomType = useCodex((s) => s.deleteCustomType);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("✧");
  const [group, setGroup] = useState<string>("Khác");
  const [shorts, setShorts] = useState("");
  const [areas, setAreas] = useState("");
  const [els, setEls] = useState(false);

  const create = () => {
    const l = label.trim();
    if (!l) {
      toast.error("Chưa nhập tên loại mục");
      return;
    }
    const mk = (s: string, t: FieldDef["t"]): FieldDef[] =>
      s.split(",").map((x) => x.trim()).filter(Boolean).map((x) => ({ k: `c${genId()}`, l: x, t }));
    const k = addCustomType({ l, ic: icon || "✧", g: group, els: els ? 1 : 0, f: [...mk(shorts, "text"), ...mk(areas, "area")], r: [] });
    toast.success(`Đã tạo loại mục “${l}”`);
    router.push(`/e/${k}`);
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <PageHeader icon={Shapes} title="Loại mục tự tạo" subtitle="Fantasy quá rộng để đóng cứng — tự thêm loại mục cho thế giới của bạn" />

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_6rem_10rem]">
          <div className="grid gap-1">
            <FieldLabel htmlFor="ct-l">Tên loại mục</FieldLabel>
            <input id="ct-l" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="vd: Khế Ước Long Tộc" className={inputCls} />
          </div>
          <div className="grid gap-1">
            <FieldLabel htmlFor="ct-i">Biểu tượng</FieldLabel>
            <input id="ct-i" value={icon} maxLength={3} onChange={(e) => setIcon(e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-1">
            <FieldLabel htmlFor="ct-g">Nhóm</FieldLabel>
            <select id="ct-g" value={group} onChange={(e) => setGroup(e.target.value)} className={inputCls}>
              {GROUPS.filter((g) => g !== "Nền tảng").map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <FieldLabel htmlFor="ct-f">Các ô thông tin ngắn — ngăn bằng dấu phẩy</FieldLabel>
          <input id="ct-f" value={shorts} onChange={(e) => setShorts(e.target.value)} placeholder="Phẩm cấp, Nguồn gốc, Độ hiếm" className={inputCls} />
        </div>
        <div className="grid gap-1">
          <FieldLabel htmlFor="ct-a">Các ô mô tả dài — ngăn bằng dấu phẩy</FieldLabel>
          <input id="ct-a" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Mô tả, Điều kiện, Hậu quả" className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={els} onChange={(e) => setEls(e.target.checked)} className="size-4 accent-(--color-primary)" />
          Loại mục này có gán hệ nguyên tố
        </label>
        <Button className="justify-self-start" onClick={create}>
          Tạo loại mục
        </Button>
      </section>

      <section className="grid gap-2 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Đã tạo ({custom.length})</h2>
        {custom.length === 0 ? (
          <EmptyState>Chưa có loại mục tự tạo nào.</EmptyState>
        ) : (
          <ul className="grid gap-1.5">
            {custom.map((t) => (
              <li key={t.k} className="flex items-center gap-3 text-sm">
                <Link href={`/e/${t.k}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary hover:underline">
                  {t.ic} {t.l}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {t.f.length} ô · {(ent[t.k] ?? []).length} mục · nhóm {t.g}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-destructive"
                  aria-label={`Xoá loại mục ${t.l}`}
                  onClick={() =>
                    askConfirm({
                      title: `Xoá loại mục “${t.l}”?`,
                      description: `${(ent[t.k] ?? []).length} mục bên trong cũng bị xoá. Có thể hoàn tác bằng Ctrl+Z.`,
                      confirmLabel: "Xoá",
                      destructive: true,
                      onConfirm: () => deleteCustomType(t.k),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
