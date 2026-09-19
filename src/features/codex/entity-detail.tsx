"use client";

import { useState } from "react";
import Link from "next/link";
import { Dices, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AreaField, SelectField, TextField } from "@/components/kit/fields";
import { cn } from "@/lib/utils";
import type { Entity } from "@/lib/codex/schema";
import { elementColor, elementName, entityColors, entityHref, entityName, tdef } from "@/lib/codex/select";
import { REL_KINDS, type FieldDef, type TypeDef } from "@/lib/codex/types";
import { askConfirm } from "@/store/confirm-store";
import { useCodex } from "@/store/codex-store";
import { generateUnique, hasNamePattern } from "@/lib/codex/name-gen";
import { EntityHits } from "./entity-hits";
import { usedNames } from "./names-page";
import { RefPicker } from "./ref-picker";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-2.5 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ t, e, f }: { t: TypeDef; e: Entity; f: FieldDef }) {
  const setField = useCodex((s) => s.setField);
  const ranks = useCodex((s) => s.data.world.ranks);
  const value = e.f[f.k] ?? "";
  const set = (v: string) => setField(t.k, e.id, f.k, v);
  switch (f.t) {
    case "area":
      return <AreaField label={f.l} value={value} onCommit={set} />;
    case "sel":
      return <SelectField label={f.l} value={value} onChange={set} options={(f.o ?? []).map((o) => ({ value: o, label: o }))} placeholder="—" />;
    case "rank":
      return <SelectField label={f.l} value={value} onChange={set} options={ranks.map((o) => ({ value: o, label: o }))} placeholder="—" />;
    default:
      return <TextField label={f.l} value={value} onCommit={set} placeholder={f.t === "img" ? "https://…" : undefined} />;
  }
}

