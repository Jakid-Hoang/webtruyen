# Thay đổi phiên tối nay — v1.4 → v1.6

> Chỉ gồm những gì bàn và sửa trong phiên này. Không nhắc lại phần cũ.
> File code kèm theo: `codex.html` v1.6 — đã làm xong toàn bộ, mở ra xem cách làm.

---

## 1. Tên tiếng Anh + một dòng mô tả tiếng Việt

### Vấn đề

Tên tiếng Việt kiểu `Đấng Quang Minh Tịch Diệt` nghe như truyện dịch, mất chất fantasy. Hán Việt chồng bốn năm chữ là nguyên nhân.

### Giải pháp

Mỗi mục giờ có **hai phần tên**:

```js
entity.name  = "The Bell-Bearer"                 // tiếng Anh, hiện to
entity.gloss = "Thứ đeo chuông đi trong sương"   // tiếng Việt, hiện nhỏ ngay dưới
```

### `gloss` KHÔNG phải bản dịch của `name`

Đây là chỗ dễ làm sai nhất.

| Sai — dịch tên | Sai — Hán Việt chồng chất | Đúng — nói nó là cái gì |
|---|---|---|
| `Chó Tro` | `Hôi Viêm Khuyển` | `Chó hoang sống quanh đống tro của làng cháy` |
| `Lũng Sắt` | `Thiết Cốc Trấn` | `Thị trấn mỏ sắt đã cạn, dân bỏ đi quá nửa` |
| `Ánh Sáng Tắt` | `Đấng Quang Minh Tịch Diệt` | `Thần ánh sáng đã chết, giáo hội vẫn hoạt động` |

Hai quy tắc bắt buộc:

1. **Cấm ghép quá ba chữ Hán Việt liền nhau.**
2. **Gloss phải thêm thông tin mới**, không lặp lại thứ tên đã nói.

### Chỗ cần sửa trong code

- Thêm thuộc tính `gloss` vào entity (ngang hàng `name`, không nằm trong `f`).
- Trang chi tiết: ô nhập **"Mô tả một dòng — hiện ngay dưới tên"**, đặt ngay trên ô biệt danh.
- Header trang chi tiết: hiện `gloss` dưới `name`, cỡ chữ nhỏ.
- Danh sách bên trái: `subLine()` ưu tiên hiện `gloss` trước các trường khác.
- Cập nhật tại chỗ khi gõ, không vẽ lại cả trang (kẻo mất con trỏ).

### Máy đặt tên

Bảng `MEAN` đổi từ Hán Việt sang **tiếng Việt thường, chữ thường**:

```js
// CŨ:  Iron:"Sắt", combe:"Lũng", Shadow:"Ảnh", Silver:"Ngân", Red:"Xích"
// MỚI: Iron:"sắt", combe:"lũng", Shadow:"bóng tối", Silver:"bạc", Red:"đỏ"
```

Và **đảo thứ tự ghép** cho xuôi tiếng Việt — danh từ trước, bổ nghĩa sau:

```js
// CŨ:  MEAN[x] + " " + MEAN[y]   →  "Sắt Lũng"      (sai ngữ pháp Việt)
// MỚI: MEAN[y] + " " + MEAN[x]   →  "lũng sắt"      (đúng)
```

Kết quả: `Mount Saltmoor` → *"Núi truông muối"*, `The Isle of Bleakscar` → *"Đảo vách nứt hoang vắng"*.

Gloss máy sinh chỉ là **gợi ý để ô không trống**. Dữ liệu thư viện vẫn phải viết tay cho ra thông tin thật.

---

## 2. Loại mục mới: Nghề nghiệp & Class

### Vì sao cần

Rất nhiều game **không có hệ nguyên tố**, chúng chia nhân vật theo class. Bỏ sót mảng này là bỏ sót một nửa cách xây nhân vật.

### Khai báo

Thêm vào `TYPES`, key `job`, nhóm `"Sức mạnh"`, có gán hệ:

