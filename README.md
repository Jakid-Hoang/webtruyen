# Codex — wiki thế giới fantasy & nơi viết truyện

Quản lý thế giới fantasy (nhân vật, chủng tộc, thế lực, skill, thần khí, quái vật… + bảng hệ nguyên tố và khắc chế) kèm phòng viết truyện theo chương, xuất/nhập Word và Google Docs. Dữ liệu wiki dùng đúng định dạng JSON của Codex (`codex.html`), nên file cũ nạp được.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Base UI) · Zustand + zundo · Zod · Dexie (IndexedDB) · Tiptap 3.

## Chạy local

```bash
npm install
cp .env.example .env.local   # tuỳ chọn, xem "Cấu hình Google Docs"
npm run dev                  # http://localhost:3000
```

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/lib/codex/types.ts` | **`TYPES`** — 15 loại mục khai báo bằng dữ liệu. Thêm loại mục = thêm một object, không viết trang riêng |
| `src/lib/codex/schema.ts` | Schema zod của `S` (world, eras, elements, counters, ent, custom, ignore), đọc được JSON Codex |
| `src/lib/codex/algorithms.ts` | Chép nguyên từ Codex: **`buildIndex`** (chỉ mục tự động), **`candidates`** (dò tên lạ + danh sách `STOP`), **`mix`** (hợp thành skill), **`check`** (kiểm tra mâu thuẫn). Đã chỉnh cho tiếng Việt — đừng viết lại |
| `src/data/skill-seed.json`, `src/data/seeds/*.json` | **Thư viện mẫu** cho 13 loại mục. Định dạng v1.6: `[tên (tiếng Anh), gloss (một dòng tiếng Việt), thư mục "01 …", …]`; riêng kho skill là định dạng cũ, không có gloss. **Chỉ đọc**; “Đưa vào truyện” tạo bản sao. Khai báo cột ở `src/lib/codex/seed-libraries.ts` — thêm thư viện mới = một dòng cấu hình + một file JSON, không sửa giao diện |
| `src/lib/codex/name-gen.ts`, `src/data/name-banks.json` | Máy đặt tên: kho âm, biệt hiệu, khuôn tên theo từng loại mục |
| `src/store/codex-store.ts` | Store wiki + hoàn tác, dọn liên kết khi xoá |
| `src/features/codex/*` | Trang thế giới & hệ, trang chung cho mọi loại mục, đọc & kiểm tra, dò tên lạ, thư viện skill, hợp thành, thống kê |
| `docs/` | `BANGIAO.md` (tài liệu bàn giao) và `codex.html` (bản gốc JS thuần) để tham khảo |
| `src/lib/writing/*` | Viết truyện: lưu trữ (Dexie), chuyển đổi HTML/DOCX/MD/TXT, Google Drive |
| `src/features/writing/*` | Giao diện viết truyện: danh sách chương, editor Tiptap, panel wiki, nhập/xuất |
| `src/app/api/gdoc` | Đọc Google Doc công khai (chạy phía server vì CORS) |

### Tên và mô tả một dòng (chuẩn v1.6)

Mỗi mục có `name` (tiếng Anh, hiện to) và `gloss` (một dòng tiếng Việt, hiện nhỏ ngay dưới).
**`gloss` không phải bản dịch của `name`**: tên nói nó *tên gì*, gloss nói nó *là cái gì*.

| Sai — dịch tên | Sai — Hán Việt chồng chất | Đúng |
|---|---|---|
| `Lũng Sắt` | `Thiết Cốc Trấn` | `Thị trấn mỏ sắt đã cạn, dân bỏ đi quá nửa` |

Chi tiết và chuẩn viết thư viện: `docs/THAY-DOI-TOI-NAY.md`.

**Kiểm thử nhanh sau mỗi lần sửa:** làm theo `docs/BANGIAO.md` §9 (Lyra 3 lần · 1 chương, dò tên lạ không ra “Nhưng”, thư mục Boss = 32 thẻ, bốc ngẫu nhiên = 12, xuất/nạp JSON y nguyên).

Dữ liệu hiện lưu trên trình duyệt (IndexedDB): wiki trong DB `character_wiki` (khóa `codex_v1`), truyện trong DB `character_wiki_writing`. Nút ⬇/⬆ trên thanh trên cùng tải/nạp file JSON — luôn giữ hoạt động, đó là đường thoát khi dữ liệu có sự cố.

## Đồng bộ nhiều máy (Supabase)

Không cấu hình thì app chạy hoàn toàn trong trình duyệt như trước. Bật đồng bộ:

1. Tạo project ở [Supabase](https://supabase.com/dashboard) (region gần nhất, vd Singapore).
2. **SQL Editor** → dán toàn bộ [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → *Run*.
   File này tạo 3 bảng (`projects`, `stories`, `chapters`), trigger cập nhật `updated_at`/`version`,
   và Row Level Security: **mỗi người chỉ đọc/ghi được dữ liệu của chính mình**.
3. **Project Settings → API**: điền vào `.env.local` (và Environment Variables trên Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — khóa *anon/publishable* (công khai, nằm trong mã trang)
4. Khởi động lại `npm run dev`. Nút **Đăng nhập** xuất hiện trên thanh trên cùng.

### Cách đồng bộ hoạt động

- **Máy mình là chính**: mọi thay đổi vẫn lưu vào IndexedDB trước rồi mới đẩy lên (gom 2,5 giây).
  Mất mạng vẫn viết được; có mạng lại thì tự đẩy nốt.
- Wiki là **một tài liệu JSON** (bảng `projects`) kèm số `version`; truyện và chương là **từng dòng**,
  so bằng `updated_at`, bên nào mới hơn thì bên đó thắng.
- Kéo về khi quay lại tab, mỗi phút một lần, và ngay khi có mạng trở lại.
- Hai máy sửa cùng lúc → hiện hộp thoại **chọn giữ bản nào**, không bao giờ tự đè.
- Máy đang trống mà trên mạng có dữ liệu thì **không bao giờ** tự đẩy bản trống lên.
- Đăng xuất không xoá gì trên máy; nút ⬇/⬆ xuất/nhập JSON vẫn là đường thoát khi có sự cố.
- Dò lỗi đồng bộ: đặt `localStorage.cloud_debug = "1"` rồi xem console.

## Cấu hình Google Docs

Không cấu hình vẫn dùng được **nhập từ link Google Docs công khai**. Để **đẩy truyện lên Docs** và **mở Doc riêng tư**, cần:

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo project.
2. **APIs & Services → Library**: bật **Google Drive API** và **Google Picker API**.
3. **OAuth consent screen**: chọn *External*, điền tên app + email; ở *Scopes* thêm `.../auth/drive.file`
   (scope không nhạy cảm, không cần Google duyệt). Khi còn ở chế độ *Testing*, thêm email của bạn vào *Test users*.
4. **Credentials → Create credentials → OAuth client ID** → loại *Web application*.
   *Authorized JavaScript origins*: `http://localhost:3000` và domain Vercel (vd. `https://ten-app.vercel.app`).
5. **Credentials → Create credentials → API key** → giới hạn key cho *Google Picker API* và HTTP referrer là các domain trên.
6. Điền vào `.env.local` (và Environment Variables trên Vercel):
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Client ID ở bước 4
   - `NEXT_PUBLIC_GOOGLE_API_KEY` — API key ở bước 5
   - `NEXT_PUBLIC_GOOGLE_APP_ID` — *Project number* (trang Dashboard của project)
7. Khởi động lại `npm run dev`.

### Cách đồng bộ hoạt động

- Mỗi truyện ↔ **một Google Doc**, mỗi chương là một **Heading 1**.
- **Đẩy lên** ghi đè nội dung Doc. Nếu Doc đã bị sửa trên Google Docs sau lần đồng bộ trước, app cảnh báo trước khi ghi đè.
- **Kéo về** luôn hiện bản xem trước (chương mới / đã sửa / bị xoá) rồi mới thay thế.
- Giữ được: heading, đậm, nghiêng, gạch chân, gạch ngang, danh sách, trích dẫn, ngắt cảnh, link.
  Không giữ: comment, suggestion, footnote, font/màu tuỳ chỉnh, ảnh.
