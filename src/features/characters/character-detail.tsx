"use client";

import { useState } from "react";
import { ImageOff, Minimize2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AreaField, ChoiceField, FieldLabel, InlineName, SelectField, Tag, TextField } from "@/components/kit/fields";
import { useLookups, useNav } from "@/hooks/use-lookups";
import { ART_PROGRESS, DOMAIN_USAGE_LEVELS, GENDERS } from "@/lib/catalog";
import { genId } from "@/lib/id";
import { createEntity, type Character } from "@/lib/schema/world";
import { useWorldStore } from "@/store/world-store";
import { RelationshipEditor } from "./relationship-editor";
import { STATUS_META, defaultAccent } from "./meta";

const STATUS_OPTIONS = (Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k) => ({
  value: k,
  label: STATUS_META[k].label,
  icon: STATUS_META[k].symbol,
}));

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="grid gap-2 rounded-xl border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImageField({ c }: { c: Character }) {
  const updateItem = useWorldStore((s) => s.updateItem);
  const [url, setUrl] = useState("");
  const setImage = (cardImage: string) => updateItem("characters", c.id, { cardImage });
  return (
    <div className="grid gap-2">
      <FieldLabel>🖼 Ảnh nhân vật</FieldLabel>
      {c.cardImage ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cardImage} alt={c.name} className="max-h-64 w-full object-cover" />
          <Button variant="secondary" size="xs" className="absolute top-2 right-2" onClick={() => setImage("")}>
            <ImageOff /> Gỡ ảnh
          </Button>
        </div>
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => url.trim() && (setImage(url.trim()), setUrl(""))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Dán URL ảnh (https://…)"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      )}
    </div>
  );
}

/** Realm names from every power system, for the cultivation suggestion list. */
function useRealmNames() {
  const { era } = useLookups();
  return era.powerSystems.flatMap((ps) =>
    [...ps.majorRealms].sort((a, b) => a.order - b.order).flatMap((mr) => [mr.name, ...mr.subRealms.map((s) => s.name)]),
  );
}

