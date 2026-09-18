/*
 * Loại mục là DỮ LIỆU, không phải code (BANGIAO §3–4).
 * Thêm loại mục mới = thêm một object vào TYPES (hoặc tự tạo trong app).
 * Sidebar, trang danh sách, trang chi tiết, chỉ mục tự động và thống kê
 * đều đọc từ đây, không viết trang riêng cho từng loại.
 *
 * Khóa (k) giữ nguyên như Codex để file JSON cũ nhập được.
 */

export type FieldKind = "text" | "area" | "sel" | "rank" | "img";

export interface FieldDef {
  k: string;
  l: string;
  t: FieldKind;
  /** Lựa chọn cho kiểu "sel". */
  o?: string[];
}

export interface RefDef {
  k: string;
  l: string;
  /** Khóa loại mục đích, hoặc "element" để liên kết tới bảng hệ. */
  to: string;
}

export interface TypeDef {
  k: string;
  l: string;
  ic: string;
  /** Nhóm trong sidebar. */
  g: string;
  /** 1 = loại này gán được hệ nguyên tố. */
  els?: 0 | 1;
  f: FieldDef[];
  r: RefDef[];
}

export const GROUPS = ["Nền tảng", "Thế giới", "Nhân sự", "Sức mạnh", "Sáng tác", "Ghi chép", "Khác"] as const;

