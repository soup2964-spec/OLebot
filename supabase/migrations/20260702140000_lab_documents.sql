-- Landing Lab persistent state (experiments, loop, deploy, calibration)
-- Shares Supabase project with outbound GTM tools — all lab tables use lab_ prefix.

create table if not exists public.lab_documents (
  id text primary key,
  doc jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists lab_documents_updated_at_idx on public.lab_documents(updated_at desc);

alter table public.lab_documents enable row level security;

-- No anon/authenticated policies: reads/writes via Next.js API using service role only.

create or replace function public.lab_documents_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lab_documents_updated_at on public.lab_documents;
create trigger lab_documents_updated_at
  before update on public.lab_documents
  for each row execute function public.lab_documents_set_updated_at();
