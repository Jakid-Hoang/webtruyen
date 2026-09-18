"use client";

import { BookOpen, Sparkles, Sword, Zap } from "lucide-react";
import { AreaField, MultiRefField, SelectField, Tag, TextField } from "@/components/kit/fields";
import { CollectionView, type CollectionConfig, type EditorProps } from "@/components/kit/collection-view";
import { useNav } from "@/hooks/use-lookups";
import {
  ART_DIFFICULTY,
  ART_GRADES,
  DOMAIN_COMPLETION,
  POWER_LEVELS,
  SKILL_TYPES,
  TREASURE_TYPES,
  gradeTone,
} from "@/lib/catalog";
import type { CultivationArt, Domain, Skill, Treasure } from "@/lib/schema/world";

const opt = (values: string[]) => values.map((v) => ({ value: v, label: v }));
const iconOf = (options: { value: string; icon?: string }[], v: string) => options.find((o) => o.value === v)?.icon ?? "✦";

const DIFFICULTY_TONE: Record<string, string> = {
  Dễ: "text-emerald-600 dark:text-emerald-400",
  "Trung bình": "text-amber-600 dark:text-amber-400",
  Khó: "text-orange-600 dark:text-orange-400",
  "Cực hạn": "text-rose-600 dark:text-rose-400",
};

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">{children}</div>;
}
function Col({ children }: { children: React.ReactNode }) {
  return <div className="grid content-start gap-3">{children}</div>;
}

function OwnerNames({ ids, charName }: { ids: string[]; charName: (id: string) => string | undefined }) {
  const names = ids.map(charName).filter(Boolean);
  return names.length ? <span>👤 {names.join(", ")}</span> : <span className="italic">Chưa có chủ</span>;
}

/* ───────────── Công pháp ───────────── */

function ArtEditor({ item, update, lookups }: EditorProps<CultivationArt>) {
  const nav = useNav();
  return (
    <Grid>
      <Col>
        <TextField label="Cấp hạng" value={item.rank} onCommit={(rank) => update({ rank })} placeholder="VD: Địa Giai Thượng Phẩm" />
        <TextField label="Hệ nguyên tố" value={item.element} onCommit={(element) => update({ element })} />
        <TextField label="📜 Nguồn gốc" value={item.origin} onCommit={(origin) => update({ origin })} />
        <SelectField label="Độ khó" value={item.difficulty} onChange={(difficulty) => update({ difficulty })} options={opt(ART_DIFFICULTY)} />
        <MultiRefField
          label="Người tu luyện"
          values={item.ownerIds}
          onChange={(ownerIds) => update({ ownerIds })}
          options={lookups.characterOptions}
          addLabel="+ Thêm người tu luyện"
          onChipClick={(id) => nav.characterById(id)}
        />
      </Col>
      <Col>
        <AreaField label="Mô tả / Xuất xứ" value={item.description} onCommit={(description) => update({ description })} />
        <AreaField label="Hiệu ứng / Uy lực" value={item.effect} onCommit={(effect) => update({ effect })} />
        <AreaField label="📖 Phương thức tu luyện" value={item.method} onCommit={(method) => update({ method })} />
      </Col>
    </Grid>
  );
}

const artsConfig: CollectionConfig<"cultivationArts"> = {
  collection: "cultivationArts",
  icon: BookOpen,
  title: "Công Pháp & Bí Kíp",
  noun: "công pháp",
  emoji: "📘",
  addLabel: "Thêm công pháp",
  searchFields: (a) => [a.rank, a.element, a.origin],
  filter: { label: "Cấp", options: opt(ART_GRADES), test: (a, v) => a.rank.includes(v) },
  sorts: [
    { key: "name", label: "Tên", value: (a) => a.name },
    { key: "rank", label: "Cấp", value: (a) => a.rank },
    { key: "owners", label: "Chủ", value: (a) => a.ownerIds.length },
  ],
  summary: (a) => (
    <>
      {a.rank && <Tag className={gradeTone(a.rank)}>{a.rank}</Tag>}
      {a.origin && <Tag>📜 {a.origin}</Tag>}
      {a.element && <Tag>⚡ {a.element}</Tag>}
      {a.difficulty && <Tag className={DIFFICULTY_TONE[a.difficulty]}>🔥 {a.difficulty}</Tag>}
      <span>{a.ownerIds.length} người tu luyện</span>
    </>
  ),
  Editor: ArtEditor,
};

