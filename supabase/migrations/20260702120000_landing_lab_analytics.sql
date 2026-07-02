-- Landing Lab live analytics (Supabase)
-- Run in your Supabase project: SQL Editor → paste & run, or `supabase db push`

create table if not exists public.lab_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  variant_id text not null,
  generation int not null default 0,
  strategy text,
  converted boolean not null default false,
  bounced boolean not null default false,
  scroll_depth numeric not null default 0 check (scroll_depth >= 0 and scroll_depth <= 1),
  total_dwell_ms int not null default 0,
  target_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lab_sessions(id) on delete cascade,
  event_type text not null,
  section_id text,
  dwell_ms int,
  scroll_depth_pct int,
  at_ms int,
  created_at timestamptz not null default now()
);

create index if not exists lab_sessions_variant_id_idx on public.lab_sessions(variant_id);
create index if not exists lab_sessions_created_at_idx on public.lab_sessions(created_at desc);
create index if not exists lab_events_session_id_idx on public.lab_events(session_id);
create index if not exists lab_events_section_id_idx on public.lab_events(section_id);

alter table public.lab_sessions enable row level security;
alter table public.lab_events enable row level security;

-- No anon/authenticated policies: all reads/writes go through Next.js API using the service role key.

create or replace function public.lab_sessions_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lab_sessions_updated_at on public.lab_sessions;
create trigger lab_sessions_updated_at
  before update on public.lab_sessions
  for each row execute function public.lab_sessions_set_updated_at();
