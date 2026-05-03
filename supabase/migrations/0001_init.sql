-- WK 2026 Poule — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push` if using the CLI).

create extension if not exists "pgcrypto";

------------------------------------------------------------
-- users
------------------------------------------------------------
create table users (
  id            uuid primary key default gen_random_uuid(),
  display_name  text unique not null,
  pin_hash      text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

------------------------------------------------------------
-- teams
------------------------------------------------------------
create table teams (
  id          int primary key,           -- football-data.org team id
  name        text not null,
  short_code  text,
  flag_url    text
);

------------------------------------------------------------
-- matches
------------------------------------------------------------
create table matches (
  id                int primary key,      -- football-data.org match id
  stage             text not null,
  group_name        text,
  home_team_id      int references teams(id) on delete set null,
  away_team_id      int references teams(id) on delete set null,
  home_placeholder  text,
  away_placeholder  text,
  kickoff_at        timestamptz not null,
  status            text not null default 'SCHEDULED',
  home_score        int,
  away_score        int,
  winner            text,
  advancing_team_id int references teams(id) on delete set null,
  updated_at        timestamptz not null default now()
);

create index matches_kickoff_idx on matches (kickoff_at);
create index matches_stage_idx   on matches (stage);

------------------------------------------------------------
-- predictions
------------------------------------------------------------
create table predictions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  match_id            int  not null references matches(id) on delete cascade,
  home_score          int  not null,
  away_score          int  not null,
  advancing_team_id   int  references teams(id) on delete set null,
  submitted_at        timestamptz not null default now(),
  locked_at           timestamptz,
  points_exact        int not null default 0,
  points_diff         int not null default 0,
  points_outcome      int not null default 0,
  points_advance      int not null default 0,
  points_total        int generated always as
                        (points_exact + points_diff + points_outcome + points_advance) stored,
  unique (user_id, match_id)
);

create index predictions_user_idx  on predictions (user_id);
create index predictions_match_idx on predictions (match_id);

------------------------------------------------------------
-- bonus questions + predictions
------------------------------------------------------------
create table bonus_questions (
  id              serial primary key,
  key             text unique not null,
  label           text not null,
  type            text not null,
  closes_at       timestamptz not null,
  resolved_value  jsonb
);

create table bonus_predictions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  question_id  int  not null references bonus_questions(id) on delete cascade,
  value        jsonb not null,
  points       int not null default 0,
  submitted_at timestamptz not null default now(),
  unique (user_id, question_id)
);

------------------------------------------------------------
-- scoring config (admin editable)
------------------------------------------------------------
create table scoring_config (
  key         text primary key,
  points      int  not null,
  description text not null
);

insert into scoring_config (key, points, description) values
  ('exact',             5,  'Exacte score (bv. voorspeld 2-1, uitslag 2-1)'),
  ('goal_diff',         3,  'Juist doelsaldo, niet exact (bv. voorspeld 3-2, uitslag 2-1)'),
  ('outcome',           1,  'Alleen juiste uitkomst 1/X/2'),
  ('advance',           2,  'Knock-out: juiste team dat doorgaat (los van score)'),
  ('bonus_top3_each',   5,  'Bonusklassement: per correct land in top-3 wereldkampioen'),
  ('bonus_top_scorer',  10, 'Bonusklassement: juiste topscorer'),
  ('bonus_final_goals', 5,  'Bonusklassement: juist aantal goals in finale');

------------------------------------------------------------
-- bonus questions seed
------------------------------------------------------------
insert into bonus_questions (key, label, type, closes_at) values
  ('top3',         'Top 3 wereldkampioen (in volgorde)', 'top3_teams',  '2026-06-11 16:00:00+00'),
  ('top_scorer',   'Topscorer van het toernooi',         'player_name', '2026-06-11 16:00:00+00'),
  ('final_goals',  'Aantal goals in de finale',          'integer',     '2026-07-19 17:00:00+00');

------------------------------------------------------------
-- helper: bump updated_at on matches
------------------------------------------------------------
create or replace function touch_matches_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger matches_touch_updated_at
  before update on matches
  for each row execute function touch_matches_updated_at();
