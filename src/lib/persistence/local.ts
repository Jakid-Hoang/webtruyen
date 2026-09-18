import Dexie, { type EntityTable } from "dexie";
import type { WorldData } from "@/lib/schema/world";

interface KvRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

const WORLD_KEY = "world_v1";

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

/** Returns the raw stored world (unvalidated), or null if nothing saved / IndexedDB unavailable. */
export async function loadLocalWorld(): Promise<unknown | null> {
  try {
    const row = await getDb().kv.get(WORLD_KEY);
    return row?.value ?? null;
  } catch (err) {
    console.warn("[local] load failed", err);
    return null;
  }
}

export async function saveLocalWorld(data: WorldData): Promise<boolean> {
  try {
    await getDb().kv.put({ key: WORLD_KEY, value: data, updatedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn("[local] save failed", err);
    return false;
  }
}
