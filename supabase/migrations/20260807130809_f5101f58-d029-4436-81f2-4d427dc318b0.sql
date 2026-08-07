create table if not exists public.pending_applications (
  id uuid primary key default gen_random_uuid(),
  account_number text,
  access_code text,
  payment_code text,
  amount numeric,
  term integer,
  name text,
  nif text,
  step text,
  refund_margin numeric,
  total_to_refund numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.pending_applications to anon, authenticated;
grant all on public.pending_applications to service_role;

alter table public.pending_applications enable row level security;

create policy "Anyone can insert pending applications"
  on public.pending_applications for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can update pending applications"
  on public.pending_applications for update
  to anon, authenticated
  using (true);

create policy "Anyone can select pending applications"
  on public.pending_applications for select
  to anon, authenticated
  using (true);