-- ============================================================
-- D-K66 MEMBER PORTAL / ACCOUNT / ACTIVITY / FEEDBACK FOUNDATION
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- 1. MEMBERS: YEAR OF BIRTH
-- ============================================================
alter table public.members
  add column if not exists birth_year smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'members_birth_year_check'
  ) then
    alter table public.members
      add constraint members_birth_year_check
      check (birth_year is null or birth_year between 1900 and 2100);
  end if;
end $$;

create index if not exists members_birth_year_idx
  on public.members(birth_year);

-- ============================================================
-- 2. STAFF / BCH ROLES
-- ============================================================
create table if not exists public.staff_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'bch'
    check (role in ('admin', 'bch', 'editor')),
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_accounts_active_idx
  on public.staff_accounts(is_active);

-- ============================================================
-- 3. MEMBER ACCOUNTS
-- ============================================================
create table if not exists public.member_accounts (
  id uuid primary key default gen_random_uuid(),
  member_id bigint not null unique references public.members(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  status text not null default 'active'
    check (status in ('active', 'locked')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists member_accounts_status_idx
  on public.member_accounts(status);

create index if not exists member_accounts_member_id_idx
  on public.member_accounts(member_id);

-- ============================================================
-- 4. ACTIVITY REGISTRATION
-- ============================================================
create table if not exists public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'cancelled')),
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique(activity_id, member_id)
);

create index if not exists activity_registrations_activity_idx
  on public.activity_registrations(activity_id);

create index if not exists activity_registrations_member_idx
  on public.activity_registrations(member_id);

-- ============================================================
-- 5. ACTIVITY ATTENDANCE
-- ============================================================
create table if not exists public.activity_attendance (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  present boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users(id) on delete set null,
  note text,
  unique(activity_id, member_id)
);

create index if not exists activity_attendance_activity_idx
  on public.activity_attendance(activity_id);

create index if not exists activity_attendance_member_idx
  on public.activity_attendance(member_id);

-- ============================================================
-- 6. ACTIVITY POINTS
-- ============================================================
create table if not exists public.activity_points (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id bigint not null references public.members(id) on delete cascade,
  points integer not null default 0
    check (points between 0 and 30),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id, member_id)
);

create index if not exists activity_points_member_idx
  on public.activity_points(member_id);

-- ============================================================
-- 7. FEEDBACK / SUGGESTIONS
-- ============================================================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  member_id bigint references public.members(id) on delete set null,
  is_anonymous boolean not null default false,
  subject text not null,
  content text not null,
  status text not null default 'new'
    check (status in ('new', 'processing', 'resolved', 'archived')),
  admin_note text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_status_created_idx
  on public.feedback(status, created_at desc);

create index if not exists feedback_member_idx
  on public.feedback(member_id);

-- ============================================================
-- 8. GENERIC UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'staff_accounts',
    'member_accounts',
    'activity_points',
    'feedback'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- 9. HELPER FUNCTIONS
-- ============================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_accounts s
    where s.auth_user_id = auth.uid()
      and s.is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_accounts s
    where s.auth_user_id = auth.uid()
      and s.is_active = true
      and s.role = 'admin'
  );
$$;

create or replace function public.current_member_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select ma.member_id
  from public.member_accounts ma
  where ma.auth_user_id = auth.uid()
    and ma.status = 'active'
  limit 1;
$$;

-- ============================================================
-- 10. ENABLE RLS
-- ============================================================
alter table public.staff_accounts enable row level security;
alter table public.member_accounts enable row level security;
alter table public.activity_registrations enable row level security;
alter table public.activity_attendance enable row level security;
alter table public.activity_points enable row level security;
alter table public.feedback enable row level security;

-- ============================================================
-- 11. STAFF POLICIES
-- ============================================================
drop policy if exists "Staff can read own staff account"
on public.staff_accounts;

create policy "Staff can read own staff account"
on public.staff_accounts
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Staff can read member accounts"
on public.member_accounts;

create policy "Staff can read member accounts"
on public.member_accounts
for select
to authenticated
using (public.is_staff());

-- ============================================================
-- 12. MEMBER ACCOUNT POLICIES
-- ============================================================
drop policy if exists "Members can read own account"
on public.member_accounts;

create policy "Members can read own account"
on public.member_accounts
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Members can update own account flags"
on public.member_accounts;

create policy "Members can update own account flags"
on public.member_accounts
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

-- ============================================================
-- 13. ACTIVITY REGISTRATION POLICIES
-- ============================================================
drop policy if exists "Members can read own registrations"
on public.activity_registrations;

create policy "Members can read own registrations"
on public.activity_registrations
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_staff()
);

drop policy if exists "Members can register themselves"
on public.activity_registrations;

create policy "Members can register themselves"
on public.activity_registrations
for insert
to authenticated
with check (
  member_id = public.current_member_id()
  or public.is_staff()
);

drop policy if exists "Members can cancel own registrations"
on public.activity_registrations;

create policy "Members can cancel own registrations"
on public.activity_registrations
for update
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_staff()
)
with check (
  member_id = public.current_member_id()
  or public.is_staff()
);

drop policy if exists "Staff can delete registrations"
on public.activity_registrations;

create policy "Staff can delete registrations"
on public.activity_registrations
for delete
to authenticated
using (public.is_staff());

