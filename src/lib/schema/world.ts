import { z } from "zod";
import { genId } from "@/lib/id";

/*
 * The whole wiki is a single JSON document: { eras: Era[] }.
 * Every schema here is lenient: missing or malformed fields fall back to
 * defaults so that imported / AI-generated / older files still load.
 * Unknown keys are preserved (looseObject) so no data is lost on round-trip.
 *
 * Parsing `{}` with an entity schema yields a brand-new entity with a fresh id
 * and default values; see `createEntity`.
 */

const toStr = (v: unknown) => (typeof v === "number" ? String(v) : v);

const text = (fallback = "") => z.preprocess(toStr, z.string().catch(fallback));
const entityId = (prefix: string) => z.preprocess(toStr, z.string().min(1).catch(() => genId(prefix)));
const idList = () =>
  z
    .array(z.unknown())
    .catch([])
    .transform((a) => a.map(toStr).filter((x): x is string => typeof x === "string" && x.length > 0));
const num = (fallback = 0) => z.coerce.number().catch(fallback);

/** Array of objects; non-array becomes [], non-object entries are dropped. */
function list<T extends z.ZodType>(item: T) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
        .map((x) => item.parse(x) as z.output<T>),
    );
}

/* ───────────────────────── World ───────────────────────── */

export const factionSchema = z.looseObject({
  id: entityId("f"),
  name: text("Thế lực mới"),
  description: text(),
  factionCategory: text(),
  factionRank: text(),
});

export const locationSchema = z.looseObject({
  id: entityId("l"),
  name: text("Vùng đất mới"),
  summary: text(),
  factions: list(factionSchema),
});

/* ───────────────────────── Characters ───────────────────────── */

export const CHARACTER_STATUSES = ["alive", "dead", "hidden"] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

export const RELATION_GROUPS = ["family", "ally", "enemy"] as const;
export type RelationGroup = (typeof RELATION_GROUPS)[number];

export const relationshipSchema = z.looseObject({
  id: entityId("r"),
  targetId: text(),
  type: text(),
  group: z.enum(RELATION_GROUPS).catch("ally"),
  description: text(),
});

export const characterSchema = z.looseObject({
  id: entityId("c"),
  name: text("Nhân vật mới"),
  nickname: text(),
  locationId: text(),
  factionId: text(),
  raceId: text(),
  age: text(),
  gender: text(),
  status: z.enum(CHARACTER_STATUSES).catch("alive"),
  cultivation: text(),
  firstChapter: text(),
  context: text(),
  currentIdentity: text(),
  hiddenIdentity: text(),
  appearance: text(),
  quotes: text(),
  relationships: list(relationshipSchema),
  cardImage: text(),
  cardTheme: text("classic"),
  cardAccent: text(),
});

/* ───────────────────────── Arts, treasures, skills, domains ───────────────────────── */

export const artCharDataSchema = z.looseObject({ progress: text(), chapter: text() });

export const cultivationArtSchema = z.looseObject({
  id: entityId("ca"),
  name: text("Công pháp mới"),
  rank: text(),
  element: text(),
  origin: text(),
  difficulty: text(),
  method: text(),
  description: text(),
  effect: text(),
  ownerIds: idList(),
  charData: z.record(z.string(), artCharDataSchema).catch({}),
});

export const treasureSchema = z.looseObject({
  id: entityId("t"),
  name: text("Pháp bảo mới"),
  rank: text(),
  type: text(),
  power: text(),
  ownerId: text(),
  description: text(),
  effect: text(),
  acquiredChapter: text(),
});

export const skillSchema = z.looseObject({
  id: entityId("s"),
  name: text("Thần thông mới"),
  rank: text(),
  type: text(),
  power: text(),
  ownerIds: idList(),
  description: text(),
  effect: text(),
  condition: text(),
  acquiredChapter: text(),
});

export const domainUsageSchema = z.looseObject({
  id: entityId("u"),
  usageLevel: text(),
  chapter: text(),
});

