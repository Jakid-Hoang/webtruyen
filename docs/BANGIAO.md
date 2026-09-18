# Codex Fantasy — Tài liệu bàn giao

> Đọc hết file này trước khi sửa bất cứ dòng code nào.
> File code: `codex.html` (một file duy nhất, đã chạy được, khoảng 197 KB).

---

## 1. Dự án là gì

Web kết hợp hai thứ:

1. **Wiki xây dựng thế giới fantasy** — quản lý nhân vật, chủng tộc, thế lực, skill, thần khí, quái vật…
2. **Nơi viết và đăng truyện** — soạn thảo chương, đọc, và **tự động lập chỉ mục** nơi từng nhân vật/skill/địa danh xuất hiện.

Điểm khác biệt cốt lõi so với các wiki khác: người dùng **không phải gõ tay** "nhân vật này xuất hiện ở chương 1, 42, 100". Hệ thống tự dò tên trong văn bản và chỉ ra chương nào, đoạn nào, kèm đoạn trích.

Ngôn ngữ giao diện: **tiếng Việt**. Mọi nhãn, thông báo, tên biến hiển thị đều tiếng Việt. Giữ nguyên.

---

## 2. Tình trạng hiện tại

| Hạng mục | Trạng thái |
|---|---|
| 15 loại mục dựng sẵn + tự tạo thêm loại mới | Xong |
| Bảng hệ nguyên tố + ma trận khắc chế | Xong |
| Thư viện 914 skill mẫu, 24 thư mục | Xong |
| Kết hợp (hợp thành) skill | Xong |
| Trình viết truyện, tự lưu, đếm chữ | Xong |
| Chỉ mục tự động (chương · đoạn · trích dẫn) | Xong |
| Dò tên lạ, đề xuất tạo hồ sơ | Xong |
| Kiểm tra mâu thuẫn logic (3 loại) | Xong |
| Thời đại (era) | Xong |
| Thống kê | Xong |
| Tìm toàn cục Ctrl+K, hoàn tác Ctrl+Z | Xong |
| **Lưu trữ đám mây** | **Chưa — đang dùng localStorage** |
| **Đăng nhập, độc giả đọc, bình luận** | **Chưa** |
| Sơ đồ quan hệ dạng đồ thị | Chưa (mới là danh sách) |
| Bản đồ thế giới có ghim | Chưa |
| Xuất EPUB/PDF/DOCX | Chưa |

---

## 3. Cấu trúc dữ liệu

Toàn bộ trạng thái nằm trong một biến `S`, lưu vào `localStorage` dưới khóa `codex_fantasy_v2`.

```js
S = {
  world:    { name, tagline, desc, ranks: [] },   // ranks: ["E","D","C","B","A","S","SS","SSS"]
  eras:     [ { id, name, note } ],               // thời đại
  eraId:    "id_thoi_dai_dang_chon",
  elements: [ { id, name, icon, color, desc } ],  // hệ nguyên tố
  counters: [ [idA, idB] ],                       // A khắc B
  ent: {                                          // toàn bộ thực thể, gom theo loại
    char:     [ entity ],
    faction:  [ entity ],
    land:     [ entity ],
    // … 15 loại, xem mục 4
  },
  chapters: [ { id, title, content, status } ],   // status: "nháp" | "đã xong" | "đã đăng"
  custom:   [ typeDef ],                          // loại mục người dùng tự tạo
  ignore:   [ "tên bị bỏ qua khi dò" ],
  ui:       { tab }
}
```

Một `entity` (dùng chung cho **mọi** loại mục):

```js
{
  id, eraId,          // eraId = null nghĩa là "xuyên suốt mọi thời đại"
  name,               // dùng để dò trong truyện
  aliases,            // chuỗi, ngăn bằng dấu phẩy — cũng được dò
  icon,
  els:  [elementId],  // các hệ, chỉ với loại có cờ els:1
  f:    {},           // giá trị các ô thông tin, khóa theo field.k
  r:    {},           // liên kết tới thực thể khác: { skill:[id,id], faction:[id] }
  aff:  {},           // chỉ nhân vật: độ thuần thục từng hệ, { elementId: 0-100 }
  rel:  [],           // chỉ nhân vật: [{ to, kind, note }]
  recipe: [idA, idB]  // chỉ skill hợp thành
}
```