-- ============================================================
-- 14. ATTENDANCE POLICIES
-- ============================================================
drop policy if exists "Members can read own attendance"
on public.activity_attendance;

create policy "Members can read own attendance"
on public.activity_attendance
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_staff()
);

drop policy if exists "Staff can manage attendance"
on public.activity_attendance;

create policy "Staff can manage attendance"
on public.activity_attendance
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- ============================================================
-- 15. POINTS POLICIES
-- ============================================================
drop policy if exists "Members can read own points"
on public.activity_points;

create policy "Members can read own points"
on public.activity_points
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.is_staff()
);

drop policy if exists "Staff can manage points"
on public.activity_points;

create policy "Staff can manage points"
on public.activity_points
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- ============================================================
-- 16. FEEDBACK POLICIES
-- ============================================================
drop policy if exists "Anyone can submit feedback"
on public.feedback;

create policy "Anyone can submit feedback"
on public.feedback
for insert
to anon, authenticated
with check (
  (
    is_anonymous = true
    and member_id is null
  )
  or
  (
    is_anonymous = false
    and member_id = public.current_member_id()
  )
  or public.is_staff()
);

drop policy if exists "Members can read own feedback"
on public.feedback;

create policy "Members can read own feedback"
on public.feedback
for select
to authenticated
using (
  (
    is_anonymous = false
    and member_id = public.current_member_id()
  )
  or public.is_staff()
);

drop policy if exists "Staff can manage feedback"
on public.feedback;

create policy "Staff can manage feedback"
on public.feedback
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can delete feedback"
on public.feedback;

create policy "Staff can delete feedback"
on public.feedback
for delete
to authenticated
using (public.is_staff());

-- ============================================================
-- 17. MEMBER PROFILE READ
-- ============================================================
drop policy if exists "Members can read own profile"
on public.members;

create policy "Members can read own profile"
on public.members
for select
to authenticated
using (
  id = public.current_member_id()
  or public.is_staff()
);

-- Staff already needs full access to members. Re-create only if absent.
drop policy if exists "Staff can read all members"
on public.members;

create policy "Staff can read all members"
on public.members
for select
to authenticated
using (public.is_staff());

-- ============================================================
-- 18. SAFETY INDEXES
-- ============================================================
create index if not exists feedback_created_at_idx
  on public.feedback(created_at desc);

create index if not exists activity_attendance_present_idx
  on public.activity_attendance(activity_id, present);

-- ============================================================
-- 19. SAFE PUBLIC MEMBER STATS
-- The public homepage only needs aggregate numbers. Avoid exposing
-- member identifiers/profile rows to anonymous visitors.
-- ============================================================
create or replace function public.get_public_member_stats()
returns table (
  total bigint,
  male bigint,
  female bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total,
    count(*) filter (where gender = 'Nam')::bigint as male,
    count(*) filter (where gender = 'Nữ')::bigint as female
  from public.members;
$$;

revoke all on function public.get_public_member_stats()
from public;

grant execute on function public.get_public_member_stats()
to anon, authenticated;

-- ============================================================
-- 20. HARDEN KNOWN CONTENT WRITES TO BCH/STAFF ONLY
-- ============================================================
drop policy if exists "Authenticated can insert activities" on public.activities;
drop policy if exists "Authenticated can update activities" on public.activities;
drop policy if exists "Authenticated can delete activities" on public.activities;

create policy "Staff can insert activities"
on public.activities for insert to authenticated
with check (public.is_staff());

create policy "Staff can update activities"
on public.activities for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "Staff can delete activities"
on public.activities for delete to authenticated
using (public.is_staff());

drop policy if exists "Authenticated can insert documents" on public.documents;
drop policy if exists "Authenticated can update documents" on public.documents;
drop policy if exists "Authenticated can delete documents" on public.documents;

create policy "Staff can insert documents"
on public.documents for insert to authenticated
with check (public.is_staff());

create policy "Staff can update documents"
on public.documents for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "Staff can delete documents"
on public.documents for delete to authenticated
using (public.is_staff());

drop policy if exists "Authenticated can insert gallery" on public.gallery;
drop policy if exists "Authenticated can update gallery" on public.gallery;
drop policy if exists "Authenticated can delete gallery" on public.gallery;

create policy "Staff can insert gallery"
on public.gallery for insert to authenticated
with check (public.is_staff());

create policy "Staff can update gallery"
on public.gallery for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "Staff can delete gallery"
on public.gallery for delete to authenticated
using (public.is_staff());

-- Storage write policies are also restricted to staff.
drop policy if exists "Authenticated can upload activity gallery" on storage.objects;
drop policy if exists "Authenticated can update activity gallery" on storage.objects;
drop policy if exists "Authenticated can delete activity gallery" on storage.objects;

create policy "Staff can upload activity gallery"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'activity-gallery'
  and public.is_staff()
);

create policy "Staff can update activity gallery"
on storage.objects for update to authenticated
using (
  bucket_id = 'activity-gallery'
  and public.is_staff()
)
with check (
  bucket_id = 'activity-gallery'
  and public.is_staff()
);

create policy "Staff can delete activity gallery"
on storage.objects for delete to authenticated
using (
  bucket_id = 'activity-gallery'
  and public.is_staff()
);
