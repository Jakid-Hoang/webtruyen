"use client";

import { Globe2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaField, TextField } from "@/components/kit/fields";
import { EmptyState, PageHeader } from "@/components/kit/page";
import { allTypes } from "@/lib/codex/select";
import { askConfirm } from "@/store/confirm-store";
import { useCodex } from "@/store/codex-store";

function useElementUsage() {
  const data = useCodex((s) => s.data);
  const counts = new Map<string, number>();
  for (const t of allTypes(data)) {
    if (!t.els) continue;
    for (const e of data.ent[t.k] ?? []) for (const id of e.els) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function CounterMatrix() {
  const elements = useCodex((s) => s.data.elements);
  const counters = useCodex((s) => s.data.counters);
  const toggle = useCodex((s) => s.toggleCounter);
  if (elements.length === 0) return <p className="text-sm text-muted-foreground">Thêm hệ trước.</p>;
  const on = (a: string, b: string) => counters.some(([x, y]) => x === a && y === b);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border bg-muted px-2 py-1.5 text-left font-medium whitespace-nowrap text-muted-foreground">
              khắc ↓ / bị →
            </th>
            {elements.map((e) => (
              <th key={e.id} className="border bg-muted px-1.5 py-1.5 font-medium whitespace-nowrap" title={e.name}>
                <span aria-hidden>{e.icon}</span> {e.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {elements.map((a) => (
            <tr key={a.id}>
              <th className="sticky left-0 z-10 border bg-muted px-2 py-1 text-left font-medium whitespace-nowrap">
                <span aria-hidden>{a.icon}</span> {a.name}
              </th>
              {elements.map((b) =>
                a.id === b.id ? (
                  <td key={b.id} className="border bg-[repeating-linear-gradient(45deg,var(--color-muted),var(--color-muted)_4px,transparent_4px,transparent_8px)]" />
                ) : (
                  <td key={b.id} className="border p-0">
                    <button
                      type="button"
                      onClick={() => toggle(a.id, b.id)}
                      aria-pressed={on(a.id, b.id)}
                      aria-label={`${a.name} khắc ${b.name}`}
                      className={
                        on(a.id, b.id)
                          ? "h-8 w-full min-w-9 bg-primary/20 font-bold text-primary"
                          : "h-8 w-full min-w-9 text-muted-foreground hover:bg-muted"
                      }
                    >
                      {on(a.id, b.id) ? "▲" : "·"}
                    </button>
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorldPage() {
  const world = useCodex((s) => s.data.world);
  const elements = useCodex((s) => s.data.elements);
  const counters = useCodex((s) => s.data.counters);
  const setWorld = useCodex((s) => s.setWorld);
  const addElement = useCodex((s) => s.addElement);
  const updateElement = useCodex((s) => s.updateElement);
  const deleteElement = useCodex((s) => s.deleteElement);
  const usage = useElementUsage();

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader icon={Globe2} title="Thế giới & hệ nguyên tố" subtitle="Dựng bảng hệ trước, mọi thứ khác gắn vào đây" />

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Tên thế giới" value={world.name} onCommit={(name) => setWorld({ name })} />
          <TextField label="Một dòng mô tả" value={world.tagline} onCommit={(tagline) => setWorld({ tagline })} />
        </div>
        <AreaField label="Bối cảnh" value={world.desc} onCommit={(desc) => setWorld({ desc })} rows={4} />
        <TextField
          label="Bậc sức mạnh — ngăn bằng dấu phẩy, thấp đến cao"
          value={world.ranks.join(", ")}
          onCommit={(v) => setWorld({ ranks: v.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Bảng hệ ({elements.length})</h2>
          <Button size="sm" onClick={addElement}>
            <Plus /> Thêm hệ
          </Button>
        </div>
        {elements.length === 0 ? (
          <EmptyState>Chưa có hệ nào.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {elements.map((e) => (
              <li key={e.id} className="overflow-hidden rounded-xl border" style={{ borderColor: `${e.color}66` }}>
                <div className="h-1" style={{ background: e.color }} />
                <div className="grid gap-2 p-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      defaultValue={e.icon}
                      maxLength={3}
                      onBlur={(ev) => ev.target.value !== e.icon && updateElement(e.id, { icon: ev.target.value })}
                      aria-label={`Biểu tượng hệ ${e.name}`}
                      className="h-8 w-11 rounded-lg border border-input bg-transparent text-center dark:bg-input/30"
                    />
                    <input
                      defaultValue={e.name}
                      onBlur={(ev) => ev.target.value.trim() && ev.target.value !== e.name && updateElement(e.id, { name: ev.target.value.trim() })}
                      aria-label="Tên hệ"
                      className="h-8 w-0 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 font-semibold dark:bg-input/30"
                    />
                    <input
                      type="color"
                      value={e.color}
                      onChange={(ev) => updateElement(e.id, { color: ev.target.value })}
                      aria-label={`Màu hệ ${e.name}`}
                      className="h-8 w-9 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                    />
                  </div>
                  <AreaField value={e.desc} onCommit={(desc) => updateElement(e.id, { desc })} rows={2} placeholder="Mô tả hệ…" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{usage.get(e.id) ?? 0} mục dùng hệ này</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="hover:text-destructive"
                      onClick={() =>
                        askConfirm({
                          title: `Xoá hệ “${e.name}”?`,
                          description: "Hệ sẽ được gỡ khỏi mọi mục và bảng khắc chế. Có thể hoàn tác bằng Ctrl+Z.",
                          confirmLabel: "Xoá",
                          destructive: true,
                          onConfirm: () => deleteElement(e.id),
                        })
                      }
                    >
                      <Trash2 /> Xoá
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">Khắc chế ({counters.length})</h2>
          <span className="text-xs text-muted-foreground">Bấm ô: hệ ở hàng khắc hệ ở cột</span>
        </div>
        <CounterMatrix />
      </section>
    </div>
  );
}