/* ───────────── Pháp bảo ───────────── */

function TreasureEditor({ item, update, lookups }: EditorProps<Treasure>) {
  return (
    <Grid>
      <Col>
        <TextField label="Phẩm cấp" value={item.rank} onCommit={(rank) => update({ rank })} placeholder="VD: Thiên Giai" />
        <SelectField label="Loại" value={item.type} onChange={(type) => update({ type })} options={TREASURE_TYPES} />
        <SelectField label="Uy lực" value={item.power} onChange={(power) => update({ power })} options={opt(POWER_LEVELS)} />
        <SelectField
          label="Chủ nhân"
          value={item.ownerId}
          onChange={(ownerId) => update({ ownerId })}
          options={lookups.characterOptions}
          placeholder="— Chưa có chủ —"
        />
        <TextField label="📖 Chương thu được" value={item.acquiredChapter} onCommit={(acquiredChapter) => update({ acquiredChapter })} />
      </Col>
      <Col>
        <AreaField label="Mô tả / Xuất xứ" value={item.description} onCommit={(description) => update({ description })} />
        <AreaField label="Hiệu ứng / Công năng" value={item.effect} onCommit={(effect) => update({ effect })} />
      </Col>
    </Grid>
  );
}

const treasuresConfig: CollectionConfig<"treasures"> = {
  collection: "treasures",
  icon: Sword,
  title: "Pháp Bảo & Linh Khí",
  noun: "pháp bảo",
  emoji: (t) => iconOf(TREASURE_TYPES, t.type),
  addLabel: "Thêm pháp bảo",
  renameOnCreate: true,
  searchFields: (t) => [t.rank, t.type],
  filter: { label: "Loại", options: TREASURE_TYPES, test: (t, v) => t.type === v },
  sorts: [
    { key: "name", label: "Tên", value: (t) => t.name },
    { key: "rank", label: "Cấp", value: (t) => t.rank },
  ],
  summary: (t, { charName }) => (
    <>
      {t.rank && <Tag className={gradeTone(t.rank)}>{t.rank}</Tag>}
      {t.type && <Tag>{iconOf(TREASURE_TYPES, t.type)} {t.type}</Tag>}
      {t.power && <Tag>💥 {t.power}</Tag>}
      <OwnerNames ids={t.ownerId ? [t.ownerId] : []} charName={charName} />
    </>
  ),
  Editor: TreasureEditor,
};

/* ───────────── Thần thông ───────────── */

function SkillEditor({ item, update, lookups }: EditorProps<Skill>) {
  const nav = useNav();
  return (
    <Grid>
      <Col>
        <TextField label="Cấp hạng" value={item.rank} onCommit={(rank) => update({ rank })} placeholder="VD: Thần Giai" />
        <SelectField label="Loại" value={item.type} onChange={(type) => update({ type })} options={SKILL_TYPES} />
        <SelectField label="Uy lực" value={item.power} onChange={(power) => update({ power })} options={opt(POWER_LEVELS)} />
        <MultiRefField
          label="Người sở hữu"
          values={item.ownerIds}
          onChange={(ownerIds) => update({ ownerIds })}
          options={lookups.characterOptions}
          addLabel="+ Thêm người sở hữu"
          onChipClick={(id) => nav.characterById(id)}
        />
        <TextField label="📖 Chương thu được" value={item.acquiredChapter} onCommit={(acquiredChapter) => update({ acquiredChapter })} />
      </Col>
      <Col>
        <AreaField label="Mô tả / Xuất xứ" value={item.description} onCommit={(description) => update({ description })} />
        <AreaField label="Hiệu ứng / Công năng" value={item.effect} onCommit={(effect) => update({ effect })} />
        <AreaField label="Điều kiện kích hoạt" value={item.condition} onCommit={(condition) => update({ condition })} />
      </Col>
    </Grid>
  );
}

