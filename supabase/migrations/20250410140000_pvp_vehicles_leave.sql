-- PvP: persist vehicle choice per player, leave/forfeit RPC.

alter table public.pvp_rooms
  add column if not exists host_vehicle_id text not null default 'default',
  add column if not exists guest_vehicle_id text not null default 'default';

create or replace function public.set_pvp_room_vehicle(p_room_id uuid, p_vehicle_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pvp_rooms%rowtype;
  vid text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  vid := coalesce(nullif(trim(p_vehicle_id), ''), 'default');

  select * into r from public.pvp_rooms where id = p_room_id for update;

  if not found then
    raise exception 'room not found';
  end if;

  if r.host_user_id = auth.uid() then
    update public.pvp_rooms
    set host_vehicle_id = vid, updated_at = now()
    where id = p_room_id;
  elsif r.guest_user_id = auth.uid() then
    update public.pvp_rooms
    set guest_vehicle_id = vid, updated_at = now()
    where id = p_room_id;
  else
    raise exception 'not a player';
  end if;
end;
$$;

grant execute on function public.set_pvp_room_vehicle(uuid, text) to authenticated;

create or replace function public.leave_pvp_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pvp_rooms%rowtype;
  other uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into r from public.pvp_rooms where id = p_room_id for update;

  if not found then
    raise exception 'room not found';
  end if;

  if r.status = 'finished' then
    return;
  end if;

  if r.host_user_id <> auth.uid() and coalesce(r.guest_user_id, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not a player';
  end if;

  if r.status = 'waiting' then
    if r.host_user_id = auth.uid() then
      delete from public.pvp_rooms where id = p_room_id;
    end if;
    return;
  end if;

  if r.status = 'playing' then
    other := case
      when auth.uid() = r.host_user_id then r.guest_user_id
      else r.host_user_id
    end;

    update public.pvp_rooms
    set status = 'finished',
        winner_user_id = other,
        updated_at = now()
    where id = p_room_id;
  end if;
end;
$$;

grant execute on function public.leave_pvp_room(uuid) to authenticated;
