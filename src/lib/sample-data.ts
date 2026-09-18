import { normalizeWorld, type WorldData } from "@/lib/schema/world";

/** Starter world shown on first launch. Fully original example content. */
const raw = {
  eras: [
    {
      id: "e1",
      name: "Kỷ Nguyên Khởi Đầu",
      worldStructure: [
        {
          id: "l1",
          name: "Lạc Hà Châu",
          summary: "Vùng đồng bằng ven sông ở phía nam đại lục, nơi linh khí mỏng nhưng ổn định.",
          factions: [
            {
              id: "f1",
              name: "Vọng Nguyệt Các",
              description: "Tông môn nhỏ chuyên về trận pháp, ẩn mình trên đỉnh núi sương mù.",
              factionCategory: "tong_mon",
              factionRank: "tam_dang",
            },
            {
              id: "f2",
              name: "Hắc Thạch Bang",
              description: "Bang hội buôn khoáng thạch, kiểm soát bến sông Lạc Hà.",
              factionCategory: "to_chuc",
              factionRank: "",
            },
          ],
        },
      ],
      characters: [
        {
          id: "c1",
          name: "Lâm Tịch Dao",
          nickname: "Trận Nữ",
          gender: "female",
          age: "17",
          status: "alive",
          locationId: "l1",
          factionId: "f1",
          raceId: "race1",
          cultivation: "Luyện Khí",
          context: "Đệ tử ngoại môn Vọng Nguyệt Các",
          currentIdentity: "Đệ tử quét dọn tàng thư lâu",
          hiddenIdentity: "Truyền nhân của một trận sư đã thất truyền",
          firstChapter: "1",
          cardAccent: "#a855f7",
        },
      ],
      cultivationArts: [
        {
          id: "ca1",
          name: "Tinh Hà Quyết",
          rank: "Địa Giai Trung Phẩm",
          element: "Thủy",
          origin: "Vọng Nguyệt Các",
          difficulty: "Trung bình",
          description: "Tâm pháp dẫn linh khí theo quỹ đạo các vì sao.",
          effect: "Tăng tốc độ hồi phục linh lực vào ban đêm.",
          ownerIds: ["c1"],
          charData: { c1: { progress: "Tiểu thành", chapter: "2" } },
        },
      ],
      treasures: [
        {
          id: "t1",
          name: "Bích Lạc Cầm",
          rank: "Phàm Giai",
          type: "Hỗ trợ",
          power: "Trung bình",
          ownerId: "c1",
          description: "Cây đàn gỗ ngô đồng khảm ngọc bích.",
          effect: "Tiếng đàn có thể làm nhiễu loạn thần thức đối thủ.",
          acquiredChapter: "3",
        },
      ],
      powerSystems: [
        {
          id: "ps1",
          name: "Tu Tiên",
          description: "Con đường hấp thụ linh khí trời đất để thoát thai hoán cốt.",
          majorRealms: [
            {
              id: "mr1",
              name: "Luyện Khí",
              tier: "Luyện Khí",
              order: 0,
              powerIndex: "10",
              description: "Dẫn khí nhập thể, rèn luyện kinh mạch.",
              lifespan: "~120 năm",
              subRealms: [
                { id: "sr1", name: "Luyện Khí Sơ Kỳ", order: 0, powerIndex: "5" },
                { id: "sr2", name: "Luyện Khí Hậu Kỳ", order: 1, powerIndex: "15" },
              ],
            },
            {
              id: "mr2",
              name: "Trúc Cơ",
              tier: "Trúc Cơ",
              order: 1,
              powerIndex: "40",
              description: "Đúc nền đạo cơ, linh lực hoá lỏng.",
              lifespan: "~250 năm",
              breakthroughReq: "Cần Trúc Cơ Đan hoặc cơ duyên lớn.",
            },
          ],
        },
      ],
      races: [
        {
          id: "race1",
          name: "Nhân Tộc",
          emoji: "🧑",
          summary: "Chủng tộc đông đảo nhất, thiên phú bình thường nhưng thích nghi tốt.",
          genders: ["binary"],
          lifespan: "~100 năm (phàm nhân)",
        },
      ],
      ingredients: [{ id: "ing1", name: "Sương Nguyệt Thảo", rarity: "Trung bình", appearance: "Lá bạc, chỉ nở dưới trăng." }],
      recipes: [{ id: "rec1", name: "Đan phương Ngưng Khí", rarity: "Nhất Phẩm", ingredientIds: ["ing1"] }],
      pills: [{ id: "p1", name: "Ngưng Khí Đan", rank: "Nhất Tinh", type: "Tăng lực", recipeId: "rec1", effect: "Tăng nhẹ linh lực." }],
    },
  ],
};

export function createSampleWorld(): WorldData {
  const result = normalizeWorld(structuredClone(raw));
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
