-- PostgREST / Supabase RPC: avoid DEFAULT args on submit_pvp_shot (schema cache lookup fails).
-- Replaces with explicit (uuid, text, bigint, bigint, bigint); NULL spawns = no position update.

drop function if exists public.submit_pvp_shot(uuid, text);
drop function if exists public.submit_pvp_shot(uuid, text, bigint, bigint, bigint);

create or replace function public.submit_pvp_shot(
  p_room_id uuid,
  p_outcome text,
  p_spawn_x bigint,
  p_spawn_y bigint,
  p_spawn_z bigint
)
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

  if p_outcome in ('miss', 'penalty')
     and p_spawn_x is not null and p_spawn_y is not null and p_spawn_z is not null then
    if auth.uid() = r.host_user_id then
      update public.pvp_rooms
      set host_spawn_x = p_spawn_x,
          host_spawn_y = p_spawn_y,
          host_spawn_z = p_spawn_z,
          current_turn_user_id = other,
          updated_at = now()
      where id = p_room_id;
    else
      update public.pvp_rooms
      set guest_spawn_x = p_spawn_x,
          guest_spawn_y = p_spawn_y,
          guest_spawn_z = p_spawn_z,
          current_turn_user_id = other,
          updated_at = now()
      where id = p_room_id;
    end if;
    return;
  end if;

  update public.pvp_rooms
  set current_turn_user_id = other,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.submit_pvp_shot(uuid, text, bigint, bigint, bigint) to authenticated;
