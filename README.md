# Good Good Shot

3D trajectory / artillery-style game: aim, power, wind, and vehicle-tuned ball physics on floating fairway islands. Built with **Next.js** (App Router), **React Three Fiber**, and **Three.js**.

## Docs

| Doc | Contents |
|-----|----------|
| [docs/technical.md](docs/technical.md) | Stack, frame loop, physics overview, **Supabase** (tables, RPCs, resets) |
| [docs/game-design.md](docs/game-design.md) | Gameplay pillars, biomes, vehicles, power-ups |
| [docs/UI_DESIGN_STYLE.md](docs/UI_DESIGN_STYLE.md) | Frutiger Aero–style UI tokens and patterns |
| [docs/roadmap-ideas.md](docs/roadmap-ideas.md) | Ideas backlog |

## Supabase

Backend features (PvP rooms, profiles, Elo) use **Supabase** (Postgres + Auth). Enable **Anonymous sign-in** under Authentication → Providers for frictionless play.

- **Migrations:** `supabase/migrations/`
- **Wipe app data (keep schema, keep auth users):** run `supabase/scripts/reset_all_app_data.sql` in the SQL Editor — see [supabase/README.md](supabase/README.md)

Local env: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (e.g. `.env.local`).

## Scripts

- `npm run dev` — development server  
- `npm run build` / `npm run start` — production build

See `package.json` for lint/typecheck scripts.
