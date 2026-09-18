/*
 * Thư viện mẫu cho từng loại mục — một khuôn dùng chung cho cả 12 thư viện.
 * Dữ liệu nằm trong src/data (mảng các mảng chuỗi, cột cố định, như SKILL_SEED):
 * cột 0 = tên, cột 1 = thư mục, các cột sau ghi thẳng vào ô `f` theo `cols`.
 * CHỈ ĐỌC: “Đưa vào truyện” tạo bản sao trong ent[loại], thư viện không nằm
 * trong dữ liệu truyện (để chỉ mục tự động không dò nhầm).
 */
import type { Entity } from "./schema";

export type SeedRow = string[];

export interface SeedLibrary {
  /** Khóa loại mục trong TYPES. */
  k: string;
  /** Khóa ô `f` cho các cột từ vị trí 2 trở đi. */
  cols: string[];
  /** Chỉ số cột dùng làm bộ lọc (select). */
  filters: number[];
  /** Chỉ số cột hiện ở đầu thẻ: trái, phải. */
  head: number[];
  /** Chỉ số cột làm đoạn mô tả trên thẻ. */
  body: number;
  /** Chỉ số cột hiện thành nhãn nhỏ. */
  tags: number[];
  /** Ô thêm vào khi đưa vào truyện. */
  extra?: Record<string, string>;
  /** Có lưu thư mục vào ô f.folder không (loại có ô “Thư mục”). */
  keepFolder?: boolean;
  load: () => Promise<SeedRow[]>;
}

const json = (p: Promise<{ default: unknown }>) => p.then((m) => m.default as SeedRow[]);

export const SEED_LIBRARIES: SeedLibrary[] = [
  // [tên, thư mục, loại, phạm vi, cơ chế, mô tả, nguồn cảm hứng]
  { k: "skill", cols: ["type", "range", "mech", "desc", "src"], filters: [2, 4], head: [2, 3], body: 5, tags: [4, 6], extra: { rank: "C" }, keepFolder: true,
    load: () => json(import("@/data/skill-seed.json")) },
  // [tên, thư mục, loại, thuộc về, địa dư, ghi chú]
  { k: "land", cols: ["kind", "parent", "geo", "note"], filters: [2], head: [2], body: 4, tags: [3], load: () => json(import("@/data/seeds/land.json")) },
  // [tên, thư mục, tuổi thọ, nơi sinh sống, đặc tính, điểm yếu, văn hóa]
  { k: "race", cols: ["life", "home", "traits", "weak", "note"], filters: [], head: [2], body: 4, tags: [], load: () => json(import("@/data/seeds/race.json")) },
  // [tên, thư mục, thứ tự, thuộc hệ thống, mô tả, điều kiện đạt được]
  { k: "rank", cols: ["lv", "sys", "note", "cond"], filters: [3], head: [3, 2], body: 4, tags: [], load: () => json(import("@/data/seeds/rank.json")) },
  // [tên, thư mục, cấp nguy hiểm, phân loại, hình dạng, đòn đánh tiêu biểu, điểm yếu, vật phẩm thu được]
  { k: "beast", cols: ["danger", "kind", "look", "skills", "weak", "drop"], filters: [3, 2], head: [3, 2], body: 4, tags: [], load: () => json(import("@/data/seeds/beast.json")) },
  // [tên, thư mục, cai quản, tình trạng, giáo lý, ân sủng ban xuống, điều cấm kỵ]
  { k: "deity", cols: ["domain", "status", "creed", "grace", "taboo"], filters: [3], head: [3], body: 4, tags: [2], load: () => json(import("@/data/seeds/deity.json")) },
  // [tên, thư mục, phân loại, đẳng cấp, người đứng đầu, tôn chỉ/lịch sử, ghi chú]
  { k: "faction", cols: ["kind", "power", "leader", "creed", "note"], filters: [2], head: [2, 3], body: 5, tags: [], load: () => json(import("@/data/seeds/faction.json")) },
  // [tên, thư mục, cấp hạng, nguồn gốc, độ khó, mô tả/xuất xứ, phương thức tu luyện, cái giá]
  { k: "school", cols: ["tier", "origin", "hard", "desc", "way", "price"], filters: [4], head: [4, 2], body: 5, tags: [], load: () => json(import("@/data/seeds/school.json")) },
  // [tên, thư mục, phẩm cấp, loại, uy lực, mô tả/xuất xứ, hiệu ứng/công năng, lời nguyền/điều kiện]
  { k: "artifact", cols: ["tier", "kind", "power", "desc", "effect", "curse"], filters: [3, 4], head: [3, 4], body: 5, tags: [2], load: () => json(import("@/data/seeds/artifact.json")) },
  // [tên, thư mục, loại, phẩm cấp, giá trị, công dụng, cách chế tạo]
  { k: "item", cols: ["kind", "tier", "price", "effect", "how"], filters: [2], head: [2, 3], body: 5, tags: [4], load: () => json(import("@/data/seeds/item.json")) },
  // [tên, thư mục, quy mô, luật trong lãnh vực, điều kiện vào ra, cách phá]
  { k: "domain", cols: ["scale", "rule", "enter", "break"], filters: [2], head: [2], body: 3, tags: [], load: () => json(import("@/data/seeds/domain.json")) },
  // [tên, thư mục, loại khế ước, cái giá, nội dung khế ước, sức mạnh ban cho, hậu quả khi phá ước]
  { k: "contract", cols: ["kind", "price", "desc", "power", "broke"], filters: [2], head: [2], body: 4, tags: [], load: () => json(import("@/data/seeds/contract.json")) },
];

export function seedLibrary(k: string) {
  return SEED_LIBRARIES.find((l) => l.k === k);
}

/** Khóa ô `f` của cột thứ i (i ≥ 2). */
export const colKey = (lib: SeedLibrary, i: number) => lib.cols[i - 2];

/** Bản sao đưa vào truyện (A.libAdd của Codex, mở rộng cho mọi loại). */
export function seedToEntity(lib: SeedLibrary, row: SeedRow, icon: string): Partial<Entity> {
  const f: Record<string, string> = {};
  lib.cols.forEach((k, i) => (f[k] = row[i + 2] ?? ""));
  if (lib.keepFolder) f.folder = row[1];
  return { eraId: null, name: row[0], icon, f: { ...f, ...lib.extra } };
}

export function folderCounts(rows: SeedRow[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of rows) m[s[1]] = (m[s[1]] ?? 0) + 1;
  return m;
}