export const domainSchema = z.looseObject({
  id: entityId("d"),
  name: text("Lĩnh vực mới"),
  ownerId: text(),
  size: text(),
  completionLevel: text(),
  description: text(),
  effect: text(),
  weakness: text(),
  acquiredChapter: text(),
  usages: list(domainUsageSchema),
});

/* ───────────────────────── Alchemy ───────────────────────── */

export const pillSchema = z.looseObject({
  id: entityId("p"),
  name: text("Đan dược mới"),
  rank: text(),
  type: text(),
  difficulty: text(),
  effect: text(),
  duration: text(),
  ownerId: text(),
  refineBy: text(),
  description: text(),
  sideEffect: text(),
  acquiredChapter: text(),
  recipeId: text(),
});

export const ingredientSchema = z.looseObject({
  id: entityId("ing"),
  name: text("Nguyên liệu mới"),
  rarity: text(),
  collectMethod: text(),
  appearance: text(),
  collectNote: text(),
});

export const recipeSchema = z.looseObject({
  id: entityId("rec"),
  name: text("Đan phương mới"),
  rarity: text(),
  creator: text(),
  ingredientIds: idList(),
  method: text(),
  note: text(),
});

export const furnaceSchema = z.looseObject({
  id: entityId("fur"),
  name: text("Lò luyện mới"),
  rank: text(),
  madeBy: text(),
  support: text(),
});

export const flameSchema = z.looseObject({
  id: entityId("flm"),
  name: text("Lửa luyện mới"),
  flameType: text(),
  ownerId: text(),
  trait: text(),
});

/* ───────────────────────── Realms (power systems) ───────────────────────── */

const realmFields = {
  order: num(0),
  powerIndex: text(),
  description: text(),
  breakthroughReq: text(),
  combatTraits: text(),
  lifespan: text(),
  abilities: text(),
  cultivationReq: text(),
  lightningTribs: text(),
  lightningDesc: text(),
  notes: text(),
};

export const subRealmSchema = z.looseObject({
  id: entityId("sr"),
  name: text("Tiểu cảnh giới mới"),
  ...realmFields,
});

export const majorRealmSchema = z.looseObject({
  id: entityId("mr"),
  name: text("Đại cảnh giới mới"),
  tier: text(),
  ...realmFields,
  subRealms: list(subRealmSchema),
});

export const powerSystemSchema = z.looseObject({
  id: entityId("ps"),
  name: text("Phương thức tu hành mới"),
  description: text(),
  majorRealms: list(majorRealmSchema),
});

/** Legacy flat realm list (older files). Kept for compatibility only. */
export const legacyRealmSchema = z.looseObject({ id: entityId("rl"), name: text("Cảnh giới mới") });

/* ───────────────────────── Races ───────────────────────── */

export const RACE_REL_TYPES = ["ally", "enemy", "prey", "predator"] as const;

export const raceRelationSchema = z.looseObject({
  id: entityId("rr"),
  targetRaceId: text(),
  relType: z.enum(RACE_REL_TYPES).catch("ally"),
  note: text(),
});

export const raceSchema = z.looseObject({
  id: entityId("race"),
  name: text("Chủng tộc mới"),
  alias: text(),
  emoji: text("🧬"),
  summary: text(),
  biology: text(),
  genders: z.array(z.string()).catch([]),
  habitat: text(),
  lifespan: text(),
  naturalAbility: text(),
  easyToLearn: text(),
  weaknesses: text(),
  relations: list(raceRelationSchema),
});

/* ───────────────────────── Era & world ───────────────────────── */

export const eraSchema = z.looseObject({
  id: z.preprocess(toStr, z.string().min(1)),
  name: z.preprocess(toStr, z.string().min(1)),
  worldStructure: list(locationSchema),
  characters: list(characterSchema),
  cultivationArts: list(cultivationArtSchema),
  treasures: list(treasureSchema),
  skills: list(skillSchema),
  domains: list(domainSchema),
  pills: list(pillSchema),
  ingredients: list(ingredientSchema),
  recipes: list(recipeSchema),
  furnaces: list(furnaceSchema),
  flames: list(flameSchema),
  realms: list(legacyRealmSchema),
  races: list(raceSchema),
  powerSystems: list(powerSystemSchema),
});

