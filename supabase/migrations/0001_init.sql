-- Codex — lược đồ Supabase (bước 1: đăng nhập + đồng bộ nhiều máy)
--
-- Cách chạy: mở Supabase → SQL Editor → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần vẫn an toàn (dùng "if not exists" / "drop policy if exists").
--
-- Wiki lưu thành MỘT tài liệu jsonb trong bảng projects: đúng định dạng JSON của
-- Codex, nên xuất/nhập file vẫn hoạt động y nguyên và không phải ánh xạ 15 loại
-- mục thành 15 bảng. Truyện tách thành stories/chapters vì chương là thứ sau này
-- độc giả đọc và bình luận theo từng chương.

create extension if not exists pgcrypto;

-- ── Bảng ──────────────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Thế giới của tôi',
  data        jsonb not null default '{}'::jsonb,
  -- Tăng mỗi lần ghi; dùng để biết máy khác đã sửa sau lần đồng bộ trước chưa.
  version     bigint not null default 1,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects (owner_id);

create table if not exists public.stories (
  id            text primary key,          -- giữ nguyên id cục bộ (st-xxxxx)
  owner_id      uuid not null references auth.users (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete cascade,
  title         text not null default '',
  synopsis      text not null default '',
  era_id        text not null default '',
  chapter_order jsonb not null default '[]'::jsonb,
  gdoc          jsonb,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists stories_owner_idx on public.stories (owner_id);

create table if not exists public.chapters (
  id          text primary key,            -- giữ nguyên id cục bộ (ch-xxxxx)
  story_id    text not null references public.stories (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null default '',
  content     jsonb not null default '{}'::jsonb,
  word_count  integer not null default 0,
  status      text not null default 'draft',
  updated_at  timestamptz not null default now()
);
create index if not exists chapters_story_idx on public.chapters (story_id);
create index if not exists chapters_owner_idx on public.chapters (owner_id);

-- ── Tự cập nhật updated_at / version ─────────────────────────────────────────

create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_table_name = 'projects' and new.data is distinct from old.data then
    new.version := old.version + 1;
  end if;
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_row();

drop trigger if exists stories_touch on public.stories;
create trigger stories_touch before update on public.stories
  for each row execute function public.touch_row();

drop trigger if exists chapters_touch on public.chapters;
create trigger chapters_touch before update on public.chapters
  for each row execute function public.touch_row();

-- ── Phân quyền: mỗi người chỉ thấy và sửa dữ liệu của chính mình ─────────────

alter table public.projects enable row level security;
alter table public.stories  enable row level security;
alter table public.chapters enable row level security;

drop policy if exists projects_own on public.projects;
create policy projects_own on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists stories_own on public.stories;
create policy stories_own on public.stories
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists chapters_own on public.chapters;
create policy chapters_own on public.chapters
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Về sau, khi mở trang cho độc giả, thêm policy đọc công khai cho
-- chapters.status = 'published' và bảng comments/progress (BANGIAO §6).
