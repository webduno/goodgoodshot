-- Persist host tee position once per match so guests see the host at the real tee (not 0,0,0).

create or replace function public.set_pvp_host_spawn_if_default(
  p_room_id uuid,
  p_x bigint,
  p_y bigint,
  p_z bigint
)
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

  if r.host_user_id <> auth.uid() then
    raise exception 'not host';
  end if;

  if r.status <> 'playing' then
    return;
  end if;

  if r.host_spawn_x <> 0 or r.host_spawn_y <> 0 or r.host_spawn_z <> 0 then
    return;
  end if;

  update public.pvp_rooms
  set host_spawn_x = p_x,
      host_spawn_y = p_y,
      host_spawn_z = p_z,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.set_pvp_host_spawn_if_default(uuid, bigint, bigint, bigint) to authenticated;
