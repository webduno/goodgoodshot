-- Public leaderboard: Elo from `pvp_player_ratings` + optional username from `player_profiles`.
-- Client cannot join `player_profiles` for other users under RLS; this RPC runs as definer.

create or replace function public.pvp_leaderboard_top(p_limit int default 8)
returns table (
  user_id uuid,
  elo int,
  matches_played int,
  wins int,
  losses int,
  updated_at timestamptz,
  username text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.user_id,
    r.elo,
    r.matches_played,
    r.wins,
    r.losses,
    r.updated_at,
    nullif(trim(p.username), '') as username
  from public.pvp_player_ratings r
  left join public.player_profiles p on p.user_id = r.user_id
  order by r.elo desc
  limit least(greatest(coalesce(p_limit, 8), 1), 32);
$$;

grant execute on function public.pvp_leaderboard_top(int) to authenticated;