function ArtsTable({ c }: { c: Character }) {
  const { era } = useLookups();
  const nav = useNav();
  const updateItem = useWorldStore((s) => s.updateItem);
  const addItem = useWorldStore((s) => s.addItem);
  const owned = era.cultivationArts.filter((a) => a.ownerIds.includes(c.id));
  const available = era.cultivationArts.filter((a) => !a.ownerIds.includes(c.id));

  const setCharData = (artId: string, patch: { progress?: string; chapter?: string }) =>
    updateItem("cultivationArts", artId, (a) => ({
      ...a,
      charData: { ...a.charData, [c.id]: { ...(a.charData[c.id] ?? { progress: "", chapter: "" }), ...patch } },
    }));

  return (
    <Section
      title={`Công pháp tu luyện (${owned.length})`}
      action={
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            const art = createEntity("cultivationArts", { ownerIds: [c.id] });
            addItem("cultivationArts", art);
            nav.item("arts", art.id);
          }}
        >
          <Plus /> Tạo mới
        </Button>
      }
    >
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && updateItem("cultivationArts", e.target.value, (a) => ({ ...a, ownerIds: [...a.ownerIds, c.id] }))}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-muted-foreground dark:bg-input/30"
          aria-label="Thêm công pháp có sẵn"
        >
          <option value="">+ Chọn công pháp có sẵn</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      {owned.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Chưa tu luyện công pháp nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] text-muted-foreground uppercase">
              <tr>
                <th className="py-1 font-semibold">Tên công pháp</th>
                <th className="py-1 font-semibold">Tiến độ</th>
                <th className="py-1 font-semibold">Chương</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {owned.map((a) => {
                const d = a.charData[c.id];
                return (
                  <tr key={a.id} className="border-t">
                    <td className="py-1.5 pr-2">
                      <button type="button" className="font-medium hover:text-primary hover:underline" onClick={() => nav.item("arts", a.id)}>
                        {a.name}
                      </button>
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={d?.progress ?? ""}
                        onChange={(e) => setCharData(a.id, { progress: e.target.value })}
                        className="h-7 rounded-md border border-input bg-transparent px-1 text-xs dark:bg-input/30"
                        aria-label={`Tiến độ ${a.name}`}
                      >
                        <option value="">—</option>
                        {ART_PROGRESS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        defaultValue={d?.chapter ?? ""}
                        onBlur={(e) => e.target.value !== (d?.chapter ?? "") && setCharData(a.id, { chapter: e.target.value })}
                        className="h-7 w-16 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
                        aria-label={`Chương ${a.name}`}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Gỡ ${a.name}`}
                        onClick={() => updateItem("cultivationArts", a.id, (x) => ({ ...x, ownerIds: x.ownerIds.filter((id) => id !== c.id) }))}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function OwnedList({ c, kind }: { c: Character; kind: "treasures" | "skills" }) {
  const { era } = useLookups();
  const nav = useNav();
  const updateItem = useWorldStore((s) => s.updateItem);
  const items =
    kind === "treasures" ? era.treasures.filter((t) => t.ownerId === c.id) : era.skills.filter((s) => s.ownerIds.includes(c.id));
  if (items.length === 0) return null;
  return (
    <Section title={kind === "treasures" ? `Pháp bảo sở hữu (${items.length})` : `Thần thông sở hữu (${items.length})`}>
      <ul className="grid gap-1.5">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 text-sm">
            <button type="button" className="flex-1 truncate text-left font-medium hover:text-primary hover:underline" onClick={() => nav.item(kind, it.id)}>
              {kind === "treasures" ? "⚔️" : "⚡"} {it.name}
            </button>
            <span className="text-xs text-muted-foreground">Chương</span>
            <input
              defaultValue={it.acquiredChapter}
              onBlur={(e) => e.target.value !== it.acquiredChapter && updateItem(kind, it.id, { acquiredChapter: e.target.value })}
              className="h-7 w-16 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
              aria-label={`Chương thu được ${it.name}`}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function DomainBlock({ c }: { c: Character }) {
  const { era } = useLookups();
  const nav = useNav();
  const updateItem = useWorldStore((s) => s.updateItem);
  const domain = era.domains.find((d) => d.ownerId === c.id);
  if (!domain) return null;
  const setUsages = (usages: typeof domain.usages) => updateItem("domains", domain.id, { usages });

  return (
    <Section
      title="Lĩnh vực"
      action={
        <Button variant="ghost" size="xs" onClick={() => setUsages([...domain.usages, { id: genId("u"), usageLevel: "", chapter: "" }])}>
          <Plus /> Thêm lần dùng
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        <button type="button" className="font-semibold hover:text-primary hover:underline" onClick={() => nav.item("domains", domain.id)}>
          🌀 {domain.name}
        </button>
        {domain.completionLevel && <Tag>{domain.completionLevel}</Tag>}
      </div>
      {domain.usages.map((u) => (
        <div key={u.id} className="flex items-center gap-1.5">
          <select
            value={u.usageLevel}
            onChange={(e) => setUsages(domain.usages.map((x) => (x.id === u.id ? { ...x, usageLevel: e.target.value } : x)))}
            className="h-7 flex-1 rounded-md border border-input bg-transparent px-1 text-xs dark:bg-input/30"
            aria-label="Mức khai triển"
          >
            <option value="">— Mức khai triển —</option>
            {DOMAIN_USAGE_LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input
            defaultValue={u.chapter}
            placeholder="Chương"
            onBlur={(e) => setUsages(domain.usages.map((x) => (x.id === u.id ? { ...x, chapter: e.target.value } : x)))}
            className="h-7 w-20 rounded-md border border-input bg-transparent px-1.5 text-xs dark:bg-input/30"
            aria-label="Chương khai triển"
          />
          <Button variant="ghost" size="icon-xs" aria-label="Xoá lần dùng" onClick={() => setUsages(domain.usages.filter((x) => x.id !== u.id))}>
            <Trash2 />
          </Button>
        </div>
      ))}
    </Section>
  );
}

export function CharacterDetail({ character: c, onCollapse, onDelete }: { character: Character; onCollapse: () => void; onDelete: () => void }) {
  const lookups = useLookups();
  const nav = useNav();
  const updateItem = useWorldStore((s) => s.updateItem);
  const [renaming, setRenaming] = useState(false);
  const realmNames = useRealmNames();
  const set = (patch: Partial<Character>) => updateItem("characters", c.id, patch);

  const { era } = lookups;
  const location = era.worldStructure.find((l) => l.id === c.locationId);
  const factionOptions = (location ? [location] : era.worldStructure).flatMap((l) =>
    l.factions.map((f) => ({ value: f.id, label: location ? f.name : `${f.name} (${l.name})` })),
  );
  const race = lookups.raceById.get(c.raceId);
  const status = STATUS_META[c.status];
  const accent = defaultAccent(c);
  const datalistId = `realms-${c.id}`;

  return (
    <article
      className="col-span-full grid gap-4 rounded-2xl border-2 bg-card p-4 sm:p-5"
      style={{ borderColor: `color-mix(in oklch, ${accent} 60%, transparent)` }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-black text-white" style={{ background: accent }}>
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <InlineName value={c.name} onCommit={(name) => set({ name })} editing={renaming} setEditing={setRenaming} className="block text-xl font-extrabold italic" />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <button type="button" className="hover:text-primary hover:underline" onClick={() => location && nav.location(location.id)}>
              📍 {location?.name ?? "Ngoại giới"}
            </button>
            <button type="button" className="hover:text-primary hover:underline" onClick={() => c.factionId && nav.faction(c.factionId)}>
              🏯 {lookups.factionName(c.factionId) ?? "Tán tu"}
            </button>
            {c.cultivation && <span>⚡ {c.cultivation}</span>}
            {c.firstChapter && <span>📖 Chương {c.firstChapter}</span>}
            {race && (
              <button type="button" className="hover:text-primary hover:underline" onClick={() => nav.race(race.id)}>
                {race.emoji} {race.name}
              </button>
            )}
            <Tag className={status.className}>
              {status.symbol} {status.label}
            </Tag>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onCollapse}>
            <Minimize2 /> Thu gọn
          </Button>
          <Button variant="ghost" size="icon-sm" className="hover:text-destructive" aria-label={`Xoá ${c.name}`} onClick={onDelete}>
            <Trash2 />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {/* Left: facts */}
        <div className="grid content-start gap-3">
          <ImageField c={c} />
          <TextField label="✦ Biệt danh" value={c.nickname} onCommit={(nickname) => set({ nickname })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Vùng đất sở tại"
              value={c.locationId}
              onChange={(locationId) => set({ locationId, factionId: "" })}
              options={era.worldStructure.map((l) => ({ value: l.id, label: l.name }))}
              placeholder="Ngoại giới"
            />
            <SelectField
              label="Thế lực trực thuộc"
              value={c.factionId}
              onChange={(factionId) => set({ factionId })}
              options={factionOptions}
              placeholder="Chưa gia nhập"
            />
            <div className="grid gap-1">
              <TextField label="⚡ Tu vi" value={c.cultivation} onCommit={(cultivation) => set({ cultivation })} placeholder="Tên cảnh giới" />
              {realmNames.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && set({ cultivation: e.target.value })}
                  className="h-7 rounded-md border border-input bg-transparent px-1 text-xs text-muted-foreground dark:bg-input/30"
                  aria-label="Chọn cảnh giới có sẵn"
                  id={datalistId}
                >
                  <option value="">↳ Chọn từ hệ thống cảnh giới</option>
                  {era.powerSystems.map((ps) => (
                    <optgroup key={ps.id} label={ps.name}>
                      {[...ps.majorRealms]
                        .sort((a, b) => a.order - b.order)
                        .flatMap((mr) => [
                          <option key={mr.id} value={mr.name}>
                            {mr.name}
                            {mr.tier && mr.tier !== mr.name ? ` (${mr.tier})` : ""}
                          </option>,
                          ...mr.subRealms.map((sr) => (
                            <option key={sr.id} value={sr.name}>
                              {"  ↳ "}
                              {sr.name}
                            </option>
                          )),
                        ])}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
            <SelectField
              label="🧬 Chủng tộc"
              value={c.raceId}
              onChange={(raceId) => set({ raceId })}
              options={era.races.map((r) => ({ value: r.id, label: r.name, icon: r.emoji }))}
              placeholder="— Chưa gán —"
            />
            <TextField label="⏳ Tuổi tác" value={c.age} onCommit={(age) => set({ age })} />
            <TextField label="📖 Chương xuất hiện" value={c.firstChapter} onCommit={(firstChapter) => set({ firstChapter })} />
          </div>
          <ChoiceField label="◎ Tình trạng" value={c.status} onChange={(v) => set({ status: (v || "alive") as Character["status"] })} options={STATUS_OPTIONS} />
          <ChoiceField label="⚧ Giới tính" value={c.gender} onChange={(gender) => set({ gender })} options={GENDERS} />
          <RelationshipEditor character={c} />
        </div>

        {/* Right: narrative + possessions */}
        <div className="grid content-start gap-3">
          <AreaField label="Bối cảnh hiện hữu" value={c.context} onCommit={(context) => set({ context })} />
          <AreaField label="Thân phận bề nổi" value={c.currentIdentity} onCommit={(currentIdentity) => set({ currentIdentity })} />
          <AreaField
            label="Bí mật / Duyên khởi"
            value={c.hiddenIdentity}
            onCommit={(hiddenIdentity) => set({ hiddenIdentity })}
            className="rounded-lg border border-dashed p-2"
          />
          <AreaField label="Ngoại hình" value={c.appearance} onCommit={(appearance) => set({ appearance })} />
          <AreaField label="Ngữ lục / Quote" value={c.quotes} onCommit={(quotes) => set({ quotes })} />
          <ArtsTable c={c} />
          <OwnedList c={c} kind="treasures" />
          <OwnedList c={c} kind="skills" />
          <DomainBlock c={c} />
        </div>
      </div>
    </article>
  );
}
