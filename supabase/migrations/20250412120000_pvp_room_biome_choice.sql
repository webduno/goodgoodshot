-- Host-selected fairway biome (or random) for PvP/PvE rooms.

alter table public.pvp_rooms
  add column if not exists biome_choice text not null default 'random'
    check (biome_choice in ('random', 'plain', 'desert', 'forest', 'snow', 'sea', 'ice'));

drop function if exists public.create_pvp_room(text);
drop function if exists public.create_pvp_room(text, text);

create or replace function public.create_pvp_room(
  p_match_mode text default 'pvp',
  p_biome_choice text default 'random'
)
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
  if p_biome_choice is null
     or p_biome_choice not in ('random', 'plain', 'desert', 'forest', 'snow', 'sea', 'ice') then
    raise exception 'invalid biome choice';
  end if;
  seed := (floor(random() * 9223372036854775807::double precision))::bigint;
  insert into public.pvp_rooms (host_user_id, status, course_seed, match_mode, biome_choice)
  values (auth.uid(), 'waiting', seed, p_match_mode, p_biome_choice)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.create_pvp_room(text, text) to authenticated;

-- Lobby list: include biome for UI.
drop function if exists public.list_open_pvp_rooms_today();

create or replace function public.list_open_pvp_rooms_today()
returns table (
  id uuid,
  created_at timestamptz,
  course_seed bigint,
  status text,
  match_mode text,
  biome_choice text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.course_seed, r.status, r.match_mode, r.biome_choice
  from public.pvp_rooms r
  where r.created_at >= (date_trunc('day', (now() at time zone 'utc')) at time zone 'utc')
  and r.status = 'waiting'
  and r.guest_user_id is null
  and r.host_user_id is distinct from auth.uid()
  order by r.created_at asc;
$$;

grant execute on function public.list_open_pvp_rooms_today() to authenticated;
