-- Phase 2: GTM Challenge experiment context on live sessions
alter table public.lab_sessions
  add column if not exists experiment_number int;

create index if not exists lab_sessions_experiment_number_idx
  on public.lab_sessions(experiment_number);
