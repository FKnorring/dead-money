-- dead-money: initial schema
-- Run this in the Supabase SQL editor after creating your project.
--
-- Domain entities: Player, Session, Seat, BuyIn, StackEvent
-- See CONTEXT.md for the full domain glossary.

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type session_state as enum ('lobby', 'active', 'closed');
create type stack_event_type as enum ('snapshot', 'cash_out');

-- ─── Tables ─────────────────────────────────────────────────────────────────

-- Player — global registry, persists across all sessions (ADR-0001)
create table players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  swish_number text,                        -- optional; used for Swish deep links at settlement
  created_at   timestamptz not null default now()
);

-- Session — a single game night (lobby → active → closed)
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  state           session_state not null default 'lobby',
  buy_in_amount   integer not null,         -- kr; default buy-in (= 100 BB)
  bb_size         integer not null,         -- kr per BB (= buy_in_amount / 100)
  label           text,                     -- optional custom name; falls back to date
  location        text,                     -- optional location string
  host_player_id  uuid not null references players(id),
  created_at      timestamptz not null default now(),
  started_at      timestamptz,             -- set when state transitions to 'active'
  closed_at       timestamptz              -- set when state transitions to 'closed'
);

-- Seat — a Player's participation in a specific Session (one per player per session)
create table seats (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  player_id     uuid not null references players(id),
  claimed       boolean not null default false,  -- true once the player has joined on their device
  stack         integer,                          -- current stack snapshot (kr); null until first update (ADR-0003)
  cashed_out    boolean not null default false,
  final_stack   integer,                          -- locked absolute value at CashOut
  joined_at     timestamptz not null default now(),
  cashed_out_at timestamptz,
  unique (session_id, player_id)
);

-- BuyIn — a discrete timestamped event: player added chips (initial or top-up)
create table buy_ins (
  id          uuid primary key default gen_random_uuid(),
  seat_id     uuid not null references seats(id) on delete cascade,
  session_id  uuid not null references sessions(id) on delete cascade,
  player_id   uuid not null references players(id),
  amount      integer not null,             -- kr
  created_at  timestamptz not null default now()
);

-- StackEvent — timestamped record of a stack change; powers the session timeline chart
create table stack_events (
  id          uuid primary key default gen_random_uuid(),
  seat_id     uuid not null references seats(id) on delete cascade,
  session_id  uuid not null references sessions(id) on delete cascade,
  player_id   uuid not null references players(id),
  type        stack_event_type not null,
  amount      integer not null,             -- kr (absolute value)
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index on sessions (state);
create index on sessions (created_at desc);
create index on seats (session_id);
create index on seats (player_id);
create index on buy_ins (seat_id);
create index on buy_ins (session_id);
create index on stack_events (seat_id);
create index on stack_events (session_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- RLS is enabled on all tables (required for Realtime to deliver events via the
-- anon key). Policies are permissive — this is a fully public, trust-everyone app.

alter table players      enable row level security;
alter table sessions     enable row level security;
alter table seats        enable row level security;
alter table buy_ins      enable row level security;
alter table stack_events enable row level security;

create policy "public access" on players      for all to anon using (true) with check (true);
create policy "public access" on sessions     for all to anon using (true) with check (true);
create policy "public access" on seats        for all to anon using (true) with check (true);
create policy "public access" on buy_ins      for all to anon using (true) with check (true);
create policy "public access" on stack_events for all to anon using (true) with check (true);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable Postgres CDC for all tables so live buy-in and stack updates broadcast
-- to all connected clients.

alter publication supabase_realtime add table players;
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table seats;
alter publication supabase_realtime add table buy_ins;
alter publication supabase_realtime add table stack_events;
