# Câu lệnh: dựng thư viện mẫu cho các loại mục

> Dán toàn bộ file này cho AI trong VS Code.
> Đọc `BANGIAO.md` trước nếu chưa đọc.

---

## Nhiệm vụ

Dự án đã có `SKILL_SEED` — thư viện 914 skill mẫu, chia 24 thư mục, người dùng duyệt rồi bấm "Đưa vào truyện" để sao một bản sửa được.

Làm y hệt như vậy cho **11 loại mục còn lại**: vùng đất, chủng tộc, cấp bậc, quái vật, thần hệ, thế lực, trường phái ma thuật, thần khí, vật phẩm, lãnh vực, khế ước.

---

## QUY TẮC QUAN TRỌNG NHẤT — đọc kỹ trước khi viết một dòng nào

Lấy cảm hứng từ các game và tiểu thuyết liệt kê ở mục cuối, nhưng:

**CẤM tuyệt đối:**
- Chép tên riêng: tên địa danh, tên tổ chức, tên thần, tên quái vật, tên vũ khí, tên nhân vật có thật trong các tác phẩm đó.
- Chép nguyên văn mô tả, lời thoại, đoạn lore từ game hay wiki.
- Viết lại mô tả gốc rồi đổi vài chữ. Đó vẫn là chép.
- Mô tả một thứ cụ thể tới mức người đọc nhận ra ngay nó là cái gì trong game nào.

**Phải làm:**
- Rút ra **khuôn mẫu** (archetype) đằng sau, rồi viết lại hoàn toàn bằng lời của mình, ở dạng chung chung để bất cứ thế giới fantasy nào cũng dùng được.
- Tên đặt mới hoàn toàn, mang tính mô tả hoặc trung tính, không trùng tên trong tác phẩm gốc.

**Ví dụ đúng và sai:**

| Sai (chép) | Đúng (rút khuôn) |
|---|---|
| "Mondstadt — thành của tự do và gió" | "Thành Bang Gió Tự Do — thành bang không vua, lấy một nguyên tố làm biểu tượng, do một hội hiệp sĩ cai quản thay cho vương quyền" |
| "Rhodes Island — tổ chức y tế kiêm quân sự" | "Thương Thuyền Y Tế — tổ chức vừa chữa bệnh vừa cầm vũ khí, di chuyển liên tục vì không nơi nào cho họ ở lại" |
| "Servant lớp Saber" | "Anh Linh Kiếm Sĩ — linh hồn anh hùng quá khứ được triệu hồi, phân loại theo vũ khí sử dụng lúc sinh thời" |
| "Originium — khoáng thạch gây bệnh" | "Khoáng Thạch Nguyền — khoáng vật vừa là nguồn phép thuật vừa là căn bệnh nan y cho người tiếp xúc lâu" |

Nguyên tắc kiểm tra: **đọc mô tả mà không đoán được nó lấy từ game nào, là đạt.**

---

## Định dạng đầu ra

Mỗi loại mục một file riêng. Cấu trúc y hệt `SKILL_SEED`: mảng các mảng, cột cố định, không dùng object để file nhẹ.

> Bản React: file nằm ở `src/data/seeds/<loại>.json` (JSON thuần, không có `const … =`).

