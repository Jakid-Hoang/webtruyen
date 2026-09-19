"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dices, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/kit/page";
import { generateUnique, hasNamePattern, nameStyles, rollNames, type NameLang, type RolledName } from "@/lib/codex/name-gen";
import { allTypes, entityHref } from "@/lib/codex/select";
import { useCodex } from "@/store/codex-store";
import type { CodexData } from "@/lib/codex/schema";

/** Mọi tên đang có trong dự án, để máy không bốc trùng. */
export function usedNames(data: CodexData): Set<string> {
  const s = new Set<string>();
  for (const t of allTypes(data)) for (const e of data.ent[t.k] ?? []) if (e.name) s.add(e.name.toLowerCase());
  return s;
}

export function NamesPage() {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);
  const [lang, setLang] = useState<NameLang>("en");
  const [typeKey, setTypeKey] = useState("land");
  const [style, setStyle] = useState("");
  const [rolls, setRolls] = useState<RolledName[]>([]);

  const types = allTypes(data).filter((t) => hasNamePattern(t.k));
  const styles = nameStyles(lang);

  const roll = () => setRolls(rollNames(typeKey, style, lang, usedNames(data)));
  const reroll = (i: number) =>
    setRolls((prev) => prev.map((r, j) => (j === i ? generateUnique(typeKey, style, lang, usedNames(data)) : r)));

  const create = (r: RolledName) => {
    const t = types.find((x) => x.k === typeKey);
    const e = addEntity(typeKey, { name: r.name, gloss: r.gloss });
    toast.success(`Đã tạo ${t?.l.toLowerCase()} “${r.name}”`);
    router.push(entityHref(typeKey, e.id));
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader icon={Dices} title="Máy đặt tên" subtitle="Bốc tên rồi tạo mục luôn, hoặc chỉ lấy ý tưởng" />

      <section className="grid gap-2 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as NameLang);
              setStyle("");
              setRolls([]);
            }}
            aria-label="Ngôn ngữ tên"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            <option value="en">Tên tiếng Anh</option>
            <option value="vi">Tên tiếng Việt</option>
          </select>
          <select
            value={typeKey}
            onChange={(e) => {
              setTypeKey(e.target.value);
              setRolls([]);
            }}
            aria-label="Loại mục"
            className="h-8 max-w-52 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            {types.map((t) => (
              <option key={t.k} value={t.k}>
                {t.l}
              </option>
            ))}
          </select>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            aria-label="Phong cách"
            className="h-8 max-w-48 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
          >
            <option value="">Trộn mọi phong cách</option>
            {styles.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <Button onClick={roll}>
            <Dices /> Bốc 12 tên
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tên bốc theo khuôn của loại mục đang chọn và tránh trùng với tên đã có. Dòng chữ nhỏ là gợi ý mô tả — nên sửa
          lại cho đúng thế giới của bạn.
        </p>
      </section>

      {rolls.length === 0 ? (
        <EmptyState>Chọn loại mục rồi bấm “Bốc 12 tên”.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="name-rolls">
          {rolls.map((r, i) => (
            <li key={`${r.name}-${i}`} className="grid content-start gap-1 rounded-xl border bg-card p-3">
              <span className="font-serif text-lg font-semibold">{r.name}</span>
              {r.gloss && <span className="text-xs text-muted-foreground">{r.gloss}</span>}
              <span className="mt-1.5 flex gap-1.5">
                <Button size="sm" onClick={() => create(r)}>
                  Tạo mục
                </Button>
                <Button size="sm" variant="ghost" onClick={() => reroll(i)}>
                  <RefreshCw /> Bốc lại
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
