-- Codex — bổ sung cho v1.6: thư mục phần truyện và tóm tắt cốt truyện.
--
-- Cách chạy: mở Supabase → SQL Editor → dán file này → Run. Chạy lại nhiều lần vẫn an toàn.
-- Chạy sau 0001_init.sql. Không đụng dữ liệu cũ; các cột mới để trống là hợp lệ.

-- Mỗi truyện có danh sách phần: [{ id, name }]. Chương trỏ vào một phần, hoặc không.
alter table public.stories  add column if not exists sections   jsonb not null default '[]'::jsonb;
alter table public.chapters add column if not exists section_id text;

-- Tóm tắt từng chương: { hook, pov, main, change, open }.
alter table public.chapters add column if not exists recap      jsonb;
