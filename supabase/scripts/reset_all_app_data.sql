-- =============================================================================
-- Reset all application data (development / “start fresh”)
-- =============================================================================
-- Run in Supabase SQL Editor (or `psql`) against your project.
--
-- Deletes rows from:
--   pvp_match_results, pvp_rooms (+ pvp_shots via FK cascade), pvp_player_ratings,
--   player_profiles
--
-- Does NOT remove auth.users. Users can still sign in; they will get empty profiles
-- until they set a username / sync again. To wipe identities too, use the Dashboard:
-- Authentication → Users (or delete per-user).
--
-- WARNING: Irreversible. Do not run on production unless you intend to wipe data.
-- =============================================================================

BEGIN;

TRUNCATE TABLE public.pvp_match_results RESTART IDENTITY;

TRUNCATE TABLE public.pvp_rooms RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.pvp_player_ratings RESTART IDENTITY;

TRUNCATE TABLE public.player_profiles RESTART IDENTITY;

COMMIT;