export const worldSchema = z.looseObject({ eras: z.array(z.unknown()) });

export type Faction = z.output<typeof factionSchema>;
export type Location = z.output<typeof locationSchema>;
export type Relationship = z.output<typeof relationshipSchema>;
export type Character = z.output<typeof characterSchema>;
export type CultivationArt = z.output<typeof cultivationArtSchema>;
export type Treasure = z.output<typeof treasureSchema>;
export type Skill = z.output<typeof skillSchema>;
export type Domain = z.output<typeof domainSchema>;
export type DomainUsage = z.output<typeof domainUsageSchema>;
export type Pill = z.output<typeof pillSchema>;
export type Ingredient = z.output<typeof ingredientSchema>;
export type Recipe = z.output<typeof recipeSchema>;
export type Furnace = z.output<typeof furnaceSchema>;
export type Flame = z.output<typeof flameSchema>;
export type PowerSystem = z.output<typeof powerSystemSchema>;
export type MajorRealm = z.output<typeof majorRealmSchema>;
export type SubRealm = z.output<typeof subRealmSchema>;
export type Race = z.output<typeof raceSchema>;
export type RaceRelation = z.output<typeof raceRelationSchema>;
export type Era = z.output<typeof eraSchema>;
export type WorldData = { eras: Era[] } & Record<string, unknown>;

/** Era keys that hold a flat array of entities with an `id`. */
export const ENTITY_SCHEMAS = {
  worldStructure: locationSchema,
  characters: characterSchema,
  cultivationArts: cultivationArtSchema,
  treasures: treasureSchema,
  skills: skillSchema,
  domains: domainSchema,
  pills: pillSchema,
  ingredients: ingredientSchema,
  recipes: recipeSchema,
  furnaces: furnaceSchema,
  flames: flameSchema,
  realms: legacyRealmSchema,
  races: raceSchema,
  powerSystems: powerSystemSchema,
} as const;

export type EraCollectionKey = keyof typeof ENTITY_SCHEMAS;
export const ERA_COLLECTION_KEYS = Object.keys(ENTITY_SCHEMAS) as EraCollectionKey[];
export type EraItem<K extends EraCollectionKey> = Era[K] extends Array<infer T> ? T : never;

/** A new entity of the given collection with defaults and a fresh id. */
export function createEntity<K extends EraCollectionKey>(key: K, init: Partial<EraItem<K>> = {}): EraItem<K> {
  return ENTITY_SCHEMAS[key].parse({ ...init }) as EraItem<K>;
}

export function createFaction(init: Partial<Faction> = {}): Faction {
  return factionSchema.parse({ ...init });
}

export type NormalizeResult = { ok: true; data: WorldData } | { ok: false; error: string };

/** Validate and repair any JSON (import, IndexedDB, remote, AI) into WorldData. */
export function normalizeWorld(raw: unknown): NormalizeResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Tệp không phải JSON object hợp lệ." };
  }
  const top = worldSchema.safeParse(raw);
  if (!top.success || top.data.eras.length === 0) {
    return { ok: false, error: 'Tệp JSON không hợp lệ: thiếu dữ liệu "eras".' };
  }
  const eras = top.data.eras.flatMap((e) => {
    const parsed = eraSchema.safeParse(e);
    return parsed.success ? [parsed.data] : [];
  });
  if (eras.length === 0) {
    return { ok: false, error: "Không tìm thấy era hợp lệ trong tệp JSON." };
  }
  return { ok: true, data: { ...top.data, eras } };
}

export function createEmptyEra(name: string): Era {
  return eraSchema.parse({ id: genId("e"), name });
}
