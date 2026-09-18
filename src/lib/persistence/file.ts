import { normalizeWorld, type NormalizeResult, type WorldData } from "@/lib/schema/world";

/** Download the world as world_bible_YYYY-MM-DD.json. */
export function exportWorldFile(data: WorldData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `world_bible_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readWorldFile(file: File): Promise<NormalizeResult> {
  try {
    return normalizeWorld(JSON.parse(await file.text()));
  } catch {
    return { ok: false, error: "Lỗi đọc file: không phải JSON hợp lệ." };
  }
}
