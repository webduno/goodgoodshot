-- Cloud sync for gold coins + shop inventory (only when username is set).

alter table public.player_profiles
  add column if not exists total_gold_coins integer not null default 0;

alter table public.player_profiles
  add column if not exists shop_inventory jsonb;

comment on column public.player_profiles.total_gold_coins is
  'Lane / shop gold coins; synced only for accounts with a username.';
comment on column public.player_profiles.shop_inventory is
  'JSON snapshot of client shop inventory; synced only for accounts with a username.';

create or replace function public.set_player_progress(
  p_total_gold_coins integer,
  p_shop_inventory jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  uname text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_total_gold_coins is null or p_total_gold_coins < 0 then
    raise exception 'invalid_coins';
  end if;

  select username into uname
  from public.player_profiles
  where user_id = uid
  for update;

  if not found then
    raise exception 'no_profile';
  end if;

  if uname is null or trim(both from uname) = '' then
    raise exception 'username_required';
  end if;

  update public.player_profiles
  set total_gold_coins = p_total_gold_coins,
      shop_inventory = p_shop_inventory,
      updated_at = now()
  where user_id = uid;
end;
$$;

grant execute on function public.set_player_progress(integer, jsonb) to authenticated;