/** Thanh % thuần thục: kéo tự do, chỉ ghi (và tạo 1 bước hoàn tác) khi thả tay. */
function AffinitySlider({ charId, elementId }: { charId: string; elementId: string }) {
  const data = useCodex((s) => s.data);
  const setAffinity = useCodex((s) => s.setAffinity);
  const stored = data.ent.char?.find((c) => c.id === charId)?.aff[elementId] ?? 60;
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? stored;
  const commit = () => {
    if (draft !== null && draft !== stored) setAffinity(charId, elementId, draft);
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 truncate">{elementName(data, elementId)}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(ev) => setDraft(Number(ev.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label={`Độ thuần thục hệ ${elementName(data, elementId)}`}
        className="flex-1"
        style={{ accentColor: elementColor(data, elementId) }}
      />
      <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function RelationDialog({ open, onOpenChange, charId }: { open: boolean; onOpenChange: (o: boolean) => void; charId: string }) {
  const chars = useCodex((s) => s.data.ent.char ?? []);
  const addRelation = useCodex((s) => s.addRelation);
  const others = chars.filter((c) => c.id !== charId);
  const [to, setTo] = useState("");
  const [kind, setKind] = useState(REL_KINDS[0].value);
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm mối quan hệ</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <SelectField label="Với ai" value={to} onChange={setTo} options={others.map((c) => ({ value: c.id, label: c.name }))} placeholder="— Chọn nhân vật —" />
          <SelectField label="Loại" value={kind} onChange={setKind} options={REL_KINDS.map((r) => ({ value: r.value, label: r.value }))} allowEmpty={false} />
          <TextField label="Ghi chú" value={note} onCommit={setNote} placeholder="vd: anh trai cùng cha khác mẹ" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            disabled={!to}
            onClick={() => {
              addRelation(charId, { to, kind, note });
              setTo("");
              setNote("");
              onOpenChange(false);
            }}
          >
            Thêm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EntityDetail({ t, e, onDeleted }: { t: TypeDef; e: Entity; onDeleted: () => void }) {
  const data = useCodex((s) => s.data);
  const updateEntity = useCodex((s) => s.updateEntity);
  const deleteEntity = useCodex((s) => s.deleteEntity);
  const toggleEl = useCodex((s) => s.toggleEntityElement);
  const setRefs = useCodex((s) => s.setRefs);
  const removeRelation = useCodex((s) => s.removeRelation);
  const [picker, setPicker] = useState<string | null>(null);
  const [relOpen, setRelOpen] = useState(false);

  const [c1, c2] = entityColors(data, e.els);
  const shorts = t.f.filter((f) => f.t !== "area");
  const areas = t.f.filter((f) => f.t === "area");
  const img = e.f.img;
  const activeRef = t.r.find((r) => r.k === picker);

  const refOptions = (to: string) =>
    to === "element"
      ? data.elements.map((x) => ({ id: x.id, name: x.name, icon: x.icon }))
      : (data.ent[to] ?? []).filter((x) => x.id !== e.id).map((x) => ({ id: x.id, name: x.name, icon: x.icon, sub: x.aliases }));

  return (
    <div className="grid content-start gap-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex h-16 items-center gap-3 px-4" style={{ background: `linear-gradient(115deg, ${c1}, ${c2})` }}>
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/30 bg-black/20 text-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img ? <img src={img} alt="" className="size-full object-cover" /> : e.icon || t.ic}
          </span>
          <span className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-2xl font-semibold text-white [text-shadow:0_2px_8px_rgba(0,0,0,.5)]">
              {e.name || "(chưa đặt tên)"}
            </h1>
            {e.gloss && <p className="truncate text-xs text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">{e.gloss}</p>}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/40 bg-black/25 text-white hover:bg-black/40 hover:text-white"
            onClick={() =>
              askConfirm({
                title: `Xoá “${e.name || "mục này"}”?`,
                description: "Mọi liên kết tới mục này sẽ được gỡ. Có thể hoàn tác bằng Ctrl+Z.",
                confirmLabel: "Xoá",
                destructive: true,
                onConfirm: () => {
                  deleteEntity(t.k, e.id);
                  onDeleted();
                },
              })
            }
          >
            <Trash2 /> Xoá
          </Button>
        </div>
        <div className="grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-end gap-1.5">
              <TextField label="Tên" value={e.name} onCommit={(name) => updateEntity(t.k, e.id, { name })} className="min-w-0 flex-1" />
              {hasNamePattern(t.k) && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Bốc tên ngẫu nhiên"
                  title="Bốc tên ngẫu nhiên"
                  onClick={() => {
                    const r = generateUnique(t.k, "", "en", usedNames(data));
                    updateEntity(t.k, e.id, { name: r.name, gloss: r.gloss });
                  }}
                >
                  <Dices />
                </Button>
              )}
            </div>
            <TextField label="Biểu tượng" value={e.icon} onCommit={(icon) => updateEntity(t.k, e.id, { icon })} />
            <SelectField
              label="Thời đại"
              value={e.eraId ?? ""}
              onChange={(v) => updateEntity(t.k, e.id, { eraId: v || null })}
              options={data.eras.map((x) => ({ value: x.id, label: x.name }))}
              placeholder="Xuyên suốt"
            />
          </div>
          <TextField
            label="Mô tả một dòng — hiện ngay dưới tên"
            value={e.gloss}
            onCommit={(gloss) => updateEntity(t.k, e.id, { gloss })}
            placeholder="Nói nó LÀ CÁI GÌ, đừng dịch lại tên — vd: Thị trấn mỏ sắt đã cạn, dân bỏ đi quá nửa"
          />
          <TextField
            label="Tên khác / biệt danh — ngăn bằng dấu phẩy, dùng để dò trong truyện"
            value={e.aliases}
            onCommit={(aliases) => updateEntity(t.k, e.id, { aliases })}
          />
          {shorts.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {shorts.map((f) => (
                <Field key={f.k} t={t} e={e} f={f} />
              ))}
            </div>
          )}
          {areas.map((f) => (
            <Field key={f.k} t={t} e={e} f={f} />
          ))}
        </div>
      </section>

      {!!t.els && (
        <Panel title="Hệ">
          <p className="-mt-1 text-xs text-muted-foreground">Bấm để bật/tắt, chọn được nhiều hệ.</p>
          <div className="flex flex-wrap gap-1.5">
            {data.elements.map((x) => {
              const on = e.els.includes(x.id);
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleEl(t.k, e.id, x.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? "border-transparent font-semibold text-white" : "hover:bg-muted",
                  )}
                  style={on ? { background: x.color } : undefined}
                >
                  <span className="size-2 rotate-45 rounded-[2px]" style={{ background: on ? "#fff" : x.color }} />
                  {x.icon} {x.name}
                </button>
              );
            })}
          </div>
          {t.k === "char" && e.els.length > 0 && (
            <div className="mt-1 grid gap-1.5">
              <p className="text-xs text-muted-foreground">Độ thuần thục từng hệ</p>
              {e.els.map((id) => (
                <AffinitySlider key={id} charId={e.id} elementId={id} />
              ))}
            </div>
          )}
        </Panel>
      )}

      {t.r.map((r) => {
        const ids = e.r[r.k] ?? [];
        const target = r.to === "element" ? null : tdef(data, r.to);
        return (
          <Panel
            key={r.k}
            title={`${r.l} (${ids.length})`}
            action={
              <Button variant="outline" size="sm" onClick={() => setPicker(r.k)}>
                Chọn
              </Button>
            }
          >
            {ids.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa gán.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ids.map((id) =>
                  r.to === "element" ? (
                    <span key={id} className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: elementColor(data, id) }}>
                      {elementName(data, id)}
                    </span>
                  ) : (
                    <Link key={id} href={entityHref(r.to, id)} className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium hover:border-primary">
                      {target?.ic} {entityName(data, r.to, id)}
                    </Link>
                  ),
                )}
              </div>
            )}
          </Panel>
        );
      })}

      {t.k === "char" && (
        <Panel
          title={`Mối quan hệ (${e.rel.length})`}
          action={
            <Button variant="outline" size="sm" onClick={() => setRelOpen(true)}>
              <Plus /> Thêm
            </Button>
          }
        >
          {e.rel.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có mối quan hệ nào.</p>
          ) : (
            <ul className="grid gap-1.5">
              {e.rel.map((rel, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                    style={{ borderColor: REL_KINDS.find((k) => k.value === rel.kind)?.color ?? "#888" }}
                  >
                    {rel.kind}
                  </span>
                  <Link href={entityHref("char", rel.to)} className="font-medium hover:text-primary hover:underline">
                    {entityName(data, "char", rel.to)}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{rel.note}</span>
                  <Button variant="ghost" size="icon-xs" aria-label="Xoá quan hệ" onClick={() => removeRelation(e.id, i)}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <RelationDialog open={relOpen} onOpenChange={setRelOpen} charId={e.id} />
        </Panel>
      )}

      <Panel title="Nơi xuất hiện trong truyện">
        <EntityHits tk={t.k} id={e.id} />
      </Panel>

      {activeRef && (
        <RefPicker
          open={!!picker}
          onOpenChange={(o) => !o && setPicker(null)}
          title={`Chọn: ${activeRef.l}`}
          options={refOptions(activeRef.to)}
          selected={e.r[activeRef.k] ?? []}
          onSave={(ids) => setRefs(t.k, e.id, activeRef.k, ids)}
        />
      )}
    </div>
  );
}