export const TYPES: TypeDef[] = [
  {
    k: "char", l: "Nhân vật", ic: "👤", g: "Nhân sự", els: 1,
    f: [
      { k: "role", l: "Vai trò", t: "sel", o: ["Nhân vật chính", "Đồng hành", "Phản diện", "Phụ", "Thế lực ngầm"] },
      { k: "status", l: "Tình trạng", t: "sel", o: ["Còn sống", "Đã chết", "Mất tích", "Ẩn cư", "Chưa rõ"] },
      { k: "gender", l: "Giới tính", t: "sel", o: ["Nam", "Nữ", "Khác", "Chưa rõ"] },
      { k: "age", l: "Tuổi", t: "text" },
      { k: "rank", l: "Cấp bậc", t: "rank" },
      { k: "deathCh", l: "Chương qua đời", t: "text" },
      { k: "img", l: "Ảnh (URL)", t: "img" },
      { k: "look", l: "Ngoại hình", t: "area" },
      { k: "bio", l: "Thân phận bề nổi", t: "area" },
      { k: "secret", l: "Bí mật / duyên khởi", t: "area" },
      { k: "quote", l: "Câu thoại đáng nhớ", t: "area" },
    ],
    r: [
      { k: "race", l: "Chủng tộc", to: "race" },
      { k: "faction", l: "Thế lực", to: "faction" },
      { k: "land", l: "Vùng đất", to: "land" },
      { k: "skill", l: "Skill", to: "skill" },
      { k: "school", l: "Trường phái", to: "school" },
      { k: "artifact", l: "Thần khí", to: "artifact" },
      { k: "contract", l: "Khế ước", to: "contract" },
    ],
  },
  {
    k: "faction", l: "Thế lực & tổ chức", ic: "🛡", g: "Nhân sự",
    f: [
      { k: "kind", l: "Phân loại", t: "sel", o: ["Quốc gia", "Giáo hội", "Gia tộc", "Hội mạo hiểm giả", "Bang hội", "Quân đoàn", "Tổ chức ngầm", "Khác"] },
      { k: "power", l: "Đẳng cấp", t: "text" },
      { k: "leader", l: "Người đứng đầu", t: "text" },
      { k: "creed", l: "Tôn chỉ / lịch sử", t: "area" },
      { k: "note", l: "Ghi chú", t: "area" },
    ],
    r: [
      { k: "land", l: "Đóng tại", to: "land" },
      { k: "deity", l: "Thờ phụng", to: "deity" },
    ],
  },
  {
    k: "land", l: "Vùng đất & địa danh", ic: "🗺", g: "Thế giới",
    f: [
      { k: "kind", l: "Loại", t: "sel", o: ["Lục địa", "Vương quốc", "Thành phố", "Làng", "Rừng", "Núi", "Biển", "Hầm ngục", "Di tích", "Khác"] },
      { k: "parent", l: "Thuộc về", t: "text" },
      { k: "img", l: "Ảnh (URL)", t: "img" },
      { k: "geo", l: "Địa dư", t: "area" },
      { k: "note", l: "Sự kiện đáng chú ý", t: "area" },
    ],
    r: [{ k: "element", l: "Hệ chủ đạo", to: "element" }],
  },
  {
    k: "race", l: "Chủng tộc", ic: "🜂", g: "Thế giới", els: 1,
    f: [
      { k: "life", l: "Tuổi thọ", t: "text" },
      { k: "home", l: "Nơi sinh sống", t: "text" },
      { k: "traits", l: "Đặc tính", t: "area" },
      { k: "weak", l: "Điểm yếu", t: "area" },
      { k: "note", l: "Văn hóa", t: "area" },
    ],
    r: [],
  },
  {
    k: "rank", l: "Cấp bậc sức mạnh", ic: "📶", g: "Thế giới",
    f: [
      { k: "lv", l: "Thứ tự", t: "text" },
      { k: "sys", l: "Thuộc hệ thống", t: "sel", o: ["Sức mạnh cá nhân", "Hạng mạo hiểm giả", "Tước vị", "Quân hàm", "Khác"] },
      { k: "note", l: "Mô tả", t: "area" },
      { k: "cond", l: "Điều kiện đạt được", t: "area" },
    ],
    r: [],
  },
  {
    k: "skill", l: "Skill trong truyện", ic: "✦", g: "Sức mạnh", els: 1,
    f: [
      { k: "type", l: "Loại", t: "sel", o: ["Chủ động", "Bị động", "Tuyệt kỹ", "Hỗ trợ", "Khống chế", "Triệu hồi", "Biến hình", "Lãnh vực", "Ám sát", "Cấm thuật", "Phi chiến đấu"] },
      { k: "range", l: "Phạm vi", t: "sel", o: ["Bản thân", "Đơn mục tiêu", "Đồng minh", "Toàn đội", "Diện rộng", "Vùng", "Toàn bản đồ"] },
      { k: "rank", l: "Bậc", t: "rank" },
      { k: "mech", l: "Cơ chế", t: "text" },
      { k: "cost", l: "Cái giá phải trả", t: "text" },
      { k: "unlock", l: "Mở khóa từ chương", t: "text" },
      { k: "folder", l: "Thư mục", t: "text" },
      { k: "src", l: "Nguồn cảm hứng", t: "text" },
      { k: "desc", l: "Mô tả", t: "area" },
      { k: "effect", l: "Hiệu ứng / uy lực", t: "area" },
    ],
    r: [
      { k: "owner", l: "Độc quyền của", to: "char" },
      { k: "school", l: "Thuộc trường phái", to: "school" },
    ],
  },
  {
    k: "school", l: "Trường phái ma thuật", ic: "📜", g: "Sức mạnh", els: 1,
    f: [
      { k: "tier", l: "Cấp hạng", t: "text" },
      { k: "origin", l: "Nguồn gốc", t: "text" },
      { k: "hard", l: "Độ khó", t: "sel", o: ["Dễ", "Trung bình", "Khó", "Cực khó", "Thất truyền"] },
      { k: "desc", l: "Mô tả / xuất xứ", t: "area" },
      { k: "way", l: "Phương thức tu luyện", t: "area" },
      { k: "price", l: "Cái giá", t: "area" },
    ],
    r: [{ k: "learner", l: "Người tu luyện", to: "char" }],
  },
  {
    k: "artifact", l: "Thần khí & trang bị", ic: "💎", g: "Sức mạnh", els: 1,
    f: [
      { k: "tier", l: "Phẩm cấp", t: "text" },
      { k: "kind", l: "Loại", t: "sel", o: ["Vũ khí", "Giáp", "Trang sức", "Vật phẩm đặc biệt", "Di vật", "Khác"] },
      { k: "power", l: "Uy lực", t: "sel", o: ["Thường", "Mạnh", "Rất mạnh", "Cực mạnh", "Không đo được"] },
      { k: "img", l: "Ảnh (URL)", t: "img" },
      { k: "desc", l: "Mô tả / xuất xứ", t: "area" },
      { k: "effect", l: "Hiệu ứng / công năng", t: "area" },
      { k: "curse", l: "Lời nguyền / điều kiện", t: "area" },
    ],
    r: [{ k: "owner", l: "Chủ sở hữu", to: "char" }],
  },
  {
    k: "item", l: "Vật phẩm & nguyên liệu", ic: "🧪", g: "Sức mạnh",
    f: [
      { k: "kind", l: "Loại", t: "sel", o: ["Thuốc hồi phục", "Thuốc tăng lực", "Độc dược", "Nguyên liệu", "Thực phẩm", "Tiêu hao", "Khác"] },
      { k: "tier", l: "Phẩm cấp", t: "text" },
      { k: "price", l: "Giá trị", t: "text" },
      { k: "effect", l: "Công dụng", t: "area" },
      { k: "how", l: "Cách chế tạo", t: "area" },
    ],
    r: [{ k: "land", l: "Tìm thấy ở", to: "land" }],
  },
  {
    k: "beast", l: "Quái vật", ic: "🐉", g: "Thế giới", els: 1,
    f: [
      { k: "danger", l: "Cấp nguy hiểm", t: "rank" },
      { k: "kind", l: "Phân loại", t: "sel", o: ["Thú", "Ma thú", "Undead", "Quỷ", "Tinh linh", "Rồng", "Côn trùng", "Thực vật", "Khác"] },
      { k: "img", l: "Ảnh (URL)", t: "img" },
      { k: "look", l: "Hình dạng", t: "area" },
      { k: "skills", l: "Đòn đánh tiêu biểu", t: "area" },
      { k: "weak", l: "Điểm yếu", t: "area" },
      { k: "drop", l: "Vật phẩm thu được", t: "area" },
    ],
    r: [{ k: "land", l: "Nơi sống", to: "land" }],
  },
  {
    k: "deity", l: "Thần hệ & tôn giáo", ic: "⛩", g: "Thế giới", els: 1,
    f: [
      { k: "domain", l: "Cai quản", t: "text" },
      { k: "status", l: "Tình trạng", t: "sel", o: ["Đang trị vì", "Ngủ say", "Đã chết", "Bị phong ấn", "Truyền thuyết"] },
      { k: "creed", l: "Giáo lý", t: "area" },
      { k: "grace", l: "Ân sủng ban xuống", t: "area" },
      { k: "taboo", l: "Điều cấm kỵ", t: "area" },
    ],
    r: [{ k: "faction", l: "Giáo hội", to: "faction" }],
  },
  {
    k: "domain", l: "Lãnh vực & kết giới", ic: "◎", g: "Sức mạnh", els: 1,
    f: [
      { k: "scale", l: "Quy mô", t: "sel", o: ["Cá nhân", "Một phòng", "Một khu", "Một thành", "Một vùng", "Cả thế giới"] },
      { k: "rule", l: "Luật trong lãnh vực", t: "area" },
      { k: "enter", l: "Điều kiện vào ra", t: "area" },
      { k: "break", l: "Cách phá", t: "area" },
    ],
    r: [
      { k: "owner", l: "Người tạo", to: "char" },
      { k: "land", l: "Bao phủ", to: "land" },
    ],
  },
  {
    k: "contract", l: "Khế ước & triệu hồi thú", ic: "⛓", g: "Sức mạnh", els: 1,
    f: [
      { k: "kind", l: "Loại khế ước", t: "sel", o: ["Linh thú", "Tinh linh", "Ác quỷ", "Vũ khí có linh", "Thần", "Vong linh", "Khác"] },
      { k: "price", l: "Cái giá", t: "text" },
      { k: "desc", l: "Nội dung khế ước", t: "area" },
      { k: "power", l: "Sức mạnh ban cho", t: "area" },
      { k: "broke", l: "Hậu quả khi phá ước", t: "area" },
    ],
    r: [{ k: "owner", l: "Người ký", to: "char" }],
  },
  {
    k: "event", l: "Sự kiện & dòng thời gian", ic: "⏳", g: "Ghi chép",
    f: [
      { k: "when", l: "Thời điểm", t: "text" },
      { k: "ch", l: "Chương liên quan", t: "text" },
      { k: "kind", l: "Loại", t: "sel", o: ["Chiến tranh", "Thiên tai", "Hiệp ước", "Cái chết", "Phát hiện", "Nghi lễ", "Khác"] },
      { k: "desc", l: "Diễn biến", t: "area" },
      { k: "after", l: "Hệ quả", t: "area" },
    ],
    r: [
      { k: "land", l: "Xảy ra tại", to: "land" },
      { k: "who", l: "Người liên quan", to: "char" },
    ],
  },
  {
    k: "lore", l: "Ghi chép & bí mật", ic: "🗝", g: "Ghi chép",
    f: [
      { k: "kind", l: "Loại", t: "sel", o: ["Truyền thuyết", "Lời tiên tri", "Bí mật", "Quy tắc thế giới", "Ngôn ngữ cổ", "Ghi chú cốt truyện", "Lỗ hổng cần vá"] },
      { k: "reveal", l: "Tiết lộ ở chương", t: "text" },
      { k: "body", l: "Nội dung", t: "area" },
      { k: "note", l: "Ghi chú riêng", t: "area" },
    ],
    r: [{ k: "who", l: "Liên quan tới", to: "char" }],
  },
];

