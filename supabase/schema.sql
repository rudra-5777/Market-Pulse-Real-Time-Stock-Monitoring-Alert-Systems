-- =============================================================
-- MarketPulse – Supabase SQL Schema
-- =============================================================
-- Run this script in the Supabase SQL editor (or as a migration)
-- to create all required tables and enable Row Level Security.
-- =============================================================


-- -------------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------------
-- pgcrypto provides gen_random_uuid() used for default PKs.
create extension if not exists "pgcrypto";


-- =============================================================
-- TABLE: profiles
-- =============================================================
-- Stores public user information that augments auth.users.
-- A row is automatically created for every new user via the
-- trigger defined at the bottom of this file.
-- =============================================================
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  email        text        not null,
  display_name text,
  -- User-chosen UI theme: 'light' or 'dark'
  theme        text        not null default 'light' check (theme in ('light', 'dark')),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.profiles              is 'Public profile data for every registered user.';
comment on column public.profiles.theme        is 'UI colour scheme preference: light or dark.';
comment on column public.profiles.display_name is 'Optional human-readable name shown in the UI.';

-- Keep updated_at current automatically
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================
-- TABLE: stocks
-- =============================================================
-- Acts as a server-side cache for the latest real-time quote
-- data fetched from an external stock API.  The application
-- upserts rows here on every polling cycle so that multiple
-- clients share a single upstream request.
-- =============================================================
create table if not exists public.stocks (
  id              uuid        primary key default gen_random_uuid(),
  symbol          text        not null unique,          -- e.g. "AAPL"
  company_name    text        not null,                 -- e.g. "Apple Inc."
  current_price   numeric(12, 4) not null default 0,
  percent_change  numeric(8,  4) not null default 0,    -- e.g. 1.23 means +1.23 %
  volume          bigint      not null default 0,
  last_updated_at timestamptz not null default now()
);

comment on table  public.stocks               is 'Cached real-time stock quote data.';
comment on column public.stocks.symbol        is 'Ticker symbol (uppercase), e.g. AAPL.';
comment on column public.stocks.percent_change is 'Price change expressed as a percentage.';
comment on column public.stocks.last_updated_at is 'Timestamp of the most recent data refresh.';

-- Index for fast symbol look-ups
create index if not exists stocks_symbol_idx on public.stocks (symbol);


-- =============================================================
-- TABLE: watchlists
-- =============================================================
-- Each row represents a single stock symbol that a user has
-- added to their personal watchlist.  One user may watch many
-- symbols; uniqueness is enforced on (user_id, stock_symbol).
-- =============================================================
create table if not exists public.watchlists (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  stock_symbol text        not null,   -- Ticker symbol, matches stocks.symbol
  created_at   timestamptz not null default now(),

  constraint watchlists_user_symbol_unique unique (user_id, stock_symbol)
);

comment on table  public.watchlists              is 'Per-user list of tracked stock symbols.';
comment on column public.watchlists.stock_symbol is 'Ticker symbol the user is watching.';

create index if not exists watchlists_user_id_idx on public.watchlists (user_id);


-- =============================================================
-- TABLE: alerts
-- =============================================================
-- Each row is a threshold-based price alert set by a user.
-- The frontend polls/subscribes and fires a notification when
-- the live price crosses the target in the specified direction.
-- =============================================================
create table if not exists public.alerts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  stock_symbol text        not null,
  target_price numeric(12, 4) not null,
  -- 'above': alert when price rises above target_price
  -- 'below': alert when price falls below target_price
  alert_type   text        not null check (alert_type in ('above', 'below')),
  is_triggered boolean     not null default false,  -- set to true once fired
  triggered_at timestamptz,                         -- when the alert fired
  created_at   timestamptz not null default now()
);

comment on table  public.alerts              is 'User-defined price threshold alerts.';
comment on column public.alerts.alert_type   is 'Direction of the threshold: above or below.';
comment on column public.alerts.is_triggered is 'True once the alert condition has been met.';

create index if not exists alerts_user_id_idx     on public.alerts (user_id);
create index if not exists alerts_symbol_idx      on public.alerts (stock_symbol);
create index if not exists alerts_triggered_idx   on public.alerts (is_triggered) where not is_triggered;


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- ---------------------------------------------------------------
-- profiles – users read/update only their own row
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ---------------------------------------------------------------
-- stocks – publicly readable; only service role may write
-- (writes happen server-side via the API polling service)
-- ---------------------------------------------------------------
alter table public.stocks enable row level security;

create policy "stocks: public read"
  on public.stocks for select
  using (true);

-- No INSERT/UPDATE/DELETE policy for authenticated users;
-- the Supabase service-role key (used only in backend/edge
-- functions) bypasses RLS and handles writes.


-- ---------------------------------------------------------------
-- watchlists – users manage only their own rows
-- ---------------------------------------------------------------
alter table public.watchlists enable row level security;

create policy "watchlists: owner select"
  on public.watchlists for select
  using (auth.uid() = user_id);

create policy "watchlists: owner insert"
  on public.watchlists for insert
  with check (auth.uid() = user_id);

create policy "watchlists: owner delete"
  on public.watchlists for delete
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------
-- alerts – users manage only their own rows
-- ---------------------------------------------------------------
alter table public.alerts enable row level security;

create policy "alerts: owner select"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "alerts: owner insert"
  on public.alerts for insert
  with check (auth.uid() = user_id);

create policy "alerts: owner update"
  on public.alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "alerts: owner delete"
  on public.alerts for delete
  using (auth.uid() = user_id);


-- =============================================================
-- DONE
-- =============================================================
