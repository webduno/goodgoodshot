# Supabase

Migrations live in `migrations/`. Apply with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase db push`) or by running each file in the SQL Editor.

## Reset application data

To clear **game-related tables** while keeping the schema (and auth users), run:

`scripts/reset_all_app_data.sql`

See comments in that file for scope and warnings.