- `land` — Vùng đất & địa danh: `[tên, thư mục, loại, thuộc về, địa dư, ghi chú]`; loại: Lục địa | Vương quốc | Thành phố | Làng | Rừng | Núi | Biển | Hầm ngục | Di tích | Khác
- `race` — Chủng tộc: `[tên, thư mục, tuổi thọ, nơi sinh sống, đặc tính, điểm yếu, văn hóa]`
- `rank` — Cấp bậc sức mạnh: `[tên, thư mục, thứ tự, thuộc hệ thống, mô tả, điều kiện đạt được]`; thuộc hệ thống: Sức mạnh cá nhân | Hạng mạo hiểm giả | Tước vị | Quân hàm | Khác. Gom thành **bộ trọn vẹn**: một bộ 8 bậc E→SSS, một bộ hạng mạo hiểm giả, một bộ tước vị quý tộc, một bộ quân hàm, một bộ cấp bậc giáo hội, một bộ thang đo mối nguy. Mỗi bộ là một thư mục.
- `beast` — Quái vật: `[tên, thư mục, cấp nguy hiểm, phân loại, hình dạng, đòn đánh tiêu biểu, điểm yếu, vật phẩm thu được]`; phân loại: Thú | Ma thú | Undead | Quỷ | Tinh linh | Rồng | Côn trùng | Thực vật | Khác
- `deity` — Thần hệ & tôn giáo: `[tên, thư mục, cai quản, tình trạng, giáo lý, ân sủng ban xuống, điều cấm kỵ]`; tình trạng: Đang trị vì | Ngủ say | Đã chết | Bị phong ấn | Truyền thuyết
- `faction` — Thế lực & tổ chức: `[tên, thư mục, phân loại, đẳng cấp, người đứng đầu, tôn chỉ/lịch sử, ghi chú]`; phân loại: Quốc gia | Giáo hội | Gia tộc | Hội mạo hiểm giả | Bang hội | Quân đoàn | Tổ chức ngầm | Khác. Ô "người đứng đầu" ghi **chức danh**, không ghi tên riêng.
- `school` — Trường phái ma thuật: `[tên, thư mục, cấp hạng, nguồn gốc, độ khó, mô tả/xuất xứ, phương thức tu luyện, cái giá]`; độ khó: Dễ | Trung bình | Khó | Cực khó | Thất truyền
- `artifact` — Thần khí & trang bị: `[tên, thư mục, phẩm cấp, loại, uy lực, mô tả/xuất xứ, hiệu ứng/công năng, lời nguyền/điều kiện]`; loại: Vũ khí | Giáp | Trang sức | Vật phẩm đặc biệt | Di vật | Khác; uy lực: Thường | Mạnh | Rất mạnh | Cực mạnh | Không đo được. Món nào cũng phải có **cái giá hoặc điều kiện**.
- `item` — Vật phẩm & nguyên liệu: `[tên, thư mục, loại, phẩm cấp, giá trị, công dụng, cách chế tạo]`; loại: Thuốc hồi phục | Thuốc tăng lực | Độc dược | Nguyên liệu | Thực phẩm | Tiêu hao | Khác
- `domain` — Lãnh vực & kết giới: `[tên, thư mục, quy mô, luật trong lãnh vực, điều kiện vào ra, cách phá]`; quy mô: Cá nhân | Một phòng | Một khu | Một thành | Một vùng | Cả thế giới
- `contract` — Khế ước & triệu hồi thú: `[tên, thư mục, loại khế ước, cái giá, nội dung khế ước, sức mạnh ban cho, hậu quả khi phá ước]`; loại: Linh thú | Tinh linh | Ác quỷ | Vũ khí có linh | Thần | Vong linh | Khác

---

## Số lượng đề xuất

Làm **từng loại một**, xong loại nào commit loại đó.

| Loại | Số lượng | Số thư mục |
|---|---|---|
| Vùng đất | 120 | 8 |
| Chủng tộc | 60 | 5 |
| Cấp bậc | 80 | 6 bộ trọn vẹn |
| Quái vật | 150 | 10 |
| Thần hệ | 60 | 5 |
| Thế lực | 100 | 8 |
| Trường phái | 60 | 5 |
| Thần khí | 120 | 8 |
| Vật phẩm | 100 | 7 |
| Lãnh vực | 60 | 5 |
| Khế ước | 60 | 5 |

Thư mục đánh số hai chữ số ở đầu để sắp xếp đúng thứ tự, giống `SKILL_SEED`: `"01 Thành bang & vương quốc"`, `"02 Hoang dã & vùng chết"`…

---

## Yêu cầu chất lượng

