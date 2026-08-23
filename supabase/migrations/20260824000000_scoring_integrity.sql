alter table public.members
  alter column conduct_score set default 0,
  alter column activity_score set default 0,
  alter column volunteer_score set default 0,
  alter column discipline_score set default 0,
  alter column total_score set default 0;

alter table public.members
  alter column conduct_score set not null,
  alter column activity_score set not null,
  alter column volunteer_score set not null,
  alter column discipline_score set not null,
  alter column total_score set not null;

alter table public.members
  add constraint members_conduct_score_check
    check (conduct_score between 0 and 30),
  add constraint members_activity_score_check
    check (activity_score between 0 and 30),
  add constraint members_volunteer_score_check
    check (volunteer_score between 0 and 20),
  add constraint members_discipline_score_check
    check (discipline_score between 0 and 20),
  add constraint members_total_score_check
    check (total_score between 0 and 100);
