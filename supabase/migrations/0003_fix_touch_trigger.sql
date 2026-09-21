-- Codex — vá trigger đụng nhầm cột.
--
-- Cách chạy: mở Supabase → SQL Editor → dán file này → Run. Chạy lại nhiều lần vẫn an toàn.
-- Không đụng một dòng dữ liệu nào; chỉ sửa lại hai hàm và một trigger.
--
-- Lỗi: touch_row() của 0001 dùng chung cho cả ba bảng, và trong đó có dòng
--   if tg_table_name = 'projects' and new.data is distinct from old.data
-- PostgreSQL phải hiểu new.data ngay khi dịch câu lệnh, chứ không chờ xem
-- tg_table_name bằng gì. Bảng stories và chapters không có cột data, nên MỌI
-- lệnh UPDATE lên hai bảng ấy đều chết với "record new has no field data" —
-- nghĩa là sửa một chương rồi đồng bộ thì chương đó không bao giờ lên được máy
-- chủ. Thêm chương mới thì được, vì INSERT không chạy trigger này.
--
-- Cách vá: tách làm hai hàm. projects giữ phần đếm version, stories/chapters
-- chỉ cần đóng dấu thời gian.

create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.touch_project() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.data is distinct from old.data then
    new.version := old.version + 1;
  end if;
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_project();
