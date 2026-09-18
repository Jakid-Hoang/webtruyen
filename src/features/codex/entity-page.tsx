"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchBox } from "@/components/kit/page";
import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/text";
import type { Entity } from "@/lib/codex/schema";
import { elementName, entityColors, listInEra, tdef } from "@/lib/codex/select";
import { seedLibrary } from "@/lib/codex/seed-libraries";
import type { TypeDef } from "@/lib/codex/types";
import { useCodex } from "@/store/codex-store";
import { EntityDetail } from "./entity-detail";

/** Dòng phụ dưới tên: 2 ô ngắn đầu tiên + các hệ. */
function subLine(t: TypeDef, e: Entity, elName: (id: string) => string) {
  const parts = t.f
    .filter((f) => f.t !== "area" && f.t !== "img")
    .slice(0, 2)
    .map((f) => e.f[f.k])
    .filter(Boolean);
  if (e.els.length) parts.push(e.els.map(elName).join("/"));
  return parts.join(" · ");
}

export function EntityPage({ typeKey }: { typeKey: string }) {
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);
  const [openId, setOpenId] = useUrlState("open");
  const [q, setQ] = useState("");

  const t = tdef(data, typeKey);
  if (!t) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Không có loại mục này.{" "}
        <Link href="/world" className="font-semibold text-primary hover:underline">
          Về trang thế giới
        </Link>
      </div>
    );
  }

  const inEra = listInEra(data, t.k);
  const total = (data.ent[t.k] ?? []).length;
  const visible = inEra.filter((e) => matches(q, e.name, e.aliases));
  // Mục đang mở có thể thuộc thời đại khác (đi tới từ liên kết) — vẫn hiện.
  const current = (data.ent[t.k] ?? []).find((e) => e.id === openId);
  const elName = (id: string) => elementName(data, id);

  const create = () => setOpenId(addEntity(t.k).id);

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <span aria-hidden>{t.ic}</span> {t.l}
          </h1>
          <p className="text-sm text-muted-foreground">
            {inEra.length} mục trong thời đại này · {total} tổng cộng
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {seedLibrary(t.k) && (
            <Link href={`/library/${t.k}`} className={buttonVariants({ variant: "outline" })}>
              📚 Thư viện mẫu
            </Link>
          )}
          <Button onClick={create}>
            <Plus /> Tạo {t.l.toLowerCase()}
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className={cn("grid gap-2 rounded-xl border bg-card p-2", current && "hidden lg:grid")} aria-label={`Danh sách ${t.l}`}>
          <SearchBox value={q} onChange={setQ} placeholder="Tìm tên, biệt danh…" className="flex-none" />
          <ul className="grid max-h-[65dvh] gap-0.5 overflow-y-auto">
            {visible.map((e) => {
              const [c1, c2] = entityColors(data, e.els);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(e.id)}
                    aria-current={openId === e.id ? "true" : undefined}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left", openId === e.id ? "bg-primary/15" : "hover:bg-muted")}
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-base"
                      style={{ background: `linear-gradient(135deg, ${c1}2e, ${c2}2e)`, borderColor: `${c1}55` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {e.f.img ? <img src={e.f.img} alt="" className="size-full object-cover" /> : e.icon || t.ic}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{e.name || "(chưa đặt tên)"}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{subLine(t, e, elName)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                {inEra.length === 0 ? "Chưa có mục nào trong thời đại này." : "Không có mục nào khớp."}
              </li>
            )}
          </ul>
        </aside>

        {current ? (
          <div className="grid gap-2">
            <Button variant="ghost" size="sm" className="justify-self-start lg:hidden" onClick={() => setOpenId("")}>
              ← Danh sách
            </Button>
            <EntityDetail key={current.id} t={t} e={current} onDeleted={() => setOpenId("")} />
          </div>
        ) : (
          <div className="hidden rounded-xl border border-dashed py-20 text-center text-sm text-muted-foreground lg:block">
            Chọn một mục bên trái, hoặc{" "}
            <button onClick={create} className="font-semibold text-primary hover:underline">
              tạo mới
            </button>
            .
          </div>
        )}
      </div>
    </div>
  );
}
