/*
  AUTO ACTIVITY STATUS

  Quy tắc:
  - scheduled -> ongoing:
      start_at <= now()
      và chưa đến end_at

  - scheduled -> completed:
      end_at <= now()

  - ongoing -> completed:
      end_at <= now()

  - cancelled:
      giữ nguyên

  - completed:
      giữ nguyên
*/

create extension if not exists pg_cron;


/* =========================================================
   FUNCTION
   ========================================================= */

create or replace function public.sync_activity_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  /* -------------------------------------------------------
     ĐÃ KẾT THÚC
     scheduled / ongoing -> completed
     ------------------------------------------------------- */

  update public.activities
  set status = 'completed'
  where status in ('scheduled', 'ongoing')
    and end_at is not null
    and end_at <= now();


  /* -------------------------------------------------------
     ĐANG DIỄN RA
     scheduled -> ongoing
     ------------------------------------------------------- */

  update public.activities
  set status = 'ongoing'
  where status = 'scheduled'
    and start_at <= now()
    and (
      end_at is null
      or end_at > now()
    );

end;
$$;


/* =========================================================
   CRON
   Chạy mỗi phút
   ========================================================= */

select cron.schedule(
  'sync-activity-statuses',
  '* * * * *',
  $$ select public.sync_activity_statuses(); $$
);


/* =========================================================
   RELOAD
   ========================================================= */

notify pgrst, 'reload schema';
