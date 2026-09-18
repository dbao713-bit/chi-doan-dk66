/*
=========================================================
STUDY HUB FOUNDATION
Chi đoàn D-K66
=========================================================

Mục đích:
- Phân loại tài liệu phục vụ Study Hub.
- Không tạo bảng file mới.
- Tận dụng bảng public.documents hiện có.
=========================================================
*/

alter table public.documents
  add column if not exists hub_type text
    not null
    default 'general';

alter table public.documents
  add column if not exists subject text;

alter table public.documents
  add column if not exists grade_level text;

alter table public.documents
  add column if not exists tags text[]
    not null
    default '{}';

alter table public.documents
  add column if not exists is_featured boolean
    not null
    default false;

alter table public.documents
  add column if not exists updated_at timestamptz
    not null
    default now();


/*
---------------------------------------------------------
CONSTRAINT
---------------------------------------------------------
*/

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_hub_type_check'
  ) then
    alter table public.documents
      add constraint documents_hub_type_check
      check (
        hub_type in (
          'general',
          'study',
          'reference',
          'template'
        )
      );
  end if;
end
$$;


/*
---------------------------------------------------------
INDEXES
---------------------------------------------------------
*/

create index if not exists documents_hub_type_idx
  on public.documents(hub_type);

create index if not exists documents_subject_idx
  on public.documents(subject);

create index if not exists documents_grade_level_idx
  on public.documents(grade_level);

create index if not exists documents_featured_idx
  on public.documents(is_featured);

create index if not exists documents_updated_at_idx
  on public.documents(updated_at desc);


/*
---------------------------------------------------------
AUTO UPDATE updated_at
---------------------------------------------------------
*/

create or replace function public.set_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at
on public.documents;

create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_documents_updated_at();


/*
---------------------------------------------------------
COMMENT
---------------------------------------------------------
*/

comment on column public.documents.hub_type is
'Phân loại tài liệu: general, study, reference, template';

comment on column public.documents.subject is
'Môn học hoặc chủ đề học tập';

comment on column public.documents.grade_level is
'Khối/lớp phù hợp với tài liệu';

comment on column public.documents.tags is
'Các tag phục vụ tìm kiếm và lọc Study Hub';

comment on column public.documents.is_featured is
'Tài liệu nổi bật trong Study Hub';