```js
{k:"job", l:"Nghề nghiệp & Class", ic:"⚔", g:"Sức mạnh", els:1,
 f:[{k:"kind",  l:"Nhóm",     t:"sel", o:["Cận chiến","Tầm xa","Phép thuật","Hỗ trợ","Hỗn hợp","Sản xuất","Ẩn"]},
    {k:"tier",  l:"Bậc nghề", t:"sel", o:["Sơ cấp","Trung cấp","Cao cấp","Chuyển chức","Nghề ẩn","Độc nhất"]},
    {k:"weapon",l:"Vũ khí tiêu biểu",   t:"text"},
    {k:"role",  l:"Vai trò trong đội",  t:"text"},
    {k:"from",  l:"Chuyển lên từ",      t:"text"},
    {k:"cond",  l:"Điều kiện chuyển chức", t:"area"},
    {k:"desc",  l:"Mô tả",     t:"area"},
    {k:"weak",  l:"Điểm yếu",  t:"area"}],
 r:[{k:"skill",  l:"Skill tiêu biểu",        to:"skill"},
    {k:"school", l:"Trường phái liên quan",  to:"school"}]}
```

Nhớ thêm khuôn tên vào **cả** `NPAT.vi.job` và `NPAT.en.job`, nếu không nút 🎲 sẽ không hiện cho loại này.

---

## 3. Thư mục phần truyện

### Dữ liệu

```js
S.sections = [ { id, name } ];          // "Phần 1", "Quyển Hạ", "Ngoại truyện"
chapter.sectionId = "id phần" | null;   // null = chưa xếp
```

### Giao diện

- Nút **"+ Phần"** ở đầu danh sách chương.
- Tên phần sửa tại chỗ bằng ô input, không mở hộp thoại.
- Mỗi chương có ô chọn thuộc phần nào, đặt ngay dưới thanh công cụ soạn thảo.
- Chương chưa xếp gom vào nhóm **"Chưa xếp phần"** ở cuối, **không giấu đi**.
- Xóa phần thì chương bên trong chuyển thành chưa xếp, **không xóa chương**.

Xem hàm `chapterTree()` trong `codex.html`.

---

## 4. Tab mới: Tóm tắt cốt truyện

Tab trong nhóm Sáng tác, key `recap`. Dữ liệu lưu trong `chapter.r`:

```js
chapter.r = {
  hook:   "",  // móc câu mở đầu
  pov:    "",  // kể từ mắt ai
  main:   "",  // diễn biến chính
  change: "",  // thay đổi sau chương này
  open:   ""   // câu hỏi còn treo
}
```

Trang liệt kê toàn bộ chương, nhóm theo phần, mỗi chương một thẻ có năm ô trên. Dưới mỗi thẻ hiện danh sách nhân vật mà chỉ mục tự động nhận ra trong chương đó.

Tiêu đề trang hiện tiến độ: `7 / 20 chương đã tóm tắt`.

Ô **"Câu hỏi còn treo"** là ô quan trọng nhất — nó cho phép dò lỗ hổng cốt truyện: chương nào mở ra câu hỏi mà không chương nào trả lời.

---

## 5. Lỗi cần vá: không đổi được tên chương

Bấm thêm chương mới, gõ vào ô tiêu đề thì danh sách bên trái không đổi theo.

Cách vá: cập nhật thẳng phần tử DOM, **đừng vẽ lại cả trang** vì vẽ lại sẽ làm mất con trỏ đang gõ.

```js
setCh(k, v){
  const c = byId(S.chapters, sel.chapter); if(!c) return;
  c[k] = v; save();
  if(k === "title"){
    const n = el("chName_" + c.id);
    if(n) n.textContent = v || ("Chương " + (S.chapters.indexOf(c) + 1));
  }
  if(k === "sectionId") setTimeout(render, 300);
}
```

Muốn vậy thì mỗi mục trong danh sách chương phải có `id="chName_<id chương>"`.

---

## 6. Registry `LIBS` — thư viện dùng chung một giao diện

