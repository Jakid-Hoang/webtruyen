import Dexie, { type EntityTable } from "dexie";

interface KvRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

/** Khóa lưu wiki fantasy (bản tu tiên cũ nằm ở "world_v1" và không bị đụng tới). */
export const CODEX_KEY = "codex_v1";

class LocalDb extends Dexie {
  kv!: EntityTable<KvRow, "key">;

  constructor() {
    super("character_wiki");
    this.version(1).stores({ kv: "key" });
  }
}

let db: LocalDb | null = null;
function getDb() {
  db ??= new LocalDb();
  return db;
}

/** Dữ liệu thô đã lưu (chưa kiểm tra), hoặc null nếu chưa có / IndexedDB không dùng được. */
export async function loadLocal(key = CODEX_KEY): Promise<unknown | null> {
  try {
    return (await getDb().kv.get(key))?.value ?? null;
  } catch (err) {
    console.warn("[local] load failed", err);
    return null;
  }
}

export async function saveLocal(value: unknown, key = CODEX_KEY): Promise<boolean> {
  try {
    await getDb().kv.put({ key, value, updatedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn("[local] save failed", err);
    return false;
  }
}