**Nguyên tắc thiết kế quan trọng:** mọi loại mục dùng chung một khuôn `entity`. Đừng tạo class riêng cho từng loại. Muốn thêm loại mục mới thì thêm một phần tử vào mảng `TYPES`, không viết thêm hàm render.

---

## 4. Bảng khai báo loại mục (`TYPES`)

Đây là trái tim của kiến trúc. Mỗi loại mục là **dữ liệu**, không phải code:

```js
{
  k: "char",              // khóa, dùng làm key trong S.ent
  l: "Nhân vật",          // nhãn hiển thị
  ic: "👤",               // biểu tượng
  g: "Nhân sự",           // nhóm trong sidebar
  els: 1,                 // 1 = loại này gán được hệ nguyên tố
  f: [                    // các ô thông tin
    { k:"role", l:"Vai trò", t:"sel", o:["Nhân vật chính", …] }
  ],
  r: [                    // liên kết tới loại khác
    { k:"skill", l:"Skill", to:"skill" }
  ]
}
```

Kiểu ô (`t`): `text` · `area` (ô dài) · `sel` (chọn, cần `o`) · `rank` (lấy từ `S.world.ranks`) · `img` (URL ảnh).

15 loại hiện có: `char` `faction` `land` `race` `rank` `skill` `school` `artifact` `item` `beast` `deity` `domain` `contract` `event` `lore`.

**Thêm loại mục mới = thêm một object vào `TYPES`.** Sidebar, trang danh sách, trang chi tiết, chỉ mục tự động, thống kê đều tự động có. Đừng viết trang riêng.

---

## 5. Các thuật toán cần giữ nguyên

### 5.1 Chỉ mục tự động — `index()`

Duyệt mọi chương, mọi đoạn, dò tên + biệt danh của **mọi** thực thể.

- Sắp xếp mục tiêu theo độ dài giảm dần, để "Thành Ashgard" khớp trước "Ashgard".
- Kiểm tra biên từ bằng `\p{L}\p{N}_` (Unicode) — bắt buộc, vì tiếng Việt có dấu.
- Không cho hai kết quả chồng lấn nhau trong cùng một đoạn.
- Trả về `{ by, ch }`: `by["char:id"]` = danh sách nơi xuất hiện; `ch[chapterId].marks` = vị trí để tô sáng.
- Có cache, dọn bằng cờ `dirty` trong `save()`.

### 5.2 Dò tên lạ — `candidates()`

Tìm cụm từ viết hoa **chưa có hồ sơ**.

- Tiếng Việt viết hoa đầu câu nên chữ đầu câu không đáng tin. Thuật toán **đếm riêng số lần xuất hiện giữa câu** (`mid`), và chỉ giữ ứng viên có `mid > 0` hoặc xuất hiện từ 3 lần trở lên.
- Có danh sách `STOP` khoảng 130 từ hay bị hoa oan ("Nhưng", "Nàng", "Hắn", "Trời"…).
- Gộp tối đa 4 từ hoa liên tiếp thành một cụm.

Đây là thuật toán khó nhất trong dự án và đã chỉnh cho tiếng Việt. **Không viết lại.** Nếu cần cải thiện thì mở rộng `STOP` hoặc chỉnh ngưỡng, đừng đổi cách tiếp cận.

### 5.3 Hợp thành skill — `mix(a, b)`

Gộp hệ, nâng bậc lên một nấc, ưu tiên loại "nặng" (Tuyệt kỹ, Lãnh vực, Biến hình, Triệu hồi, Cấm thuật), lấy phạm vi rộng hơn, ghép cơ chế, ghép tên.

### 5.4 Thư viện skill — `SKILL_SEED`

Mảng 914 phần tử, mỗi phần tử: `[tên, thư mục, loại, phạm vi, cơ chế, mô tả, nguồn cảm hứng]`.

**Chỉ đọc.** Người dùng bấm "Đưa vào truyện" thì tạo bản sao vào `S.ent.skill`. Cố tình tách như vậy: nếu nạp cả 914 vào dự án thì chỉ mục tự động sẽ dò nhầm loạn xạ và localStorage phình to.

---

## 6. Việc tiếp theo — nối Supabase

Kế hoạch đã chốt: **HTML/CSS/JS + Supabase + GitHub + Vercel. Không dùng Java.**
Lý do: Supabase tự sinh REST API cho mỗi bảng, phân quyền bằng Row Level Security. Thêm backend Java sẽ cần thuê thêm server (Vercel không chạy Java) mà không giải quyết được vấn đề gì.

