"use client";

import { useState } from "react";
import { Flame as FlameIcon, Plus, X } from "lucide-react";
import { AreaField, FieldLabel, SelectField, Tag, TextField } from "@/components/kit/fields";
import { CollectionView, type CollectionConfig, type EditorProps } from "@/components/kit/collection-view";
import { PageHeader } from "@/components/kit/page";
import { useUrlState } from "@/hooks/use-url-state";
import {
  FLAME_TYPES,
  FURNACE_RANKS,
  INGREDIENT_RARITY,
  PILL_DIFFICULTY,
  PILL_RANKS,
  PILL_TYPES,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/text";
import type { Flame, Furnace, Ingredient, Pill, Recipe } from "@/lib/schema/world";
import { useActiveEra } from "@/store/world-store";

const opt = (values: string[]) => values.map((v) => ({ value: v, label: v }));
const iconOf = (options: { value: string; icon?: string }[], v: string) => options.find((o) => o.value === v)?.icon;

const TABS = [
  { key: "pills", label: "Đan Dược", icon: "⚗️", collection: "pills" },
  { key: "ingredients", label: "Nguyên Liệu", icon: "🌿", collection: "ingredients" },
  { key: "recipes", label: "Đan Phương", icon: "📜", collection: "recipes" },
  { key: "furnaces", label: "Lò Luyện", icon: "🏺", collection: "furnaces" },
  { key: "flames", label: "Lửa Luyện", icon: "🔥", collection: "flames" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** Tab switch that also clears search/open state of the previous tab. */
function useTab(): [TabKey, (t: TabKey, open?: string) => void] {
  const [tab] = useUrlState("tab", "pills");
  const set = (t: TabKey, open?: string) => {
    const sp = new URLSearchParams();
    if (t !== "pills") sp.set("tab", t);
    if (open) sp.set("open", open);
    const qs = sp.toString();
    window.history.pushState(null, "", qs ? `/pills?${qs}` : "/pills");
  };
  return [(TABS.some((x) => x.key === tab) ? tab : "pills") as TabKey, set];
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">{children}</div>;
}
function Col({ children }: { children: React.ReactNode }) {
  return <div className="grid content-start gap-3">{children}</div>;
}

function LinkChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20"
    >
      {children}
    </button>
  );
}

const PILL_RANK_TONE = (rank: string) => {
  const i = PILL_RANKS.indexOf(rank);
  if (i < 0) return undefined;
  const tones = [
    "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  ];
  return tones[Math.min(tones.length - 1, Math.floor(i / 1.5))];
};

/* ───────────── Pills ───────────── */

function PillEditor({ item, update, lookups }: EditorProps<Pill>) {
  const [, setTab] = useTab();
  const recipe = lookups.era.recipes.find((r) => r.id === item.recipeId);
  return (
    <Grid>
      <Col>
        <SelectField label="Phẩm cấp" value={item.rank} onChange={(rank) => update({ rank })} options={opt(PILL_RANKS)} />
        <SelectField label="Loại" value={item.type} onChange={(type) => update({ type })} options={PILL_TYPES} />
        <SelectField label="Độ khó luyện" value={item.difficulty} onChange={(difficulty) => update({ difficulty })} options={opt(PILL_DIFFICULTY)} />
        <SelectField
          label="🔥 Người luyện chế"
          value={item.refineBy}
          onChange={(refineBy) => update({ refineBy })}
          options={lookups.characterOptions}
        />
        <SelectField
          label="Người sở hữu"
          value={item.ownerId}
          onChange={(ownerId) => update({ ownerId })}
          options={lookups.characterOptions}
        />
        <TextField label="⏱️ Thời gian tác dụng" value={item.duration} onCommit={(duration) => update({ duration })} />
        <TextField label="📖 Chương xuất hiện" value={item.acquiredChapter} onCommit={(acquiredChapter) => update({ acquiredChapter })} />
        <div className="grid gap-1">
          <FieldLabel>📜 Đan phương</FieldLabel>
          {recipe ? (
            <div className="flex items-center gap-2">
              <LinkChip onClick={() => setTab("recipes", recipe.id)}>📜 {recipe.name}</LinkChip>
              <button type="button" onClick={() => update({ recipeId: "" })} className="text-xs text-muted-foreground hover:text-destructive">
                ✕ Gỡ liên kết
              </button>
            </div>
          ) : (
            <SelectField
              value=""
              onChange={(recipeId) => update({ recipeId })}
              options={lookups.era.recipes.map((r) => ({ value: r.id, label: r.name }))}
              placeholder="— Chọn đan phương —"
            />
          )}
        </div>
      </Col>
      <Col>
        <AreaField label="Mô tả / Xuất xứ" value={item.description} onCommit={(description) => update({ description })} />
        <AreaField label="Công hiệu / Tác dụng" value={item.effect} onCommit={(effect) => update({ effect })} />
        <AreaField label="Phụ tác dụng / Cấm kị" value={item.sideEffect} onCommit={(sideEffect) => update({ sideEffect })} />
      </Col>
    </Grid>
  );
}

const pillsConfig: CollectionConfig<"pills"> = {
  collection: "pills",
  icon: FlameIcon,
  title: "Đan Dược",
  noun: "đan dược",
  emoji: (p) => iconOf(PILL_TYPES, p.type) ?? "⚗️",
  addLabel: "Thêm đan dược",
  renameOnCreate: true,
  searchFields: (p) => [p.rank, p.type],
  filter: { label: "Loại", options: PILL_TYPES, test: (p, v) => p.type === v },
  sorts: [
    { key: "name", label: "Tên", value: (p) => p.name },
    { key: "rank", label: "Phẩm", value: (p) => PILL_RANKS.indexOf(p.rank) },
  ],
  summary: (p, { charName, era }) => (
    <>
      {p.rank && <Tag className={PILL_RANK_TONE(p.rank)}>{p.rank}</Tag>}
      {p.type && <Tag>{iconOf(PILL_TYPES, p.type)} {p.type}</Tag>}
      {p.refineBy && charName(p.refineBy) && <span>🔥 {charName(p.refineBy)}</span>}
      {p.recipeId && <span>📜 {era.recipes.find((r) => r.id === p.recipeId)?.name}</span>}
    </>
  ),
  Editor: PillEditor,
};

/* ───────────── Ingredients ───────────── */

function IngredientEditor({ item, update, lookups }: EditorProps<Ingredient>) {
  const [, setTab] = useTab();
  const usedIn = lookups.era.recipes.filter((r) => r.ingredientIds.includes(item.id));
  return (
    <Grid>
      <Col>
        <SelectField label="Độ hiếm" value={item.rarity} onChange={(rarity) => update({ rarity })} options={INGREDIENT_RARITY} />
        <div className="grid gap-1">
          <FieldLabel>📜 Dùng trong đan phương</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {usedIn.length ? (
              usedIn.map((r) => (
                <LinkChip key={r.id} onClick={() => setTab("recipes", r.id)}>
                  📜 {r.name}
                </LinkChip>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">Chưa được dùng</span>
            )}
          </div>
        </div>
      </Col>
      <Col>
        <AreaField label="🧭 Cách thu thập" value={item.collectMethod} onCommit={(collectMethod) => update({ collectMethod })} />
        <AreaField label="👁️ Hình dáng" value={item.appearance} onCommit={(appearance) => update({ appearance })} />
        <AreaField label="Lưu ý khi thu thập" value={item.collectNote} onCommit={(collectNote) => update({ collectNote })} />
      </Col>
    </Grid>
  );
}

const ingredientsConfig: CollectionConfig<"ingredients"> = {
  collection: "ingredients",
  icon: FlameIcon,
  title: "Nguyên Liệu",
  noun: "nguyên liệu",
  emoji: (i) => iconOf(INGREDIENT_RARITY, i.rarity) ?? "🌿",
  addLabel: "Thêm nguyên liệu",
  renameOnCreate: true,
  filter: { label: "Độ hiếm", options: INGREDIENT_RARITY, test: (i, v) => i.rarity === v },
  sorts: [{ key: "name", label: "Tên", value: (i) => i.name }],
  summary: (i, { era }) => {
    const n = era.recipes.filter((r) => r.ingredientIds.includes(i.id)).length;
    return (
      <>
        {i.rarity && <Tag>{iconOf(INGREDIENT_RARITY, i.rarity)} {i.rarity}</Tag>}
        {n > 0 && <span>📜 Dùng trong {n} đan phương</span>}
      </>
    );
  },
  Editor: IngredientEditor,
};

/* ───────────── Recipes ───────────── */

function IngredientPicker({ recipe, update }: { recipe: Recipe; update: (p: Partial<Recipe>) => void }) {
  const era = useActiveEra();
  const [, setTab] = useTab();
  const [query, setQuery] = useState("");
  const byId = new Map(era.ingredients.map((i) => [i.id, i]));
  const results = query.trim()
    ? era.ingredients.filter((i) => !recipe.ingredientIds.includes(i.id) && matches(query, i.name)).slice(0, 8)
    : [];

  return (
    <div className="grid gap-1.5">
      <FieldLabel>🌿 Nguyên liệu ({recipe.ingredientIds.length})</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {recipe.ingredientIds.map((id) => {
          const ing = byId.get(id);
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
              <button type="button" className="hover:underline" onClick={() => ing && setTab("ingredients", id)}>
                🌿 {ing?.name ?? "(đã xoá)"}
                {ing?.rarity && <span className="text-muted-foreground"> ({ing.rarity})</span>}
              </button>
              <button
                type="button"
                aria-label="Gỡ nguyên liệu"
                onClick={() => update({ ingredientIds: recipe.ingredientIds.filter((x) => x !== id) })}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
      </div>
      {era.ingredients.length === 0 ? (
        <button type="button" onClick={() => setTab("ingredients")} className="text-left text-xs text-primary hover:underline">
          Chưa có nguyên liệu. Thêm nguyên liệu →
        </button>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên nguyên liệu để thêm…"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          {results.length > 0 && (
            <ul className="grid gap-1 rounded-lg border p-1">
              {results.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                  <span>
                    🌿 {i.name} {i.rarity && <span className="text-xs text-muted-foreground">({i.rarity})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      update({ ingredientIds: [...recipe.ingredientIds, i.id] });
                      setQuery("");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Plus className="size-3" /> Thêm
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function RecipeEditor({ item, update, lookups }: EditorProps<Recipe>) {
  const [, setTab] = useTab();
  const pill = lookups.era.pills.find((p) => p.recipeId === item.id);
  return (
    <Grid>
      <Col>
        <TextField label="✨ Phẩm cấp" value={item.rarity} onCommit={(rarity) => update({ rarity })} placeholder="VD: Tam Phẩm" />
        <TextField label="Tác giả / Người tạo" value={item.creator} onCommit={(creator) => update({ creator })} />
        <IngredientPicker recipe={item} update={update} />
        <div className="grid gap-1">
          <FieldLabel>⚗️ Đan dược tạo ra</FieldLabel>
          {pill ? (
            <div>
              <LinkChip onClick={() => setTab("pills", pill.id)}>⚗️ {pill.name}</LinkChip>
            </div>
          ) : (
            <button type="button" onClick={() => setTab("pills")} className="text-left text-xs text-muted-foreground hover:text-primary">
              Chưa có đan dược nào dùng đan phương này — liên kết ở tab Đan Dược →
            </button>
          )}
        </div>
      </Col>
      <Col>
        <AreaField label="⚗️ Quy trình luyện chế" value={item.method} onCommit={(method) => update({ method })} rows={5} />
        <AreaField label="Lưu ý / Bí quyết" value={item.note} onCommit={(note) => update({ note })} />
      </Col>
    </Grid>
  );
}

const recipesConfig: CollectionConfig<"recipes"> = {
  collection: "recipes",
  icon: FlameIcon,
  title: "Đan Phương",
  noun: "đan phương",
  emoji: "📜",
  addLabel: "Thêm đan phương",
  renameOnCreate: true,
  searchFields: (r) => [r.creator],
  sorts: [
    { key: "name", label: "Tên", value: (r) => r.name },
    { key: "ing", label: "Số nguyên liệu", value: (r) => r.ingredientIds.length },
  ],
  summary: (r, { era }) => {
    const pill = era.pills.find((p) => p.recipeId === r.id);
    return (
      <>
        {r.rarity && <Tag>✨ {r.rarity}</Tag>}
        {r.creator && <span>✍️ {r.creator}</span>}
        <span>🌿 {r.ingredientIds.length} nguyên liệu</span>
        {pill && <span>⚗️ {pill.name}</span>}
      </>
    );
  },
  Editor: RecipeEditor,
};

/* ───────────── Furnaces & flames ───────────── */

function FurnaceEditor({ item, update }: EditorProps<Furnace>) {
  return (
    <Grid>
      <Col>
        <SelectField label="Phẩm cấp" value={item.rank} onChange={(rank) => update({ rank })} options={FURNACE_RANKS} />
        <TextField label="Người chế tạo" value={item.madeBy} onCommit={(madeBy) => update({ madeBy })} />
      </Col>
      <Col>
        <AreaField label="Hỗ trợ luyện đan sư" value={item.support} onCommit={(support) => update({ support })} />
      </Col>
    </Grid>
  );
}

const furnacesConfig: CollectionConfig<"furnaces"> = {
  collection: "furnaces",
  icon: FlameIcon,
  title: "Lò Luyện",
  noun: "lò luyện",
  emoji: "🏺",
  addLabel: "Thêm lò luyện",
  renameOnCreate: true,
  filter: { label: "Phẩm", options: FURNACE_RANKS, test: (f, v) => f.rank === v },
  summary: (f) => (
    <>
      {f.rank && <Tag>{iconOf(FURNACE_RANKS, f.rank)} {f.rank}</Tag>}
      {f.madeBy && <span>🔨 {f.madeBy}</span>}
    </>
  ),
  Editor: FurnaceEditor,
};

function FlameEditor({ item, update, lookups }: EditorProps<Flame>) {
  return (
    <Grid>
      <Col>
        <SelectField label="Loại lửa" value={item.flameType} onChange={(flameType) => update({ flameType })} options={FLAME_TYPES} />
        <SelectField label="Chủ nhân" value={item.ownerId} onChange={(ownerId) => update({ ownerId })} options={lookups.characterOptions} />
      </Col>
      <Col>
        <AreaField label="Đặc tính lửa" value={item.trait} onCommit={(trait) => update({ trait })} />
      </Col>
    </Grid>
  );
}

const flamesConfig: CollectionConfig<"flames"> = {
  collection: "flames",
  icon: FlameIcon,
  title: "Lửa Luyện",
  noun: "lửa luyện",
  emoji: (f) => iconOf(FLAME_TYPES, f.flameType) ?? "🔥",
  addLabel: "Thêm lửa luyện",
  renameOnCreate: true,
  filter: { label: "Loại", options: FLAME_TYPES, test: (f, v) => f.flameType === v },
  summary: (f, { charName }) => (
    <>
      {f.flameType && <Tag>{iconOf(FLAME_TYPES, f.flameType)} {f.flameType}</Tag>}
      {f.ownerId && charName(f.ownerId) && <span>👤 {charName(f.ownerId)}</span>}
    </>
  ),
  Editor: FlameEditor,
};

/* ───────────── Page ───────────── */

export function AlchemyView() {
  const era = useActiveEra();
  const [tab, setTab] = useTab();

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader icon={FlameIcon} title="Đan Dược" subtitle="Đan dược, nguyên liệu, đan phương, lò và lửa luyện" />
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon} {t.label}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{era[t.collection].length}</span>
          </button>
        ))}
      </div>
      {tab === "pills" && <CollectionView key="pills" config={pillsConfig} headless />}
      {tab === "ingredients" && <CollectionView key="ingredients" config={ingredientsConfig} headless />}
      {tab === "recipes" && <CollectionView key="recipes" config={recipesConfig} headless />}
      {tab === "furnaces" && <CollectionView key="furnaces" config={furnacesConfig} headless />}
      {tab === "flames" && <CollectionView key="flames" config={flamesConfig} headless />}
    </div>
  );
}
