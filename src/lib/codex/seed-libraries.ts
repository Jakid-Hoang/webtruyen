/*
 * Thư viện mẫu cho từng loại mục — một khuôn dùng chung cho mọi thư viện.
 * Dữ liệu nằm trong src/data (mảng các mảng chuỗi, cột cố định):
 *   cột 0 = tên (tiếng Anh) · cột `glossCol` = mô tả một dòng tiếng Việt
 *   cột `folderCol` = thư mục "01 …" · từ `firstCol` trở đi ghi thẳng vào ô `f`.
 * Kho skill là định dạng cũ nên không có gloss (glossCol = -1).
 * CHỈ ĐỌC: “Đưa vào truyện” tạo bản sao trong ent[loại].
 * Thêm một thư viện = thêm một dòng ở đây + một file JSON. Không sửa giao diện.
 */
import type { Entity } from "./schema";

export type SeedRow = string[];

export interface SeedLibrary {
  /** Khóa loại mục trong TYPES. */
  k: string;
  /** Chỉ số cột mô tả một dòng; -1 nếu kho không có. */
  glossCol: number;
  folderCol: number;
  /** Cột dữ liệu đầu tiên. */
  firstCol: number;
  /** Khóa ô `f` cho các cột từ `firstCol` trở đi. */
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
  // Định dạng cũ: [tên, thư mục, loại, phạm vi, cơ chế, mô tả, nguồn cảm hứng]
  { k: "skill", glossCol: -1, folderCol: 1, firstCol: 2, cols: ["type", "range", "mech", "desc", "src"],
    filters: [2, 4], head: [2, 3], body: 5, tags: [4, 6], extra: { rank: "C" }, keepFolder: true,
    load: () => json(import("@/data/skill-seed.json")) },
  // Từ đây là định dạng v1.6: [tên, gloss, thư mục, …]
  { k: "land", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["kind", "parent", "geo", "note"],
    filters: [3], head: [3], body: 5, tags: [4], load: () => json(import("@/data/seeds/land.json")) },
  { k: "race", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["life", "home", "traits", "weak", "note"],
    filters: [], head: [3], body: 5, tags: [4], load: () => json(import("@/data/seeds/race.json")) },
  { k: "rank", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["lv", "sys", "note", "cond"],
    filters: [4], head: [4, 3], body: 5, tags: [], load: () => json(import("@/data/seeds/rank.json")) },
  { k: "job", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["kind", "tier", "weapon", "role", "from", "cond", "desc", "weak"],
    filters: [3, 4], head: [3, 4], body: 9, tags: [5, 6], load: () => json(import("@/data/seeds/job.json")) },
  { k: "beast", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["danger", "kind", "look", "skills", "weak", "drop"],
    filters: [4, 3], head: [4, 3], body: 5, tags: [], load: () => json(import("@/data/seeds/beast.json")) },
  { k: "deity", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["domain", "status", "creed", "grace", "taboo"],
    filters: [4], head: [4], body: 5, tags: [3], load: () => json(import("@/data/seeds/deity.json")) },
  { k: "faction", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["kind", "power", "leader", "creed", "note"],
    filters: [3], head: [3, 4], body: 6, tags: [5], load: () => json(import("@/data/seeds/faction.json")) },
  { k: "school", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["tier", "origin", "hard", "desc", "way", "price"],
    filters: [5], head: [5, 3], body: 6, tags: [4], load: () => json(import("@/data/seeds/school.json")) },
  { k: "artifact", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["tier", "kind", "power", "desc", "effect", "curse"],
    filters: [4, 5], head: [4, 5], body: 6, tags: [3], load: () => json(import("@/data/seeds/artifact.json")) },
  { k: "item", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["kind", "tier", "price", "effect", "how"],
    filters: [3], head: [3, 4], body: 6, tags: [5], load: () => json(import("@/data/seeds/item.json")) },
  { k: "domain", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["scale", "rule", "enter", "break"],
    filters: [3], head: [3], body: 4, tags: [], load: () => json(import("@/data/seeds/domain.json")) },
  { k: "contract", glossCol: 1, folderCol: 2, firstCol: 3, cols: ["kind", "price", "desc", "power", "broke"],
    filters: [3], head: [3], body: 5, tags: [4], load: () => json(import("@/data/seeds/contract.json")) },
];

export function seedLibrary(k: string) {
  return SEED_LIBRARIES.find((l) => l.k === k);
}

/** Khóa ô `f` của cột thứ i. */
export const colKey = (lib: SeedLibrary, i: number) => lib.cols[i - lib.firstCol];

/** Bản sao đưa vào truyện. */
export function seedToEntity(lib: SeedLibrary, row: SeedRow, icon: string): Partial<Entity> {
  const f: Record<string, string> = {};
  lib.cols.forEach((k, i) => (f[k] = row[i + lib.firstCol] ?? ""));
  if (lib.keepFolder) f.folder = row[lib.folderCol];
  return {
    eraId: null,
    name: row[0],
    gloss: lib.glossCol >= 0 ? (row[lib.glossCol] ?? "") : "",
    icon,
    f: { ...f, ...lib.extra },
  };
}

export function folderCounts(rows: SeedRow[], lib: SeedLibrary): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of rows) m[s[lib.folderCol]] = (m[s[lib.folderCol]] ?? 0) + 1;
  return m;
}
