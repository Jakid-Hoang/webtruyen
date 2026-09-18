import { normalizeCodex, type CodexData, type NormalizeResult } from "@/lib/codex/schema";

/** Tải wiki về máy dạng .json (cùng định dạng Codex). Đây là đường thoát khi dữ liệu có sự cố. */
export function exportCodexFile(data: CodexData) {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = (data.world.name || "codex").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "codex";
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface CodexFile {
  result: NormalizeResult;
  /** Chương trong file Codex cũ (Codex lưu chương chung với wiki). */
  chapters: { title: string; content: string; status: string }[];
}

export async function readCodexFile(file: File): Promise<CodexFile> {
  try {
    const raw = JSON.parse(await file.text()) as Record<string, unknown>;
    const chapters = Array.isArray(raw?.chapters)
      ? (raw.chapters as Record<string, unknown>[]).map((c, i) => ({
          title: String(c?.title || `Chương ${i + 1}`),
          content: String(c?.content ?? ""),
          status: String(c?.status ?? "nháp"),
        }))
      : [];
    return { result: normalizeCodex(raw), chapters };
  } catch {
    return { result: { ok: false, error: "Lỗi đọc file: không phải JSON hợp lệ." }, chapters: [] };
  }
}
