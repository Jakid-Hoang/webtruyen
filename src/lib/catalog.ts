/*
 * Option vocabularies used by selects, badges and grouping. Values are what is
 * stored in the JSON; labels are what the UI shows.
 */

export interface Option {
  value: string;
  label: string;
  icon?: string;
}

/* ── Characters ── */

export const GENDERS: Option[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Bán nam bán nữ" },
  { value: "unknown", label: "Chưa xác định" },
];

export const CARD_THEMES: Option[] = [
  { value: "classic", label: "Cổ phong", icon: "🏯" },
  { value: "cat", label: "Mèo cute", icon: "🐱" },
  { value: "dog", label: "Chó cưng", icon: "🐶" },
  { value: "floral", label: "Hoa lá", icon: "🌸" },
  { value: "dark", label: "Hắc ám", icon: "🌑" },
  { value: "celestial", label: "Tinh thần", icon: "✨" },
  { value: "dragon", label: "Thần long", icon: "🐉" },
  { value: "ghost", label: "Linh hồn", icon: "👻" },
];

export const CARD_ACCENTS = ["#3b82f6", "#a855f7", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#e2e8f0"];

export const ART_PROGRESS = ["Tiểu thành", "Đại thành", "Viên mãn", "Đỉnh phong"];

/* ── Factions ── */

export interface FactionCategory extends Option {
  ranks: Option[];
}

export const FACTION_CATEGORIES: FactionCategory[] = [
  {
    value: "tu_giao",
    label: "Tứ Giáo",
    icon: "📜",
    ranks: [
      { value: "nho_gia", label: "Thư Viện của Nho Gia", icon: "🏛️" },
      { value: "dao_gia", label: "Đạo Thống của Đạo Gia", icon: "☯️" },
      { value: "phat_gia", label: "Phật Đàn của Phật Gia", icon: "🪷" },
      { value: "phap_gia", label: "Pháp Viên của Pháp Gia", icon: "⚖️" },
    ],
  },
  {
    value: "quoc_gia",
    label: "Quốc Gia",
    icon: "👑",
    ranks: [
      { value: "cuong_quoc", label: "Cường Quốc", icon: "🌟" },
      { value: "phat_trien", label: "Quốc Gia Phát Triển", icon: "🔷" },
      { value: "dang_phat_trien", label: "Quốc Gia Đang Phát Triển", icon: "🔶" },
      { value: "kem_phat_trien", label: "Quốc Gia Kém Phát Triển", icon: "⬜" },
    ],
  },
  {
    value: "tong_mon",
    label: "Tông Môn Tu Tiên",
    icon: "🏔️",
    ranks: [
      { value: "nhat_dang", label: "Nhất Đẳng Tông Môn", icon: "⭐⭐⭐" },
      { value: "nhi_dang", label: "Nhị Đẳng Tông Môn", icon: "⭐⭐" },
      { value: "tam_dang", label: "Tam Đẳng Tông Môn", icon: "⭐" },
    ],
  },
  { value: "the_gia_tu_chan", label: "Thế Gia Tu Chân", icon: "🔮", ranks: [] },
  { value: "to_chuc", label: "Tổ Chức Đặc Thù", icon: "🕵️", ranks: [] },
  { value: "the_gia_dai_toc", label: "Thế Gia Đại Tộc", icon: "🏠", ranks: [] },
];

export function getFactionCategory(value: string) {
  return FACTION_CATEGORIES.find((c) => c.value === value);
}

/* ── Relations ── */

export interface RelationGroupDef {
  key: "family" | "ally" | "enemy";
  label: string;
  emoji: string;
  color: string; // hex, used by graph + accents
  tone: string; // tailwind classes for badges/headers
  options: { value: string; inverse: string }[];
}

const symmetric = (values: string[]) => values.map((v) => ({ value: v, inverse: v }));

export const RELATION_CATALOG: RelationGroupDef[] = [
  {
    key: "family",
    label: "Gia đình",
    emoji: "👨‍👩‍👧",
    color: "#f59e0b",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    options: [
      { value: "Cha/Mẹ - Con", inverse: "Con - Cha/Mẹ" },
      { value: "Con - Cha/Mẹ", inverse: "Cha/Mẹ - Con" },
      { value: "Anh/Chị - Em ruột", inverse: "Em - Anh/Chị ruột" },
      { value: "Em - Anh/Chị ruột", inverse: "Anh/Chị - Em ruột" },
      { value: "Vợ/Chồng", inverse: "Vợ/Chồng" },
      { value: "Anh em cùng họ", inverse: "Anh em cùng họ" },
      { value: "Cậu/Cô/Dì/Chú/Bác - Cháu", inverse: "Cháu - Cậu/Cô/Dì/Chú/Bác" },
      { value: "Cháu - Cậu/Cô/Dì/Chú/Bác", inverse: "Cậu/Cô/Dì/Chú/Bác - Cháu" },
      { value: "Ông/Bà - Cháu", inverse: "Cháu - Ông/Bà" },
      { value: "Cháu - Ông/Bà", inverse: "Ông/Bà - Cháu" },
      { value: "Sư phụ - Đệ tử", inverse: "Đệ tử - Sư phụ" },
      { value: "Đệ tử - Sư phụ", inverse: "Sư phụ - Đệ tử" },
    ],
  },
  {
    key: "ally",
    label: "Hoà bình",
    emoji: "🤝",
    color: "#38bdf8",
    tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    options: symmetric([
      "Giao hảo bình thường",
      "Bạn bè",
      "Tri kỉ / Hồng nhan",
      "Huynh đệ tình thâm",
      "Sống chết có nhau",
      "Đồng minh",
      "Đối tác",
    ]),
  },
  {
    key: "enemy",
    label: "Bất hoà",
    emoji: "⚔️",
    color: "#f43f5e",
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    options: symmetric([
      "Chán ghét",
      "Không chạm mặt",
      "Có thù nhỏ",
      "Thâm thù đại hận",
      "Kẻ thù không đội trời chung",
      "Đối thủ cạnh tranh",
    ]),
  },
];

export function inverseRelationType(group: string, type: string): string {
  const def = RELATION_CATALOG.find((g) => g.key === group);
  return def?.options.find((o) => o.value === type)?.inverse ?? type;
}

/* ── Arts / treasures / skills / domains ── */

export const GRADE_TONES: { match: string; tone: string }[] = [
  { match: "Phàm Giai", tone: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
  { match: "Địa Giai", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { match: "Thiên Giai", tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { match: "Thánh Giai", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { match: "Thần Giai", tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" },
];

export function gradeTone(rank: string) {
  return GRADE_TONES.find((g) => rank.includes(g.match))?.tone ?? "border-primary/30 bg-primary/10 text-primary";
}

export const ART_GRADES = ["Phàm Giai", "Địa Giai", "Thiên Giai", "Thánh Giai"];
export const ART_DIFFICULTY = ["Dễ", "Trung bình", "Khó", "Cực hạn"];

export const TREASURE_TYPES: Option[] = [
  { value: "Vũ khí", label: "Vũ khí", icon: "⚔️" },
  { value: "Phòng thủ", label: "Phòng thủ", icon: "🛡️" },
  { value: "Hỗ trợ", label: "Hỗ trợ", icon: "💠" },
  { value: "Linh khí", label: "Linh khí", icon: "🔮" },
  { value: "Đan dược", label: "Đan dược", icon: "⚗️" },
  { value: "Khác", label: "Khác", icon: "✦" },
];

export const POWER_LEVELS = ["Yếu", "Trung bình", "Mạnh", "Cực mạnh", "Hủy diệt"];

export const SKILL_TYPES: Option[] = [
  { value: "Tấn công", label: "Tấn công", icon: "⚡" },
  { value: "Phòng thủ", label: "Phòng thủ", icon: "🛡️" },
  { value: "Hỗ trợ", label: "Hỗ trợ", icon: "💠" },
  { value: "Cấm chú", label: "Cấm chú", icon: "🔮" },
  { value: "Biến hình", label: "Biến hình", icon: "🌀" },
  { value: "Khác", label: "Khác", icon: "✦" },
];

export const DOMAIN_COMPLETION: Option[] = [
  { value: "Hoàn chỉnh", label: "Hoàn chỉnh", icon: "✦" },
  { value: "Đang hoàn thiện", label: "Đang hoàn thiện", icon: "◎" },
  { value: "Chưa hoàn chỉnh", label: "Chưa hoàn chỉnh", icon: "◌" },
];

export const DOMAIN_USAGE_LEVELS = ["Lần đầu khai triển", "Chưa hoàn chỉnh", "Hoàn chỉnh", "Cưỡng chế triển khai", "Phản lĩnh vực"];

/* ── Alchemy ── */

export const PILL_RANKS = ["Nhất Tinh", "Nhị Tinh", "Tam Tinh", "Tứ Tinh", "Ngũ Tinh", "Lục Tinh", "Thất Tinh", "Bát Tinh", "Cửu Tinh"];

export const PILL_TYPES: Option[] = [
  { value: "Tăng lực", label: "Tăng lực", icon: "⚡" },
  { value: "Hồi phục", label: "Hồi phục", icon: "💚" },
  { value: "Đột phá", label: "Đột phá", icon: "🌟" },
  { value: "Trị thương", label: "Trị thương", icon: "🩹" },
  { value: "Giải độc", label: "Giải độc", icon: "🧪" },
  { value: "Tẩy tủy", label: "Tẩy tủy", icon: "🔮" },
  { value: "Khác", label: "Khác", icon: "✦" },
];

export const PILL_DIFFICULTY = ["Đơn giản", "Trung Bình", "Khó", "Cực Hạn"];

export const INGREDIENT_RARITY: Option[] = [
  { value: "Dễ tìm", label: "Dễ tìm", icon: "🟢" },
  { value: "Trung bình", label: "Trung bình", icon: "🟡" },
  { value: "Hiếm", label: "Hiếm", icon: "🟣" },
  { value: "Cực hiếm", label: "Cực hiếm", icon: "⭐" },
];

export const FURNACE_RANKS: Option[] = [
  { value: "Linh Phẩm", label: "Linh Phẩm", icon: "🌿" },
  { value: "Huyền Phẩm", label: "Huyền Phẩm", icon: "💠" },
  { value: "Địa Phẩm", label: "Địa Phẩm", icon: "✦" },
  { value: "Thiên Phẩm", label: "Thiên Phẩm", icon: "👑" },
];

export const FLAME_TYPES: Option[] = [
  { value: "Tâm Hoả", label: "Tâm Hoả", icon: "❤️‍🔥" },
  { value: "Pháp Hoả", label: "Pháp Hoả", icon: "🔵" },
  { value: "Đạo Hoả", label: "Đạo Hoả", icon: "☯️" },
  { value: "Dị Hoả", label: "Dị Hoả", icon: "⚡" },
];

/* ── Realms ── */

/** Well-known realm names → tone, matched by substring of tier or name. */
export const REALM_TONES: { match: string; bar: string; tone: string }[] = [
  { match: "Luyện Khí", bar: "#a1a1aa", tone: "text-zinc-600 dark:text-zinc-300 bg-zinc-500/10 border-zinc-500/30" },
  { match: "Trúc Cơ", bar: "#22c55e", tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  { match: "Kết Đan", bar: "#eab308", tone: "text-yellow-700 dark:text-yellow-300 bg-yellow-500/10 border-yellow-500/30" },
  { match: "Nguyên Anh", bar: "#f97316", tone: "text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/30" },
  { match: "Hóa Thần", bar: "#ef4444", tone: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30" },
  { match: "Luyện Hư", bar: "#ec4899", tone: "text-pink-700 dark:text-pink-300 bg-pink-500/10 border-pink-500/30" },
  { match: "Hợp Thể", bar: "#a855f7", tone: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30" },
  { match: "Đại Thừa", bar: "#6366f1", tone: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30" },
  { match: "Độ Kiếp", bar: "#0ea5e9", tone: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30" },
  { match: "Tiên", bar: "#06b6d4", tone: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/30" },
  { match: "Thần", bar: "#f59e0b", tone: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30" },
];

export function realmTone(tier: string, name: string) {
  return REALM_TONES.find((r) => tier.includes(r.match)) ?? REALM_TONES.find((r) => name.includes(r.match));
}

/** Rotating palette for power systems / races (index-based). */
export const PALETTE = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#6366f1", "#a855f7", "#14b8a6", "#f97316"];

/* ── Races ── */

export const RACE_GENDERS: Option[] = [
  { value: "binary", label: "Nam / Nữ" },
  { value: "none", label: "Không phân giới tính" },
  { value: "multi", label: "Đa giới tính" },
  { value: "fluid", label: "Tự chọn / biến đổi" },
];

export const RACE_REL_TYPE_OPTIONS: Option[] = [
  { value: "ally", label: "Đồng minh", icon: "🤝" },
  { value: "enemy", label: "Thù địch", icon: "⚔️" },
  { value: "prey", label: "Con mồi", icon: "🎯" },
  { value: "predator", label: "Thiên địch", icon: "🦁" },
];
