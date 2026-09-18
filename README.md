# Character Wiki

Công cụ quản lý thế giới truyện (nhân vật, thế lực, công pháp, cảnh giới…) kèm phòng viết truyện theo chương, xuất/nhập Word và Google Docs.

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
| `src/lib/schema/world.ts` | Schema zod của toàn bộ wiki (`{ eras: [...] }`), chuẩn hoá dữ liệu import |
| `src/store/world-store.ts` | Store wiki + undo/redo, đồng bộ quan hệ 2 chiều, dọn tham chiếu khi xoá |
| `src/features/*` | Các mục wiki (nhân vật, thế lực, công pháp, đan dược, cảnh giới, …) |
| `src/lib/writing/*` | Viết truyện: lưu trữ (Dexie), chuyển đổi HTML/DOCX/MD/TXT, Google Drive |
| `src/features/writing/*` | Giao diện viết truyện: danh sách chương, editor Tiptap, panel wiki, nhập/xuất |
| `src/app/api/gdoc` | Đọc Google Doc công khai (chạy phía server vì CORS) |

Dữ liệu hiện lưu trên trình duyệt (IndexedDB): wiki trong DB `character_wiki`, truyện trong DB `character_wiki_writing`.

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
