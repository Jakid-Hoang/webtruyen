"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SearchBox } from "@/components/kit/page";
import { mix } from "@/lib/codex/algorithms";
import type { Entity } from "@/lib/codex/schema";
import { elementColor, elementName, entityColors, entityHref, findEntity } from "@/lib/codex/select";
import { matches } from "@/lib/text";
import { useCodex } from "@/store/codex-store";

function PickDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const skills = useCodex((s) => s.data.ent.skill ?? []);
  const [q, setQ] = useState("");
  const visible = skills.filter((s) => matches(q, s.name, s.aliases));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chọn skill</DialogTitle>
        </DialogHeader>
        <SearchBox value={q} onChange={setQ} placeholder="Tìm…" className="flex-none" />
        <ul className="grid max-h-[56dvh] gap-0.5 overflow-y-auto">
          {visible.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                <span>✦</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.f.type} · bậc {s.f.rank || "—"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Slot({ skill, label, onPick }: { skill?: Entity; label: string; onPick: () => void }) {
  const data = useCodex((s) => s.data);
  if (!skill)
    return (
      <div className="grid min-h-28 place-items-center rounded-xl border-2 border-dashed p-3">
        <Button variant="outline" onClick={onPick}>
          {label}
        </Button>
      </div>
    );
  return (
    <div className="grid min-h-28 content-center gap-1 rounded-xl border-2 p-3" style={{ borderColor: entityColors(data, skill.els)[0] }}>
      <strong className="font-serif">{skill.name}</strong>
      <span className="text-xs text-muted-foreground">
        {skill.f.type} · {skill.f.mech} · bậc {skill.f.rank || "—"}
      </span>
      <Button variant="ghost" size="xs" className="justify-self-start" onClick={onPick}>
        Đổi
      </Button>
    </div>
  );
}

export function FusePage() {
  const router = useRouter();
  const data = useCodex((s) => s.data);
  const addEntity = useCodex((s) => s.addEntity);
  const [slots, setSlots] = useState<[string, string]>(["", ""]);
  const [picking, setPicking] = useState<0 | 1 | null>(null);

  const skills = data.ent.skill ?? [];
  const a = slots[0] ? findEntity(data, "skill", slots[0]) : undefined;
  const b = slots[1] ? findEntity(data, "skill", slots[1]) : undefined;
  const r = a && b ? mix(data, a, b) : null;
  const fused = skills.filter((s) => s.recipe);

  const pick = (i: 0 | 1) => {
    if (!skills.length) {
      toast("Chưa có skill nào trong truyện. Vào Thư viện skill mẫu để lấy trước.");
      return;
    }
    setPicking(i);
  };

  const save = () => {
    if (!r) return;
    const e = addEntity("skill", {
      eraId: null,
      name: r.name,
      icon: "✦",
      els: r.els,
      f: { type: r.type, range: r.range, rank: r.rank, mech: r.mech, desc: r.desc, folder: "Hợp thành", src: "hợp thành" },
      recipe: r.recipe,
    });
    toast.success("Đã tạo skill mới");
    router.push(entityHref("skill", e.id));
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader icon={FlaskConical} title="Phòng hợp thành" subtitle="Ghép hai skill để sinh skill mới" />

      <section className="grid gap-4 rounded-xl border bg-card p-4">
        <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Slot skill={a} label="Chọn skill 1" onPick={() => pick(0)} />
          <span className="text-center text-2xl font-bold text-muted-foreground">+</span>
          <Slot skill={b} label="Chọn skill 2" onPick={() => pick(1)} />
          <span className="text-center text-2xl font-bold text-muted-foreground">=</span>
          <div className="grid min-h-28 place-items-center rounded-xl border-2 border-dashed border-primary/60 p-3 text-center">
            {r ? (
              <span className="grid gap-1">
                <strong className="font-serif">{r.name}</strong>
                <span className="text-xs text-muted-foreground">chưa lưu</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">kết quả</span>
            )}
          </div>
        </div>

        {r ? (
          <div className="grid gap-3 rounded-xl border border-primary/50 bg-primary/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold" data-testid="fuse-name">
                  {r.name}
                </h3>
                <p className="mt-1 max-w-[58ch] text-sm">{r.desc}</p>
              </div>
              <span className="font-serif text-2xl font-semibold" data-testid="fuse-rank">
                {r.rank}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.els.map((id) => (
                <span key={id} className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: elementColor(data, id) }}>
                  {elementName(data, id)}
                </span>
              ))}
              {[r.type, r.range, r.mech].filter(Boolean).map((x) => (
                <span key={x} className="rounded-full border px-2.5 py-0.5 text-xs">
                  {x}
                </span>
              ))}
            </div>
            <Button className="justify-self-start" onClick={save}>
              Lưu thành skill mới
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chọn đủ hai skill để xem gợi ý.</p>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Đã hợp thành ({fused.length})</h2>
        {fused.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fused.map((s) => {
              const [c1, c2] = entityColors(data, s.els);
              return (
                <li key={s.id}>
                  <Link href={entityHref("skill", s.id)} className="grid overflow-hidden rounded-xl border hover:border-primary">
                    <span className="flex justify-between px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: `linear-gradient(115deg, ${c1}, ${c2})` }}>
                      <span>{s.f.type}</span>
                      <span>{s.f.rank}</span>
                    </span>
                    <span className="grid gap-1 p-3">
                      <span className="font-serif font-semibold">{s.name}</span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{s.f.desc}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PickDialog
        key={picking ?? "closed"}
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(id) => {
          setSlots((s) => (picking === 0 ? [id, s[1]] : [s[0], id]));
          setPicking(null);
        }}
      />
    </div>
  );
}