Thay vì chép code thư viện skill ra nhiều lần, gom về một registry:

```js
const LIBS = {
 skill:{l:"Skill",     seed:()=>SKILL_SEED, type:"skill", gloss:-1, folder:1,
   map:{type:2,range:3,mech:4,desc:5,src:6},
   crown:[2,3], body:5, tags:[4,6], filt:{col:2, l:"loại"}},
 race: {l:"Chủng tộc", seed:()=>RACE_SEED,  type:"race",  gloss:1,  folder:2,
   map:{life:3,home:4,traits:5,weak:6,note:7},
   crown:[3,4], body:5, tags:[4], filt:null},
 beast:{l:"Quái vật",  seed:()=>BEAST_SEED, type:"beast", gloss:1,  folder:2,
   map:{danger:3,kind:4,look:5,skills:6,weak:7,drop:8},
   crown:[4,3], body:5, tags:[7], filt:{col:4, l:"phân loại"}}
};
```

- `gloss` — chỉ số cột mô tả, `-1` nếu kho đó không có.
- `folder` — chỉ số cột thư mục.
- `map` — khóa trường trong `TYPES` ứng với chỉ số cột nào.
- `crown` / `body` / `tags` — cột nào hiện ở đâu trên thẻ.
- `filt` — cột dùng làm bộ lọc thả xuống.

Trang thư viện có ô chọn nguồn ở góc trái. Cây thư mục, tìm kiếm, nút **Bốc ngẫu nhiên 12**, nút **Đưa vào truyện** đều dùng chung.

**Thêm một thư viện mới = thêm một dòng vào `LIBS` + một mảng dữ liệu. Không đụng tới giao diện.**

---

## 7. Thư viện Chủng tộc — 66 mục, 9 thư mục

Định dạng: `[tên, gloss, thư mục, tuổi thọ, nơi sống, đặc tính, điểm yếu, văn hóa]`

Thư mục: Nhân hình cổ điển (16) · Thú nhân (11) · Thủy tộc (5) · Long tộc & huyền thú (5) · Tiên & tinh linh (6) · Bất tử & undead (7) · Quỷ, thiên thần & bán thần (5) · Nhân tạo (5) · Dị hình (6)

### Chuẩn: mỗi chủng tộc phải có đủ ba thứ

1. **Một điểm yếu thật.** Không phải "sợ lửa". Kiểu: *không nói dối được*, *rời quê quá một năm thì yếu dần*, *cây bị chặt thì chết theo*.
2. **Một nét văn hóa lạ.** *Coi việc quên là tội* · *có tang lễ cho kiếm* · *lịch sử của họ là một cuốn sổ bếp*.
3. **Một mâu thuẫn dùng được.** Ai ghét họ, vì chuyện gì.

Thiếu một trong ba là chủng tộc vô dụng với người viết truyện.

### Bắt buộc có, không được bỏ sót

Bản trước bỏ qua toàn bộ chủng tộc phổ biến. Đó là lỗi nặng — người dùng cần thứ quen thuộc trước, rồi mới cần thứ lạ:

elf (nhiều nhánh) · dwarf · halfling · gnome · orc · half-orc · goblin · hobgoblin · kobold · troll · ogre · cự nhân · thú nhân (sói, mèo, chim, thằn lằn, chuột, gấu, centaur, minotaur, harpy) · merfolk · siren · long tộc · half-dragon · fae · tinh linh nguyên tố · dryad · vampire · dhampir · revenant · lich · ghoul · quỷ · thiên thần · bán thần · golem · automaton · homunculus · slime · doppelganger · côn trùng tộc · thực vật tộc

---

## 8. Thư viện Quái vật — 72 mục, 4 tầng

Định dạng: `[tên, gloss, thư mục, cấp nguy hiểm, phân loại, hình dạng, đòn đánh, điểm yếu, vật phẩm]`

### Bốn tầng

