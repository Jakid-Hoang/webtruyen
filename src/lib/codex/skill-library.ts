import seed from "@/data/skill-seed.json";

/**
 * Thư viện 914 skill mẫu, chép nguyên SKILL_SEED của codex.html — CHỈ ĐỌC, đừng sửa tay.
 * Mỗi phần tử: [tên, thư mục, loại, phạm vi, cơ chế, mô tả, nguồn cảm hứng].
 * Cố tình không nạp vào dữ liệu truyện: “Đưa vào truyện” mới tạo bản sao trong ent.skill.
 */
export type SkillSeed = [name: string, folder: string, type: string, range: string, mech: string, desc: string, src: string];

export const SKILL_SEED = seed as SkillSeed[];

export function skillFolders(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of SKILL_SEED) m[s[1]] = (m[s[1]] ?? 0) + 1;
  return m;
}

/** Bản sao đưa vào truyện (A.libAdd của Codex). */
export function seedToEntity(s: SkillSeed) {
  return {
    eraId: null,
    name: s[0],
    icon: "✦",
    f: { type: s[2], range: s[3], mech: s[4], desc: s[5], src: s[6], folder: s[1], rank: "C" },
  };
}
