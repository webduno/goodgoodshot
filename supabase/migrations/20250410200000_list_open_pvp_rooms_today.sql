-- Joinable waiting rooms created since UTC midnight today (for lobby browser).
-- SECURITY DEFINER: RLS only allows participants to read pvp_rooms rows.

create or replace function public.list_open_pvp_rooms_today()
returns table (
  id uuid,
  created_at timestamptz,
  course_seed bigint,
  status text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.course_seed, r.status
  from public.pvp_rooms r
  -- "Today" = UTC calendar day (Supabase DB typically uses UTC).
  where r.created_at >= (date_trunc('day', (now() at time zone 'utc')) at time zone 'utc')
  and r.status = 'waiting'
  and r.guest_user_id is null
  and r.host_user_id is distinct from auth.uid()
  order by r.created_at asc;
$$;

grant execute on function public.list_open_pvp_rooms_today() to authenticated;