| Tầng | Vai trò | Hiện có | Nên lên tới |
|---|---|---|---|
| Thú nền & sinh vật hoang dã | Gặp hàng ngày, làm người đọc quen với thế giới | 25 | 60 |
| Quái có tên & truyền thuyết địa phương | Dân địa phương đặt tên, có truyền thuyết riêng | 25 | 70 |
| Đầu lĩnh & kẻ canh giữ | Cản một chương, phải đánh đổi mới thắng | 15 | 40 |
| Tai họa cấp thế giới | Không giết được, chỉ tránh hoặc phong ấn | 7 | 15 |

Tầng "có tên" là tầng đáng đầu tư nhất. Đó là nơi truyện sống.

### Công thức: bốn câu hỏi

Mỗi con phải trả lời được cả bốn:

1. **Nhìn vào thấy cái gì sai?** Một chi tiết lệch khỏi tự nhiên. *Hươu có chín mắt. Quạ bụng rỗng nhìn xuyên qua được. Cái bóng không khớp với tư thế người tạo ra nó.*
2. **Nó từng là gì?** Thứ đáng sợ thường là thứ từng là cái khác. *Người lính về nhà sau chiến tranh, chỉ là chiến tranh kết thúc từ lâu.*
3. **Nó muốn gì?** Không phải "ăn thịt người". *Muốn về nhà. Muốn được gọi đúng tên. Muốn ai đó thay nó canh giữ.*
4. **Nó để lại gì?** Vật phẩm phải nói lên điều gì đó. *Một cái chuông, ai giữ sẽ nghe tiếng bước chân mỗi đêm.*

### Cấm

- Tên kiểu `Hắc Ám Cự Lang`. Dùng `Hollow Hound` / `The Bell-Bearer` kèm gloss tiếng Việt.
- Mô tả bằng chỉ số: "rất mạnh, phòng thủ cao, kháng lửa". Viết cảnh tượng, không viết bảng số.
- Lấy tên và tạo hình có sẵn từ game nào. Rút khuôn, đặt tên mới.

**Lý do quái vật trong game thường nhạt:** chúng được thiết kế để *bị giết*. Quái vật trong truyện phải được thiết kế để *bị gặp*.

---

## 9. Kiểm thử phần mới

Chạy sau khi sửa xong:

1. Thư viện mẫu → đổi nguồn sang **Quái vật** → phải ra 72 thẻ, 4 thư mục.
2. Đổi nguồn sang **Chủng tộc** → 66 thẻ, 9 thư mục.
3. Mở một thẻ quái vật, bấm **Đưa vào truyện** → mục mới phải có đủ 6 trường: cấp nguy hiểm, phân loại, hình dạng, đòn đánh, điểm yếu, vật phẩm. Và có `gloss`.
4. Máy đặt tên → tiếng Anh, Vùng đất, phong cách Anglo → gloss phải ra dạng *"Núi truông muối"*, **không** ra *"Sắt Lũng"*.
5. Viết truyện → bấm **"+ Phần"**, đổi tên phần, gán một chương vào → danh sách bên trái phải nhóm lại theo phần.
6. Gõ vào ô tiêu đề chương → tên trong danh sách bên trái đổi theo ngay, con trỏ **không** bị nhảy.
7. Tab **Tóm tắt** → nhập "Diễn biến chính" cho một chương → tiêu đề trang cập nhật số đã tóm tắt.
8. Sidebar phải có loại mục **Nghề nghiệp & Class**.
9. Tải file JSON rồi nạp lại → dữ liệu y nguyên, `gloss` và `sections` không mất.

---

## 10. Việc tiếp theo

Chín loại mục còn chưa có thư viện mẫu. Làm theo đúng cách của `RACE_SEED` và `BEAST_SEED`, đăng ký vào `LIBS`:

vùng đất (120) · thế lực (100) · nghề nghiệp (100) · thần khí (120) · vật phẩm (100) · trường phái (60) · lãnh vực (60) · khế ước (60) · cấp bậc (80, gom thành bộ trọn vẹn chứ không rời rạc)

Làm **từng loại một**, xong loại nào commit loại đó rồi dừng lại báo.
