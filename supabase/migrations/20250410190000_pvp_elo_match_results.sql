-- Per-player Elo + one row per finished match (stats + rating before/after) for leaderboards later.

create table if not exists public.pvp_player_ratings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  elo int not null default 1500
    check (elo >= 100 and elo <= 4000),
  matches_played int not null default 0 check (matches_played >= 0),
  wins int not null default 0 check (wins >= 0),
  losses int not null default 0 check (losses >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists pvp_player_ratings_elo_desc_idx
  on public.pvp_player_ratings (elo desc);

create table if not exists public.pvp_match_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  guest_user_id uuid not null references auth.users (id) on delete cascade,
  winner_user_id uuid not null references auth.users (id) on delete restrict,
  end_reason text not null check (end_reason in ('hit', 'leave')),
  course_seed bigint not null,
  host_vehicle_id text,
  guest_vehicle_id text,
  host_elo_before int not null,
  host_elo_after int not null,
  guest_elo_before int not null,
  guest_elo_after int not null,
  host_shots int not null default 0 check (host_shots >= 0),
  guest_shots int not null default 0 check (guest_shots >= 0),
  host_hits int not null default 0 check (host_hits >= 0),
  guest_hits int not null default 0 check (guest_hits >= 0),
  host_misses int not null default 0 check (host_misses >= 0),
  guest_misses int not null default 0 check (guest_misses >= 0),
  host_penalties int not null default 0 check (host_penalties >= 0),
  guest_penalties int not null default 0 check (guest_penalties >= 0),
  host_enemy_losses int not null default 0 check (host_enemy_losses >= 0),
  guest_enemy_losses int not null default 0 check (guest_enemy_losses >= 0),
  finished_at timestamptz not null default now()
);

create index if not exists pvp_match_results_finished_at_desc_idx
  on public.pvp_match_results (finished_at desc);

alter table public.pvp_player_ratings enable row level security;
alter table public.pvp_match_results enable row level security;

drop policy if exists "pvp_player_ratings_select_authenticated" on public.pvp_player_ratings;
create policy "pvp_player_ratings_select_authenticated"
  on public.pvp_player_ratings for select
  to authenticated
  using (true);

drop policy if exists "pvp_player_ratings_no_mutate" on public.pvp_player_ratings;
create policy "pvp_player_ratings_no_mutate"
  on public.pvp_player_ratings for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists "pvp_match_results_select_participants" on public.pvp_match_results;
create policy "pvp_match_results_select_participants"
  on public.pvp_match_results for select
  to authenticated
  using (
    auth.uid() = host_user_id
    or auth.uid() = guest_user_id
  );

drop policy if exists "pvp_match_results_no_mutate" on public.pvp_match_results;
create policy "pvp_match_results_no_mutate"
  on public.pvp_match_results for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.pvp_on_room_finished_elo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h uuid;
  g uuid;
  w uuid;
  elo_k numeric := 32;
  ea numeric;
  eb numeric;
  sa numeric;
  sb numeric;
  h_before int;
  g_before int;
  h_after int;
  g_after int;
  reason text;
  hs int;
  gs int;
  hh int;
  gh int;
  hm int;
  gm int;
  hp int;
  gp int;
  hel int;
  gel int;
begin
  if new.status <> 'finished' or old.status = 'finished' then
    return new;
  end if;

  h := new.host_user_id;
  g := new.guest_user_id;
  w := new.winner_user_id;

  if g is null or w is null then
    return new;
  end if;

  if exists (select 1 from public.pvp_match_results where room_id = new.id) then
    return new;
  end if;

  insert into public.pvp_player_ratings (user_id)
  values (h), (g)
  on conflict (user_id) do nothing;

  select elo into h_before
  from public.pvp_player_ratings
  where user_id = h
  for update;

  select elo into g_before
  from public.pvp_player_ratings
  where user_id = g
  for update;

  if h_before is null then
    h_before := 1500;
  end if;
  if g_before is null then
    g_before := 1500;
  end if;

  ea := 1.0 / (1.0 + power(10::numeric, (g_before - h_before) / 400.0));
  eb := 1.0 - ea;

  if w = h then
    sa := 1;
    sb := 0;
  elsif w = g then
    sa := 0;
    sb := 1;
  else
    return new;
  end if;

  h_after := round(h_before + elo_k * (sa - ea))::int;
  g_after := round(g_before + elo_k * (sb - eb))::int;

  if h_after < 100 then h_after := 100; elsif h_after > 4000 then h_after := 4000; end if;
  if g_after < 100 then g_after := 100; elsif g_after > 4000 then g_after := 4000; end if;

  update public.pvp_player_ratings
  set elo = h_after,
      matches_played = matches_played + 1,
      wins = wins + case when w = h then 1 else 0 end,
      losses = losses + case when w = h then 0 else 1 end,
      updated_at = now()
  where user_id = h;

  update public.pvp_player_ratings
  set elo = g_after,
      matches_played = matches_played + 1,
      wins = wins + case when w = g then 1 else 0 end,
      losses = losses + case when w = g then 0 else 1 end,
      updated_at = now()
  where user_id = g;

  select
    count(*) filter (where user_id = h)::int,
    count(*) filter (where user_id = g)::int,
    count(*) filter (where user_id = h and outcome = 'hit')::int,
    count(*) filter (where user_id = g and outcome = 'hit')::int,
    count(*) filter (where user_id = h and outcome = 'miss')::int,
    count(*) filter (where user_id = g and outcome = 'miss')::int,
    count(*) filter (where user_id = h and outcome = 'penalty')::int,
    count(*) filter (where user_id = g and outcome = 'penalty')::int,
    count(*) filter (where user_id = h and outcome = 'enemy_loss')::int,
    count(*) filter (where user_id = g and outcome = 'enemy_loss')::int
  into hs, gs, hh, gh, hm, gm, hp, gp, hel, gel
  from public.pvp_shots
  where room_id = new.id;

  if exists (
    select 1
    from public.pvp_shots
    where room_id = new.id
      and outcome = 'hit'
      and user_id = w
  ) then
    reason := 'hit';
  else
    reason := 'leave';
  end if;

  insert into public.pvp_match_results (
    room_id,
    host_user_id,
    guest_user_id,
    winner_user_id,
    end_reason,
    course_seed,
    host_vehicle_id,
    guest_vehicle_id,
    host_elo_before,
    host_elo_after,
    guest_elo_before,
    guest_elo_after,
    host_shots,
    guest_shots,
    host_hits,
    guest_hits,
    host_misses,
    guest_misses,
    host_penalties,
    guest_penalties,
    host_enemy_losses,
    guest_enemy_losses,
    finished_at
  )
  values (
    new.id,
    h,
    g,
    w,
    reason,
    new.course_seed,
    new.host_vehicle_id,
    new.guest_vehicle_id,
    h_before,
    h_after,
    g_before,
    g_after,
    coalesce(hs, 0),
    coalesce(gs, 0),
    coalesce(hh, 0),
    coalesce(gh, 0),
    coalesce(hm, 0),
    coalesce(gm, 0),
    coalesce(hp, 0),
    coalesce(gp, 0),
    coalesce(hel, 0),
    coalesce(gel, 0),
    now()
  );

  return new;
end;
$$;

drop trigger if exists pvp_rooms_finished_elo on public.pvp_rooms;
create trigger pvp_rooms_finished_elo
  after update of status, winner_user_id on public.pvp_rooms
  for each row
  when (old.status is distinct from new.status and new.status = 'finished')
  execute function public.pvp_on_room_finished_elo();
