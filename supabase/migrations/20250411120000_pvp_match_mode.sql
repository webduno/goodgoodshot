-- PvP vs PvE (race to pyramid) room mode.

alter table public.pvp_rooms
  add column if not exists match_mode text not null default 'pvp'
    check (match_mode in ('pvp', 'pve'));

create index if not exists pvp_rooms_waiting_match_mode_created_at_idx
  on public.pvp_rooms (status, match_mode, created_at);

-- Replace create_pvp_room to accept optional mode (PostgREST: named arg p_match_mode).
drop function if exists public.create_pvp_room();
create or replace function public.create_pvp_room(p_match_mode text default 'pvp')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  seed bigint;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_match_mode is null or p_match_mode not in ('pvp', 'pve') then
    raise exception 'invalid match mode';
  end if;
  seed := (floor(random() * 9223372036854775807::double precision))::bigint;
  insert into public.pvp_rooms (host_user_id, status, course_seed, match_mode)
  values (auth.uid(), 'waiting', seed, p_match_mode)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.create_pvp_room(text) to authenticated;

-- Quick match: only join rooms of the same mode (default PvP).
drop function if exists public.join_first_open_pvp_room();
create or replace function public.join_first_open_pvp_room(p_match_mode text default 'pvp')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_match_mode is null or p_match_mode not in ('pvp', 'pve') then
    raise exception 'invalid match mode';
  end if;

  select id into rid
  from public.pvp_rooms
  where status = 'waiting'
    and guest_user_id is null
    and host_user_id <> auth.uid()
    and match_mode = p_match_mode
  order by created_at asc
  for update skip locked
  limit 1;

  if rid is null then
    return null;
  end if;

  update public.pvp_rooms
  set guest_user_id = auth.uid(),
      status = 'playing',
      current_turn_user_id = host_user_id,
      updated_at = now()
  where id = rid;

  return rid;
end;
$$;

grant execute on function public.join_first_open_pvp_room(text) to authenticated;

-- Lobby list includes mode for UI (DROP required: return row type changed vs original 4-column version).
drop function if exists public.list_open_pvp_rooms_today();

create or replace function public.list_open_pvp_rooms_today()
returns table (
  id uuid,
  created_at timestamptz,
  course_seed bigint,
  status text,
  match_mode text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.course_seed, r.status, r.match_mode
  from public.pvp_rooms r
  where r.created_at >= (date_trunc('day', (now() at time zone 'utc')) at time zone 'utc')
  and r.status = 'waiting'
  and r.guest_user_id is null
  and r.host_user_id is distinct from auth.uid()
  order by r.created_at asc;
$$;

grant execute on function public.list_open_pvp_rooms_today() to authenticated;

-- Ranked Elo only for PvP duels.
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

  if new.match_mode = 'pve' then
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
