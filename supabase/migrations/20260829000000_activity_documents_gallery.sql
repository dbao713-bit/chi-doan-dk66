create extension if not exists pgcrypto;

-- =========================================================
-- ACTIVITIES / SINH HOẠT
-- =========================================================

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,
  location text,

  start_at timestamptz not null,
  end_at timestamptz,

  status text not null default 'scheduled'
    check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_start_at_idx
  on public.activities(start_at);

create index if not exists activities_status_idx
  on public.activities(status);


-- =========================================================
-- DOCUMENTS / TÀI LIỆU
-- =========================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  category text not null default 'khac'
    check (
      category in (
        'van-ban',
        'thong-bao',
        'ke-hoach',
        'bien-ban',
        'khac'
      )
    ),

  file_path text not null,
  file_name text not null,

  mime_type text,
  file_size bigint,

  author text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_category_idx
  on public.documents(category);

create index if not exists documents_created_at_idx
  on public.documents(created_at desc);


-- =========================================================
-- GALLERY / THƯ VIỆN HÌNH ẢNH
-- =========================================================

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),

  title text,
  description text,

  image_path text not null,
  image_url text not null,

  sort_order integer not null default 0,

  is_visible boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_visible_order_idx
  on public.gallery(is_visible, sort_order, created_at desc);


-- =========================================================
-- UPDATED_AT
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activities_set_updated_at
  on public.activities;

create trigger activities_set_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();


drop trigger if exists documents_set_updated_at
  on public.documents;

create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();


drop trigger if exists gallery_set_updated_at
  on public.gallery;

create trigger gallery_set_updated_at
before update on public.gallery
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.activities enable row level security;
alter table public.documents enable row level security;
alter table public.gallery enable row level security;


-- PUBLIC READ
-- Cho phép trang chủ đọc các hoạt động và ảnh được công khai.

drop policy if exists "Public can read activities"
on public.activities;

create policy "Public can read activities"
on public.activities
for select
to anon, authenticated
using (true);


drop policy if exists "Public can read visible gallery"
on public.gallery;

create policy "Public can read visible gallery"
on public.gallery
for select
to anon, authenticated
using (is_visible = true);


drop policy if exists "Public can read documents"
on public.documents;

create policy "Public can read documents"
on public.documents
for select
to anon, authenticated
using (true);


-- =========================================================
-- ADMIN WRITE
-- =========================================================
--
-- Tạm thời dùng authenticated cho quyền quản trị.
-- Sau khi xác nhận hệ thống login hiện tại đang dùng
-- Supabase Auth thế nào, ta sẽ siết policy thành admin-only.
--

drop policy if exists "Authenticated can insert activities"
on public.activities;

create policy "Authenticated can insert activities"
on public.activities
for insert
to authenticated
with check (true);


drop policy if exists "Authenticated can update activities"
on public.activities;

create policy "Authenticated can update activities"
on public.activities
for update
to authenticated
using (true)
with check (true);


drop policy if exists "Authenticated can delete activities"
on public.activities;

create policy "Authenticated can delete activities"
on public.activities
for delete
to authenticated
using (true);


drop policy if exists "Authenticated can insert documents"
on public.documents;

create policy "Authenticated can insert documents"
on public.documents
for insert
to authenticated
with check (true);


drop policy if exists "Authenticated can update documents"
on public.documents;

create policy "Authenticated can update documents"
on public.documents
for update
to authenticated
using (true)
with check (true);


drop policy if exists "Authenticated can delete documents"
on public.documents;

create policy "Authenticated can delete documents"
on public.documents
for delete
to authenticated
using (true);


drop policy if exists "Authenticated can insert gallery"
on public.gallery;

create policy "Authenticated can insert gallery"
on public.gallery
for insert
to authenticated
with check (true);


drop policy if exists "Authenticated can update gallery"
on public.gallery;

create policy "Authenticated can update gallery"
on public.gallery
for update
to authenticated
using (true)
with check (true);


drop policy if exists "Authenticated can delete gallery"
on public.gallery;

create policy "Authenticated can delete gallery"
on public.gallery
for delete
to authenticated
using (true);


-- =========================================================
-- STORAGE
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'activity-gallery',
  'activity-gallery',
  true
)
on conflict (id) do update
set public = true;


drop policy if exists "Public can view activity gallery"
on storage.objects;

create policy "Public can view activity gallery"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'activity-gallery'
);


drop policy if exists "Authenticated can upload activity gallery"
on storage.objects;

create policy "Authenticated can upload activity gallery"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-gallery'
);


drop policy if exists "Authenticated can update activity gallery"
on storage.objects;

create policy "Authenticated can update activity gallery"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-gallery'
)
with check (
  bucket_id = 'activity-gallery'
);


drop policy if exists "Authenticated can delete activity gallery"
on storage.objects;

create policy "Authenticated can delete activity gallery"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-gallery'
);