### Sơ đồ bảng đề xuất

```sql
projects   (id, owner_id, name, tagline, desc, ranks jsonb, created_at)
eras       (id, project_id, name, note, sort)
elements   (id, project_id, name, icon, color, desc)
counters   (project_id, from_id, to_id)
entities   (id, project_id, type_key, era_id, name, aliases,
            icon, els jsonb, f jsonb, r jsonb, aff jsonb, rel jsonb, recipe jsonb)
chapters   (id, project_id, title, content, status, sort, published_at)
custom_types (id, project_id, def jsonb)
-- về sau, khi mở cho độc giả:
comments   (id, chapter_id, user_id, body, created_at)
progress   (user_id, project_id, chapter_id, updated_at)
```

Dùng `jsonb` cho `f` và `r` là cố ý: giữ được kiến trúc "loại mục khai báo bằng dữ liệu". Nếu tách mỗi loại mục thành một bảng riêng thì mất hẳn khả năng tự tạo loại mục mới.

### Thứ tự nên làm

1. Tách `codex.html` thành `index.html` + `css/style.css` + `js/` (xem mục 7).
2. Bọc mọi chỗ đọc/ghi hiện tại vào một lớp trung gian, ví dụ `store.js` với `load()` / `save()` / `query()`. **Hiện tại code gọi thẳng `localStorage`, phải bọc lại trước khi nối Supabase.**
3. Cho `store.js` hai chế độ: `local` (như bây giờ) và `cloud` (Supabase). Giữ chế độ local để chạy offline.
4. Thêm đăng nhập Supabase Auth.
5. Bật Row Level Security: tác giả sửa được dự án của mình; độc giả chỉ đọc được chương có `status = 'đã đăng'`.
6. Trang đọc công khai + bình luận.

---

## 7. Đề xuất tách file

```
index.html          khung HTML + sidebar
css/style.css       toàn bộ CSS (đang nằm trong thẻ <style>)
js/types.js         mảng TYPES — khai báo 15 loại mục
js/skills.js        SKILL_SEED — 914 skill (chỉ đọc, đừng sửa tay)
js/store.js         lớp lưu trữ: localStorage hôm nay, Supabase ngày mai
js/index.js         thuật toán chỉ mục + dò tên lạ
js/views.js         các hàm render
js/app.js           đối tượng A — mọi hành động của người dùng
```

Tách vì: một file 197 KB khiến mỗi lần sửa một chữ thì git ghi nhận cả file, không đọc được lịch sử.

---

## 8. Quy tắc khi sửa

1. **Không viết lại từ đầu.** Sửa từng phần, chạy thử, commit, rồi mới sửa tiếp.
2. **Không đổi cấu trúc `S`** mà không viết hàm chuyển đổi dữ liệu cũ. Người dùng đã có dữ liệu thật trong trình duyệt.
3. **Không đổi giao diện sang tiếng Anh.**
4. **Không thêm framework** (React, Vue…) nếu chỉ để "cho hiện đại". Dự án cố tình dùng JS thuần để người chủ dự án — vốn không phải lập trình viên — còn đọc và sửa được.
5. **Không đụng `candidates()` và `index()`** trừ khi có lý do rõ ràng. Đã chỉnh riêng cho tiếng Việt.
6. Trước khi thêm trang mới, kiểm tra xem có thêm được bằng cách khai báo trong `TYPES` không.
7. Luôn giữ nút xuất/nhập JSON hoạt động. Đó là đường thoát duy nhất khi dữ liệu có sự cố.

---

## 9. Kiểm thử nhanh sau mỗi lần sửa

1. Tạo một nhân vật tên `Lyra`, biệt danh `Kiếm Thánh, cô gái tóc bạc`.
2. Viết một chương có đủ ba cách gọi đó.
3. Mở hồ sơ Lyra → mục "Nơi xuất hiện" phải hiện **3 lần · 1 chương**.
4. Bấm vào một kết quả → nhảy sang trang đọc, cuộn đúng đoạn, tô sáng.
5. Vào "Dò tên lạ" → không được đề xuất `Lyra`, cũng không được đề xuất `Nhưng` hay `Sau đó`.
6. Vào Thư viện skill → lọc thư mục `19 Boss & quái vật` phải ra đúng 32 thẻ.
7. Bấm "Bốc ngẫu nhiên 12" → ra đúng 12 thẻ.
8. Tải file JSON rồi nạp lại → dữ liệu phải y nguyên.
