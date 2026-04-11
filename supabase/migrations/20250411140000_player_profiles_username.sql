-- One-time username per account; unique case-insensitive.

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text,
  username_set_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_profiles_username_lower_idx
  on public.player_profiles (lower(username))
  where username is not null;

alter table public.player_profiles enable row level security;

drop policy if exists "player_profiles_select_own" on public.player_profiles;
create policy "player_profiles_select_own"
  on public.player_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "player_profiles_no_mutate" on public.player_profiles;
create policy "player_profiles_no_mutate"
  on public.player_profiles for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.set_player_username(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  t text;
  prev_username text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  t := trim(both from p_username);
  if t is null or length(t) < 2 then
    raise exception 'username_too_short';
  end if;
  if length(t) > 24 then
    raise exception 'username_too_long';
  end if;
  if t !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'username_invalid_chars';
  end if;

  select username into prev_username
  from public.player_profiles
  where user_id = uid
  for update;

  if found then
    if prev_username is not null then
      raise exception 'username_already_set';
    end if;
  end if;

  if exists (
    select 1 from public.player_profiles
    where lower(username) = lower(t) and user_id <> uid
  ) then
    raise exception 'username_taken';
  end if;

  if found then
    update public.player_profiles
    set username = t,
        username_set_at = now(),
        updated_at = now()
    where user_id = uid and username is null;
    if not found then
      raise exception 'username_already_set';
    end if;
  else
    insert into public.player_profiles (user_id, username, username_set_at, updated_at)
    values (uid, t, now(), now());
  end if;
end;
$$;

grant execute on function public.set_player_username(text) to authenticated;
