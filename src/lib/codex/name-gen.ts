/*
 * Máy đặt tên — chép từ codex.html v1.6, giữ nguyên cách ghép.
 * Tên bốc theo khuôn của từng loại mục (NPAT), ghép từ hai kho âm (NB), rồi
 * sinh kèm một dòng gloss tiếng Việt: danh từ trước, bổ nghĩa sau
 * ("Mount Saltmoor" → "núi truông muối"), KHÔNG ghép Hán Việt.
 * Gloss máy sinh chỉ là gợi ý để ô không trống; viết tay vẫn tốt hơn.
 */
import banks from "@/data/name-banks.json";

interface Bank {
  l: string;
  vi?: number;
  en?: number;
  /** Có dấu cách giữa hai âm không (tiếng Việt có, tiếng Anh không). */
  sp?: number;
  a: string[];
  b: string[];
}

const NB = banks.NB as Record<string, Bank>;
const EPI = banks.EPI as Record<"vi" | "en", string[]>;
const NPAT = banks.NPAT as Record<"vi" | "en", Record<string, string[]>>;
const MEAN = banks.MEAN as Record<string, string>;

export type NameLang = "vi" | "en";
export interface RolledName {
  name: string;
  gloss: string;
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Các phong cách dùng được cho một ngôn ngữ, kèm nhãn hiển thị. */
export function nameStyles(lang: NameLang): { key: string; label: string }[] {
  return Object.entries(NB)
    .filter(([, b]) => (lang === "en" ? b.en : b.vi))
    .map(([key, b]) => ({ key, label: b.l }));
}

/** Loại mục nào có khuôn tên (nút 🎲 chỉ hiện với các loại này). */
export const hasNamePattern = (typeKey: string) => Boolean(NPAT.vi[typeKey]);

function core(style: string, lang: NameLang): { n: string; g: string | null } {
  const ok = nameStyles(lang).map((s) => s.key);
  const k = style && ok.includes(style) ? style : pick(ok);
  const B = NB[k];
  const x = pick(B.a),
    y = pick(B.b);
  let n = x + (B.sp ? " " : "") + y;
  n = n.replace(/([a-zA-Z])\1{2,}/g, "$1$1");
  if (k === "colangu" && Math.random() < 0.5) n = n.replace(/^(\S{3})/, "$1'");
  if (!B.sp) n = n.charAt(0).toUpperCase() + n.slice(1);
  return { n, g: MEAN[x] && MEAN[y] ? `${MEAN[y]} ${MEAN[x]}` : null };
}

export function generateName(typeKey: string, style: string, lang: NameLang): RolledName {
  const L: NameLang = lang === "en" ? "en" : "vi";
  const pats = NPAT[L][typeKey] ?? NPAT[L].char;
  const parts = pick(pats).split("||");
  const c1 = core(style, L),
    c2 = core(style, L);
  const name = parts[0].replace("{n2}", c2.n).replace("{n}", c1.n).replace("{e}", pick(EPI[L]));
  const gloss = parts[1] ? parts[1].replace("{g}", c1.g ?? c1.n) : "";
  return { name, gloss };
}

/** Bốc một tên chưa trùng với tên nào đang có trong dự án. */
export function generateUnique(typeKey: string, style: string, lang: NameLang, used: Set<string>): RolledName {
  for (let i = 0; i < 40; i++) {
    const r = generateName(typeKey, style, lang);
    if (!used.has(r.name.toLowerCase())) return r;
  }
  return generateName(typeKey, style, lang);
}

/** Bốc nhiều tên khác nhau một lượt. */
export function rollNames(typeKey: string, style: string, lang: NameLang, used: Set<string>, count = 12): RolledName[] {
  const out: RolledName[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count * 20 && out.length < count; i++) {
    const r = generateUnique(typeKey, style, lang, used);
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    out.push(r);
  }
  return out;
}
