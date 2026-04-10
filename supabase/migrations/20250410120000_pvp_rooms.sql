-- PvP turn-based rooms: run in Supabase SQL editor or via `supabase db push`.
-- Enable Anonymous sign-in under Authentication > Providers for frictionless play.

create table if not exists public.pvp_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  host_user_id uuid not null references auth.users (id) on delete cascade,
  guest_user_id uuid references auth.users (id) on delete set null,
  current_turn_user_id uuid references auth.users (id) on delete set null,
  winner_user_id uuid references auth.users (id) on delete set null,
  course_seed bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pvp_rooms_status_created_at_idx
  on public.pvp_rooms (status, created_at);

alter table public.pvp_rooms replica identity full;

create table if not exists public.pvp_shots (
  id bigint primary key generated always as identity,
  room_id uuid not null references public.pvp_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  shot_index int not null,
  outcome text not null
    check (outcome in ('hit', 'miss', 'penalty', 'enemy_loss')),
  created_at timestamptz not null default now()
);

create index if not exists pvp_shots_room_id_idx on public.pvp_shots (room_id);

alter table public.pvp_rooms enable row level security;
alter table public.pvp_shots enable row level security;

drop policy if exists "pvp_rooms_select_participants" on public.pvp_rooms;
create policy "pvp_rooms_select_participants"
  on public.pvp_rooms for select
  using (
    auth.uid() = host_user_id
    or auth.uid() = guest_user_id
  );

drop policy if exists "pvp_rooms_no_insert" on public.pvp_rooms;
create policy "pvp_rooms_no_insert"
  on public.pvp_rooms for insert
  with check (false);

drop policy if exists "pvp_rooms_no_update" on public.pvp_rooms;
create policy "pvp_rooms_no_update"
  on public.pvp_rooms for update
  using (false);

drop policy if exists "pvp_shots_select_participants" on public.pvp_shots;
create policy "pvp_shots_select_participants"
  on public.pvp_shots for select
  using (
    exists (
      select 1 from public.pvp_rooms r
      where r.id = pvp_shots.room_id
        and (r.host_user_id = auth.uid() or r.guest_user_id = auth.uid())
    )
  );

drop policy if exists "pvp_shots_no_insert" on public.pvp_shots;
create policy "pvp_shots_no_insert"
  on public.pvp_shots for insert
  with check (false);

-- RPCs (SECURITY DEFINER bypasses RLS for controlled writes)

create or replace function public.create_pvp_room()
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
  seed := (floor(random() * 9223372036854775807::double precision))::bigint;
  insert into public.pvp_rooms (host_user_id, status, course_seed)
  values (auth.uid(), 'waiting', seed)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.create_pvp_room() to authenticated;

create or replace function public.join_first_open_pvp_room()
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

  select id into rid
  from public.pvp_rooms
  where status = 'waiting'
    and guest_user_id is null
    and host_user_id <> auth.uid()
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

grant execute on function public.join_first_open_pvp_room() to authenticated;

create or replace function public.join_pvp_room_by_id(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pvp_rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.pvp_rooms where id = p_room_id for update;

  if not found then
    raise exception 'room not found';
  end if;

  if r.status = 'finished' then
    raise exception 'game over';
  end if;

  if r.host_user_id = auth.uid() or r.guest_user_id = auth.uid() then
    return;
  end if;

  if r.guest_user_id is not null then
    raise exception 'room full';
  end if;

  update public.pvp_rooms
  set guest_user_id = auth.uid(),
      status = 'playing',
      current_turn_user_id = host_user_id,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.join_pvp_room_by_id(uuid) to authenticated;

create or replace function public.submit_pvp_shot(p_room_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pvp_rooms%rowtype;
  other uuid;
  next_idx int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_outcome not in ('hit', 'miss', 'penalty', 'enemy_loss') then
    raise exception 'invalid outcome';
  end if;

  select * into r from public.pvp_rooms where id = p_room_id for update;

  if not found then
    raise exception 'room not found';
  end if;

  if r.status <> 'playing' then
    raise exception 'game not in progress';
  end if;

  if auth.uid() not in (r.host_user_id, r.guest_user_id) then
    raise exception 'not a player';
  end if;

  if r.current_turn_user_id is null or r.current_turn_user_id <> auth.uid() then
    raise exception 'not your turn';
  end if;

  select coalesce(max(shot_index), 0) + 1 into next_idx
  from public.pvp_shots where room_id = p_room_id;

  insert into public.pvp_shots (room_id, user_id, shot_index, outcome)
  values (p_room_id, auth.uid(), next_idx, p_outcome);

  if p_outcome = 'hit' then
    update public.pvp_rooms
    set status = 'finished',
        winner_user_id = auth.uid(),
        updated_at = now()
    where id = p_room_id;
    return;
  end if;

  other := case
    when auth.uid() = r.host_user_id then r.guest_user_id
    else r.host_user_id
  end;

  if other is null then
    raise exception 'opponent not connected';
  end if;

  update public.pvp_rooms
  set current_turn_user_id = other,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.submit_pvp_shot(uuid, text) to authenticated;

-- Realtime: broadcast row changes to subscribed clients
alter publication supabase_realtime add table public.pvp_rooms;
