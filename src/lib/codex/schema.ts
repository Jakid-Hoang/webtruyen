import { z } from "zod";
import { genId } from "@/lib/id";
import { DEFAULT_RANKS, ELEMENT_SEED, TYPES, type TypeDef } from "./types";

/*
 * Toàn bộ wiki là một object S (BANGIAO §3), giữ đúng khóa của Codex để
 * file JSON cũ nhập được:
 *   S = { world, eras, eraId, elements, counters, ent, custom, ignore }
 * Mọi loại mục dùng chung một khuôn Entity (không class riêng cho từng loại).
 * Chương truyện không nằm trong S: chúng ở kho viết truyện riêng (nhiều truyện).
 */

const toStr = (v: unknown) => (typeof v === "number" ? String(v) : v);
const text = (fallback = "") => z.preprocess(toStr, z.string().catch(fallback));
const strList = z
  .array(z.unknown())
  .catch([])
  .transform((a) => a.map(toStr).filter((x): x is string => typeof x === "string" && x.length > 0));
const objList = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x))
        .map((x) => item.parse(x) as z.output<T>),
    );

export const relSchema = z.looseObject({ to: text(), kind: text("Khác"), note: text() });

export const entitySchema = z.looseObject({
  id: z.preprocess(toStr, z.string().min(1).catch(() => genId())),
  /** null = xuyên suốt mọi thời đại. */
  eraId: z.preprocess((v) => (v === "" || v === undefined ? null : toStr(v)), z.string().nullable().catch(null)),
  name: text(),
  /**
   * Mô tả một dòng hiện ngay dưới tên. KHÔNG phải bản dịch của tên: tên nói nó
   * tên gì, gloss nói nó LÀ CÁI GÌ (“Thị trấn mỏ sắt đã cạn, dân bỏ đi quá nửa”).
   */
  gloss: text(),
  /** Chuỗi ngăn bằng dấu phẩy — cũng được dò trong truyện. */
  aliases: text(),
  icon: text(),
  els: strList,
  /** Giá trị các ô thông tin, khóa theo field.k. */
  f: z.record(z.string(), z.preprocess(toStr, z.string().catch(""))).catch({}),
  /** Liên kết tới thực thể khác: { skill: [id, id] }. */
  r: z.record(z.string(), strList).catch({}),
  /** Chỉ nhân vật: độ thuần thục từng hệ 0–100. */
  aff: z.record(z.string(), z.coerce.number().catch(60)).catch({}),
  /** Chỉ nhân vật. */
  rel: objList(relSchema),
  /** Chỉ skill hợp thành: [idA, idB]. */
  recipe: strList.optional(),
});

const fieldDefSchema = z.looseObject({
  k: text(),
  l: text(),
  t: z.enum(["text", "area", "sel", "rank", "img"]).catch("text"),
  o: z.array(z.string()).optional().catch(undefined),
});

export const typeDefSchema = z.looseObject({
  k: z.string().min(1),
  l: text("Loại mục"),
  ic: text("✧"),
  g: text("Khác"),
  els: z.union([z.literal(0), z.literal(1)]).catch(0),
  f: objList(fieldDefSchema),
  r: objList(z.looseObject({ k: text(), l: text(), to: text() })),
});

export const elementSchema = z.looseObject({
  id: z.preprocess(toStr, z.string().min(1).catch(() => genId())),
  name: text("Hệ mới"),
  icon: text("✦"),
  color: text("#7b7288"),
  desc: text(),
});

export const eraSchema = z.looseObject({
  id: z.preprocess(toStr, z.string().min(1).catch(() => genId())),
  name: text("Thời đại"),
  note: text(),
});

export const codexSchema = z.looseObject({
  world: z
    .looseObject({
      name: text("Thế giới chưa đặt tên"),
      tagline: text("fantasy"),
      desc: text(),
      ranks: z.array(z.string()).catch(DEFAULT_RANKS),
    })
    .catch({ name: "Thế giới chưa đặt tên", tagline: "fantasy", desc: "", ranks: DEFAULT_RANKS }),
  eras: objList(eraSchema),
  eraId: text(),
  elements: objList(elementSchema),
  counters: z
    .array(z.unknown())
    .catch([])
    .transform((a) =>
      a.filter((p): p is [string, string] => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === "string")),
    ),
  ent: z.record(z.string(), objList(entitySchema)).catch({}),
  custom: z
    .array(z.unknown())
    .catch([])
    .transform((a) => a.flatMap((t) => {
      const p = typeDefSchema.safeParse(t);
      return p.success ? [p.data as unknown as TypeDef] : [];
    })),
  ignore: z.array(z.string()).catch([]),
});

export type Rel = z.output<typeof relSchema>;
export type Entity = z.output<typeof entitySchema>;
export type Element = z.output<typeof elementSchema>;
export type EraDef = z.output<typeof eraSchema>;
export type CodexData = z.output<typeof codexSchema>;

/** Đảm bảo có ít nhất một thời đại, eraId hợp lệ và đủ mảng cho mọi loại mục. */
function finish(d: CodexData): CodexData {
  const eras = d.eras.length ? d.eras : [{ id: genId("era"), name: "Thời kỳ đầu", note: "" }];
  const eraId = eras.some((e) => e.id === d.eraId) ? d.eraId : eras[0].id;
  const ent = { ...d.ent };
  for (const t of [...TYPES, ...d.custom]) ent[t.k] ??= [];
  return { ...d, eras, eraId, ent };
}

export function seedCodex(): CodexData {
  return finish(
    codexSchema.parse({
      elements: ELEMENT_SEED.map(([name, icon, color]) => ({ id: genId("el"), name, icon, color, desc: "" })),
    }),
  );
}

export type NormalizeResult = { ok: true; data: CodexData } | { ok: false; error: string };

/** Kiểm tra và sửa JSON bất kỳ (file Codex cũ, IndexedDB, sau này Supabase). */
export function normalizeCodex(raw: unknown): NormalizeResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Tệp không phải JSON object hợp lệ." };
  const r = raw as Record<string, unknown>;
  if (!r.ent || typeof r.ent !== "object" || !Array.isArray(r.elements)) {
    return { ok: false, error: "File không đúng định dạng (thiếu “ent” hoặc “elements”)." };
  }
  // Chương (Codex cũ lưu chung) và trạng thái giao diện không thuộc wiki: chương
  // được chuyển sang kho viết truyện khi nạp file, nên bỏ khỏi đây để khỏi trùng.
  const data = finish(codexSchema.parse(raw)) as CodexData & { chapters?: unknown; ui?: unknown };
  delete data.chapters;
  delete data.ui;
  return { ok: true, data };
}

export function createEntity(eraId: string | null, init: Partial<Entity> = {}): Entity {
  return entitySchema.parse({ id: genId(), eraId, ...init });
}
