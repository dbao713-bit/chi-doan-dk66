/* =========================================================
   D-K66 — UPGRADE V2 FOUNDATION
   Ngày: 2026-09-17

   MODULES:
   1. Financial Hub
   2. Auto Meeting Minutes
   3. Polls & Voting
   4. Notification Engine

   Study Hub:
   -> tận dụng bảng documents hiện tại

   PWA:
   -> không cần database
   ========================================================= */


begin;


/* =========================================================
   0. HELPER — KIỂM TRA QUYỀN BCH / ADMIN
   ========================================================= */

create or replace function public.is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_accounts
    where auth_user_id = auth.uid()
      and is_active = true
      and role in ('admin', 'bch', 'editor')
  );
$$;


/* =========================================================
   1. FINANCIAL HUB
   ========================================================= */


/* ---------------------------------------------------------
   1.1 GIAO DỊCH QUỸ
   --------------------------------------------------------- */

create table if not exists public.fund_transactions (
  id uuid primary key default gen_random_uuid(),

  transaction_type text not null
    check (
      transaction_type in (
        'income',
        'expense'
      )
    ),

  category text not null,

  title text not null,

  description text,

  amount numeric(14,0) not null
    check (amount > 0),

  transaction_date date not null default current_date,

  member_id bigint,

  receipt_url text,

  receipt_name text,

  created_by uuid,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   1.2 ĐOÀN PHÍ
   --------------------------------------------------------- */

create table if not exists public.membership_fees (
  id uuid primary key default gen_random_uuid(),

  member_id bigint not null,

  fee_month date not null,

  amount numeric(14,0) not null
    check (amount >= 0),

  status text not null default 'unpaid'
    check (
      status in (
        'unpaid',
        'paid',
        'waived'
      )
    ),

  paid_at timestamptz,

  paid_method text,

  note text,

  created_by uuid,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    member_id,
    fee_month
  )
);


/* ---------------------------------------------------------
   1.3 INDEX FINANCE
   --------------------------------------------------------- */

create index if not exists idx_fund_transactions_date
on public.fund_transactions(transaction_date desc);

create index if not exists idx_fund_transactions_type
on public.fund_transactions(transaction_type);

create index if not exists idx_fund_transactions_member
on public.fund_transactions(member_id);

create index if not exists idx_membership_fees_member
on public.membership_fees(member_id);

create index if not exists idx_membership_fees_month
on public.membership_fees(fee_month desc);

create index if not exists idx_membership_fees_status
on public.membership_fees(status);


/* =========================================================
   2. AUTO MEETING MINUTES
   ========================================================= */

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),

  activity_id uuid,

  title text not null,

  content text,

  content_html text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'final'
      )
    ),

  word_url text,

  pdf_url text,

  word_file_name text,

  pdf_file_name text,

  created_by uuid,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   2.1 INDEX BIÊN BẢN
   --------------------------------------------------------- */

create index if not exists idx_meeting_minutes_activity
on public.meeting_minutes(activity_id);

create index if not exists idx_meeting_minutes_created
on public.meeting_minutes(created_at desc);

create index if not exists idx_meeting_minutes_status
on public.meeting_minutes(status);


/* =========================================================
   3. POLLS & VOTING
   ========================================================= */


/* ---------------------------------------------------------
   3.1 CUỘC BÌNH CHỌN
   --------------------------------------------------------- */

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),

  title text not null,

  description text,

  starts_at timestamptz,

  ends_at timestamptz,

  allow_multiple boolean not null default false,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'published',
        'closed'
      )
    ),

  created_by uuid,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   3.2 PHƯƠNG ÁN BÌNH CHỌN
   --------------------------------------------------------- */

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),

  poll_id uuid not null,

  option_text text not null,

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   3.3 PHIẾU BÌNH CHỌN
   --------------------------------------------------------- */

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),

  poll_id uuid not null,

  option_id uuid not null,

  member_id bigint not null,

  voted_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   3.4 INDEX POLLS
   --------------------------------------------------------- */

create index if not exists idx_polls_status
on public.polls(status);

create index if not exists idx_polls_start
on public.polls(starts_at);

create index if not exists idx_polls_end
on public.polls(ends_at);

create index if not exists idx_poll_options_poll
on public.poll_options(poll_id);

create index if not exists idx_poll_votes_poll
on public.poll_votes(poll_id);

create index if not exists idx_poll_votes_member
on public.poll_votes(member_id);

create index if not exists idx_poll_votes_option
on public.poll_votes(option_id);


/* =========================================================
   4. NOTIFICATION ENGINE
   ========================================================= */


/* ---------------------------------------------------------
   4.1 SỰ KIỆN THÔNG BÁO
   --------------------------------------------------------- */

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),

  event_type text not null,

  title text not null,

  message text not null,

  target_type text not null default 'all'
    check (
      target_type in (
        'all',
        'member',
        'staff'
      )
    ),

  target_member_id bigint,

  metadata jsonb not null default '{}'::jsonb,

  scheduled_at timestamptz,

  created_by uuid,

  created_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   4.2 LOG GỬI THÔNG BÁO
   --------------------------------------------------------- */

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),

  event_id uuid,

  member_id bigint,

  channel text not null,

  provider text,

  destination text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'sent',
        'failed',
        'skipped'
      )
    ),

  error_message text,

  sent_at timestamptz,

  created_at timestamptz not null default now()
);


