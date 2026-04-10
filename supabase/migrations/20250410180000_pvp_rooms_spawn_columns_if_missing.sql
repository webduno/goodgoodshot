-- Idempotent: safe if 20250410160000 already ran.
-- Needed when only 20250410170000 (submit_pvp_shot) was applied manually — that migration
-- does not add columns; submit_pvp_shot updates host_spawn_* / guest_spawn_*.

alter table public.pvp_rooms
  add column if not exists host_spawn_x bigint not null default 0,
  add column if not exists host_spawn_y bigint not null default 0,
  add column if not exists host_spawn_z bigint not null default 0,
  add column if not exists guest_spawn_x bigint,
  add column if not exists guest_spawn_y bigint,
  add column if not exists guest_spawn_z bigint;

-- Same as 20250410160000 — present here so DBs that skipped that migration still get the RPC.
create or replace function public.set_pvp_guest_start_if_null(
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

  if auth.uid() not in (r.host_user_id, r.guest_user_id) then
    raise exception 'not a player';
  end if;

  if r.status <> 'playing' then
    return;
  end if;

  if r.guest_spawn_x is not null then
    return;
  end if;

  update public.pvp_rooms
  set guest_spawn_x = p_x,
      guest_spawn_y = p_y,
      guest_spawn_z = p_z,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.set_pvp_guest_start_if_null(uuid, bigint, bigint, bigint) to authenticated;