1. **Mô tả ngắn, một tới hai câu.** Người dùng sẽ viết lại theo thế giới của họ, thứ họ cần là ý tưởng chứ không phải văn hay.
2. **Không trùng tên** trong cùng một loại. Kiểm tra bằng script trước khi lưu.
3. **Mỗi thư mục phải khác nhau rõ rệt.** Đừng để thư mục 3 và thư mục 7 chỉ khác cái tên.
4. **Ưu tiên thứ gây ra xung đột truyện.** Một vùng đất có tranh chấp nguồn nước thì đáng giá hơn một vùng đất "đẹp và yên bình". Một chủng tộc có điểm yếu chí mạng thì đáng giá hơn một chủng tộc "mạnh và thông thái".
5. **Viết tiếng Việt.** Tên riêng đặt theo lối Hán Việt hoặc thuần Việt đều được, miễn nhất quán trong cùng một thư mục.
6. Nếu sinh bằng script Python theo khuôn mẫu thì phải kiểm tra dấu tiếng Việt trong toàn bộ output. Lần trước đã có lỗi mất dấu ở nhóm sinh tự động.

---

## Phần giao diện đi kèm

Thêm tab **"Thư viện mẫu"** cho từng loại, dùng lại đúng khuôn của tab thư viện skill đang có:

- Cột trái: danh sách thư mục kèm số lượng.
- Ô tìm kiếm + bộ lọc theo cột phân loại của loại đó.
- Nút **"Bốc ngẫu nhiên 12"** — bắt buộc phải có, đây là cách dùng chính khi kho lớn.
- Bấm vào một mục → hiện chi tiết → nút "Đưa vào truyện" tạo bản sao vào `S.ent[loại]`.

Tốt nhất là viết **một hàm dùng chung** cho cả 12 thư viện, thay vì chép code 12 lần.

---

## Danh sách lấy cảm hứng

Nhớ lại quy tắc ở trên: **rút khuôn, không chép tên.**

Gacha và game chiến thuật: Trickcal RE:VIVE, Stella Sora, Blue Archive, Granblue Fantasy, King's Raid, Epic Seven, Brown Dust 2, Sword Master Story, Arknights, Azur Lane, Girls' Frontline 1 và 2, Destiny Child, Exos Heroes, Outer Plane, Arcana Tactics, King God Castle, Girls X Battle, Dragon Raja, Toram Online, Haze Reverb, Shiba Wars 2, Rellion, Mobile Legends.

miHoYo: Genshin Impact, Honkai: Star Rail, Wuthering Waves.

Nhật: Dragalia Lost, SINoALICE, NieR Reincarnation, Another Eden, Princess Connect Re:Dive, Umamusume, Fire Emblem Heroes, Magia Record, Octopath Traveler: CotC.

Tiểu thuyết: Quỷ Bí Chi Chủ, Toàn Chức Độc Giả, Goblin Slayer.

**Cách dùng danh sách này cho đúng:** đừng đi từng game một rồi liệt kê nội dung của nó. Hãy hỏi ngược lại: *"Trong toàn bộ những tác phẩm này, có bao nhiêu kiểu tổ chức khác nhau? Bao nhiêu kiểu hệ thống cấp bậc? Bao nhiêu kiểu quái vật?"* Rồi viết ra các **kiểu** đó. Đấy là thứ dùng được, và cũng là thứ không vi phạm bản quyền của ai.

Vài kiểu để bắt đầu, tự mở rộng thêm:

- **Thế lực:** hội mạo hiểm giả xếp hạng bằng thẻ · giáo hội độc thần khắt khe · gia tộc phép thuật cha truyền con nối · công ty quân sự tư nhân · học viện đào tạo · liên minh thương nhân · tổ chức ngầm thu thập dị vật · quân đoàn lê dương của kẻ bị ruồng bỏ.
- **Cấp bậc:** thang chữ cái E→SSS · thang màu sắc · thang theo số kẻ đã hạ · thang do hội đồng phong · thang tự xưng không ai công nhận · thang đo mối nguy của tai họa chứ không phải của người.
- **Quái vật:** thú thường đột biến vì môi trường · sinh vật sinh ra từ cảm xúc con người · xác sống do lời nguyền · thứ đến từ thế giới khác · sinh vật vốn là người · tai họa cấp thiên nhiên không thể giết chỉ có thể tránh.
- **Thần hệ:** thần đã chết nhưng giáo hội vẫn vận hành · thần ngủ say thỉnh thoảng mơ thấy thế giới · thần do người tin mà sinh ra · thần bị phong ấn đang tìm cách thoát · thần cai quản một khái niệm chứ không phải một vùng đất.