/* ---------------------------------------------------------
   4.3 CÀI ĐẶT THÔNG BÁO CỦA ĐOÀN VIÊN
   --------------------------------------------------------- */

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),

  member_id bigint not null,

  channel text not null,

  notification_type text not null,

  enabled boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    member_id,
    channel,
    notification_type
  )
);


/* ---------------------------------------------------------
   4.4 INDEX NOTIFICATION
   --------------------------------------------------------- */

create index if not exists idx_notification_events_type
on public.notification_events(event_type);

create index if not exists idx_notification_events_schedule
on public.notification_events(scheduled_at);

create index if not exists idx_notification_events_member
on public.notification_events(target_member_id);

create index if not exists idx_notification_logs_event
on public.notification_logs(event_id);

create index if not exists idx_notification_logs_member
on public.notification_logs(member_id);

create index if not exists idx_notification_logs_status
on public.notification_logs(status);

create index if not exists idx_notification_preferences_member
on public.notification_preferences(member_id);


/* =========================================================
   5. ROW LEVEL SECURITY
   ========================================================= */


/* ---------------------------------------------------------
   FINANCE
   --------------------------------------------------------- */

alter table public.fund_transactions
enable row level security;

alter table public.membership_fees
enable row level security;


/* ---------------------------------------------------------
   MEETING MINUTES
   --------------------------------------------------------- */

alter table public.meeting_minutes
enable row level security;


/* ---------------------------------------------------------
   POLLS
   --------------------------------------------------------- */

alter table public.polls
enable row level security;

alter table public.poll_options
enable row level security;

alter table public.poll_votes
enable row level security;


/* ---------------------------------------------------------
   NOTIFICATIONS
   --------------------------------------------------------- */

alter table public.notification_events
enable row level security;

alter table public.notification_logs
enable row level security;

alter table public.notification_preferences
enable row level security;


/* =========================================================
   6. STAFF POLICIES
   ========================================================= */


/* ---------------------------------------------------------
   FINANCE
   --------------------------------------------------------- */

drop policy if exists "staff_manage_fund_transactions"
on public.fund_transactions;

create policy "staff_manage_fund_transactions"
on public.fund_transactions
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


drop policy if exists "staff_manage_membership_fees"
on public.membership_fees;

create policy "staff_manage_membership_fees"
on public.membership_fees
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


/* ---------------------------------------------------------
   MEETING MINUTES
   --------------------------------------------------------- */

drop policy if exists "staff_manage_meeting_minutes"
on public.meeting_minutes;

create policy "staff_manage_meeting_minutes"
on public.meeting_minutes
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


/* ---------------------------------------------------------
   POLLS
   --------------------------------------------------------- */

drop policy if exists "staff_manage_polls"
on public.polls;

create policy "staff_manage_polls"
on public.polls
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


drop policy if exists "staff_manage_poll_options"
on public.poll_options;

create policy "staff_manage_poll_options"
on public.poll_options
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


drop policy if exists "staff_manage_poll_votes"
on public.poll_votes;

create policy "staff_manage_poll_votes"
on public.poll_votes
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


/* ---------------------------------------------------------
   NOTIFICATIONS
   --------------------------------------------------------- */

drop policy if exists "staff_manage_notification_events"
on public.notification_events;

create policy "staff_manage_notification_events"
on public.notification_events
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


drop policy if exists "staff_manage_notification_logs"
on public.notification_logs;

create policy "staff_manage_notification_logs"
on public.notification_logs
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


drop policy if exists "staff_manage_notification_preferences"
on public.notification_preferences;

create policy "staff_manage_notification_preferences"
on public.notification_preferences
for all
to authenticated
using (
  public.is_staff_user()
)
with check (
  public.is_staff_user()
);


/* =========================================================
   7. GHI CHÚ
   =========================================================

   member_id / activity_id chưa tạo FOREIGN KEY ở migration này
   vì hệ thống hiện tại đã tồn tại trước migration và chúng ta
   chưa muốn ép kiểu dữ liệu của các bảng cũ.

   Sau khi kiểm tra schema thực tế trên Supabase:
   - members.id
   - activities.id
   - documents.id
   - member_accounts.member_id

   chúng ta sẽ bổ sung FK nếu phù hợp.

   ---------------------------------------------------------

   Poll vote:
   Không ép UNIQUE(member_id, poll_id) ở database vì poll có thể
   cho phép chọn nhiều phương án.

   Logic:
   - allow_multiple = false
     -> API sẽ chỉ cho 1 option / member / poll

   - allow_multiple = true
     -> API cho nhiều option / member / poll

   ---------------------------------------------------------

   Study Hub:
   Không tạo bảng upload riêng ở bước này.
   Sẽ tận dụng documents hiện tại và thêm lớp phân loại học tập.

   ---------------------------------------------------------

   PWA:
   Không cần table riêng.
   Sẽ thêm manifest + service worker + caching ở frontend.

   ========================================================= */

commit;