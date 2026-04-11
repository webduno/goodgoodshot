-- Single text blob for in-room chat (PvP and PvE). Appended lines: "Name: message\n".

alter table public.pvp_rooms
  add column if not exists chat_text text not null default '';

create or replace function public.append_pvp_room_chat(p_room_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.pvp_rooms%rowtype;
  label text;
  line text;
  umsg text;
  next_text text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  umsg := trim(both from p_message);
  if umsg is null or length(umsg) = 0 then
    raise exception 'empty message';
  end if;
  if length(umsg) > 200 then
    umsg := left(umsg, 200);
  end if;
  umsg := replace(replace(umsg, chr(10), ' '), chr(13), ' ');

  select * into r from public.pvp_rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found';
  end if;

  if auth.uid() <> r.host_user_id and (r.guest_user_id is null or auth.uid() <> r.guest_user_id) then
    raise exception 'not a player';
  end if;

  select coalesce(
    nullif(trim((select username from public.player_profiles where user_id = auth.uid())), ''),
    'Player'
  ) into label;

  line := label || ': ' || umsg || chr(10);
  next_text := coalesce(r.chat_text, '') || line;
  if length(next_text) > 10000 then
    next_text := right(next_text, 10000);
  end if;

  update public.pvp_rooms
  set chat_text = next_text,
      updated_at = now()
  where id = p_room_id;
end;
$$;

grant execute on function public.append_pvp_room_chat(uuid, text) to authenticated;
