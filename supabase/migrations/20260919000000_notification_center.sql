begin;

-- =========================================================
-- NOTIFICATION CENTER
-- Trạng thái đọc thông báo của từng đoàn viên
-- =========================================================

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null,

  member_id bigint not null,

  read_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  unique (
    event_id,
    member_id
  )
);


-- =========================================================
-- INDEX
-- =========================================================

create index if not exists
  idx_notification_reads_member
on public.notification_reads(member_id);

create index if not exists
  idx_notification_reads_event
on public.notification_reads(event_id);

create index if not exists
  idx_notification_reads_member_read
on public.notification_reads(
  member_id,
  read_at
);


-- =========================================================
-- RLS
-- =========================================================

alter table public.notification_reads
enable row level security;


-- =========================================================
-- ĐOÀN VIÊN ĐƯỢC XEM TRẠNG THÁI ĐỌC CỦA CHÍNH MÌNH
-- =========================================================

drop policy if exists
  "member_read_notification_reads"
on public.notification_reads;

create policy
  "member_read_notification_reads"
on public.notification_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.auth_user_id = auth.uid()
      and ma.member_id = notification_reads.member_id
  )
);


-- =========================================================
-- ĐOÀN VIÊN ĐƯỢC ĐÁNH DẤU ĐÃ ĐỌC
-- =========================================================

drop policy if exists
  "member_insert_notification_reads"
on public.notification_reads;

create policy
  "member_insert_notification_reads"
on public.notification_reads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.member_accounts ma
    where ma.auth_user_id = auth.uid()
      and ma.member_id = notification_reads.member_id
  )
);


-- =========================================================
-- ĐOÀN VIÊN ĐƯỢC CẬP NHẬT TRẠNG THÁI ĐỌC CỦA CHÍNH MÌNH
-- =========================================================

drop policy if exists
  "member_update_notification_reads"
on public.notification_reads;

create policy
  "member_update_notification_reads"
on public.notification_reads
for update
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.auth_user_id = auth.uid()
      and ma.member_id = notification_reads.member_id
  )
)
with check (
  exists (
    select 1
    from public.member_accounts ma
    where ma.auth_user_id = auth.uid()
      and ma.member_id = notification_reads.member_id
  )
);


-- =========================================================
-- STAFF QUẢN LÝ ĐƯỢC TOÀN BỘ
-- =========================================================

drop policy if exists
  "staff_manage_notification_reads"
on public.notification_reads;

create policy
  "staff_manage_notification_reads"
on public.notification_reads
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


-- =========================================================
-- FK
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'notification_reads_event_id_fkey'
  ) then

    alter table public.notification_reads
      add constraint
      notification_reads_event_id_fkey
      foreign key (event_id)
      references public.notification_events(id)
      on delete cascade;

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'notification_reads_member_id_fkey'
  ) then

    alter table public.notification_reads
      add constraint
      notification_reads_member_id_fkey
      foreign key (member_id)
      references public.members(id)
      on delete cascade;

  end if;

end
$$;


notify pgrst, 'reload schema';

commit;