/** Hệ nguyên tố mặc định khi tạo thế giới mới: [tên, biểu tượng, màu]. */
export const ELEMENT_SEED: [string, string, string][] = [
  ["Hỏa", "🔥", "#d9532a"],
  ["Thủy", "💧", "#2f86d6"],
  ["Phong", "🌪", "#3fb98f"],
  ["Địa", "⛰", "#a6763c"],
  ["Lôi", "⚡", "#d9b42a"],
  ["Băng", "❄", "#62c6e0"],
  ["Quang", "✨", "#c9a94a"],
  ["Ám", "🌑", "#7a4fbf"],
  ["Không Gian", "🌀", "#4d6fd8"],
  ["Huyết", "🩸", "#a3243c"],
];

export const DEFAULT_RANKS = ["E", "D", "C", "B", "A", "S", "SS", "SSS"];

/** Loại quan hệ nhân vật (Codex). */
export const REL_KINDS: { value: string; color: string }[] = [
  { value: "Gia đình", color: "#c9a94a" },
  { value: "Đồng minh", color: "#5cb5a3" },
  { value: "Thù địch", color: "#c0563c" },
  { value: "Sư đồ", color: "#7a8fd8" },
  { value: "Tình cảm", color: "#c06a9a" },
  { value: "Khác", color: "#8a8398" },
];