const skillsConfig: CollectionConfig<"skills"> = {
  collection: "skills",
  icon: Zap,
  title: "Thần Thông & Bí Kỹ",
  noun: "thần thông",
  emoji: (s) => iconOf(SKILL_TYPES, s.type),
  addLabel: "Thêm thần thông",
  renameOnCreate: true,
  searchFields: (s) => [s.rank, s.type],
  filter: { label: "Loại", options: SKILL_TYPES, test: (s, v) => s.type === v },
  sorts: [
    { key: "name", label: "Tên", value: (s) => s.name },
    { key: "rank", label: "Cấp", value: (s) => s.rank },
    { key: "owners", label: "Chủ", value: (s) => s.ownerIds.length },
  ],
  summary: (s, { charName }) => (
    <>
      {s.rank && <Tag className={gradeTone(s.rank)}>{s.rank}</Tag>}
      {s.type && <Tag>{iconOf(SKILL_TYPES, s.type)} {s.type}</Tag>}
      {s.power && <Tag>💥 {s.power}</Tag>}
      <OwnerNames ids={s.ownerIds} charName={charName} />
    </>
  ),
  Editor: SkillEditor,
};

/* ───────────── Lĩnh vực ───────────── */

const COMPLETION_TONE: Record<string, string> = {
  "Hoàn chỉnh": "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "Đang hoàn thiện": "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "Chưa hoàn chỉnh": "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
};

function DomainEditor({ item, update, lookups }: EditorProps<Domain>) {
  return (
    <Grid>
      <Col>
        <SelectField
          label="Chủ nhân"
          value={item.ownerId}
          onChange={(ownerId) => update({ ownerId })}
          options={lookups.characterOptions}
          placeholder="— Chưa có chủ —"
        />
        <SelectField
          label="Mức hoàn chỉnh"
          value={item.completionLevel}
          onChange={(completionLevel) => update({ completionLevel })}
          options={DOMAIN_COMPLETION}
        />
        <TextField label="📐 Phạm vi" value={item.size} onCommit={(size) => update({ size })} />
        <TextField label="📖 Chương xuất hiện" value={item.acquiredChapter} onCommit={(acquiredChapter) => update({ acquiredChapter })} />
        {item.usages.length > 0 && (
          <div className="grid gap-1 text-xs">
            <span className="font-semibold text-muted-foreground uppercase">Lần khai triển</span>
            {item.usages.map((u) => (
              <span key={u.id}>
                • {u.usageLevel || "?"} {u.chapter && `— chương ${u.chapter}`}
              </span>
            ))}
          </div>
        )}
      </Col>
      <Col>
        <AreaField label="Mô tả không gian" value={item.description} onCommit={(description) => update({ description })} />
        <AreaField label="Hiệu ứng / Quy tắc" value={item.effect} onCommit={(effect) => update({ effect })} />
        <AreaField label="Điểm yếu / Phá giải" value={item.weakness} onCommit={(weakness) => update({ weakness })} />
      </Col>
    </Grid>
  );
}

const domainsConfig: CollectionConfig<"domains"> = {
  collection: "domains",
  icon: Sparkles,
  title: "Bành Trướng Lãnh Địa",
  noun: "lĩnh vực",
  emoji: "🌀",
  addLabel: "Thêm lĩnh vực",
  renameOnCreate: true,
  filter: { label: "Mức", options: DOMAIN_COMPLETION, test: (d, v) => d.completionLevel === v },
  sorts: [{ key: "name", label: "Tên", value: (d) => d.name }],
  summary: (d, { charName }) => (
    <>
      {d.completionLevel && <Tag className={COMPLETION_TONE[d.completionLevel]}>{d.completionLevel}</Tag>}
      {d.size && <Tag>📐 {d.size}</Tag>}
      {d.acquiredChapter && <Tag>📖 Chương {d.acquiredChapter}</Tag>}
      <OwnerNames ids={d.ownerId ? [d.ownerId] : []} charName={charName} />
    </>
  ),
  Editor: DomainEditor,
};

export const ArtsView = () => <CollectionView config={artsConfig} />;
export const TreasuresView = () => <CollectionView config={treasuresConfig} />;
export const SkillsView = () => <CollectionView config={skillsConfig} />;
export const DomainsView = () => <CollectionView config={domainsConfig} />;
