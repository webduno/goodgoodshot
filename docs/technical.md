# Technical overview

Concise notes on how **Good Good Shot** is built and how the runtime behaves.

---

## Stack and rendering

- **Client:** React (Next.js App Router) loads the 3D view **client-only** (`dynamic(..., { ssr: false })` in `HomeCanvas`) so WebGL runs in the browser only.
- **3D:** **React Three Fiber** (`@react-three/fiber`) drives **Three.js** `WebGLRenderer` inside a full-viewport `<Canvas>`.
- **Renderer options** (`CubeScene`): antialiasing on, opaque background (`alpha: false`), **logarithmic depth buffer** for stable Z on large scenes, **device pixel ratio** clamped to `[1, 2]`, **soft shadows** enabled.

The scene graph is mostly static meshes (islands, props, vehicle, HUD-adjacent 3D UI). There is **no** separate physics engine (no Rapier/Cannon); ball motion is **hand-integrated** in a `useFrame` callback.

---

## Frame loop and FPS

- The render loop is the browser’s **`requestAnimationFrame`** (R3F default). There is **no fixed FPS cap** in code; typical desktop behavior is **display refresh rate** (often ~60 Hz, or higher on high-refresh monitors).
- **Simulation `delta`** is passed into per-frame logic. Ball and enemy movement cap `dt` at **0.05 s** (`SphereToGoal`, `GoalMessengerCharacter`) so a hitch does not explode velocities—effectively a **minimum ~20 logical steps per second** under worst-case frames, while rendering can still run faster.

---

## Per-frame work (`useFrame`)

Several subscribers run each frame; all are **frame-rate–independent** where it matters (they multiply by `delta`):

| Area | Role |
|------|------|
| **`SphereToGoal`** | Integrates the **one** active projectile: position, flight, ground contact, roll. |
| **`TeleportOrbitRig`** | OrbitControls (damped), spawn teleport / intro camera blends, **follow-ball** camera when enabled. |
| **`SceneContent`** | Copies ball mesh position into a **ref** for the camera (cheap sync). |
| **`LaneCoin`** (per visible coin) | Rotates the coin mesh for a idle spin. |
| **`Block` / goal** | Spins the decorative sphere above the goal pyramid. |
| **`GoalMessengerCharacter`** | Steps enemies toward the vehicle when alive. |
| **`SpawnVisualGroup`** | Keeps a visual group glued to spawn position. |

**Concurrency:** Only **one ball** is simulated at a time (`projectileRef`); there is no pool of simultaneous physics bodies. Enemies are a **small fixed count** driven by simple XZ stepping.

---

## Power-ups (how they touch simulation)

All are **cheap**: a few flags and one multiplier at shot time—no extra physics bodies.

| Modifier | Implementation sketch |
|----------|-------------------------|
| **Strength** | `getPowerupMultiplier()` returns **2^stackCount**; applied to launch **force** when the projectile is created (`SceneContent` / shot pipeline). Resets after launch. |
| **No bounce** | Sets projectile / shot flags so **bounces and roll phase** are suppressed for that shot (`SphereToGoal` path). |
| **No wind** | **`prepareShotWind()`** can return **zero** horizontal acceleration for that shot so wind is skipped for the whole ball flight and roll. |

**Guideline** preview stays in **`firstSegmentGuideline.ts`** (no wind, no bounces in the sample)—orthogonal to the charge-based slots; HUD wiring lives in `CubeScene` / `SceneContent`.

---

## Scene size (order of magnitude)

- **Main course:** **`NUM_ISLANDS = 5`** platforms along the lane, plus **optional flank islands** (up to several small pads beside the path, placement is conditional). Total island count is typically **on the order of single digits to low teens**, not hundreds.
- Each island gets **procedural bushes and trees** (`placeBushesOnIslands`, `placeIslandTreesOnIslands`), a **mini-village** may add a few houses, and the lane has **coin** cells—so visible meshes are **low-poly instancing-style geometry** (boxes, cylinders, simple trees), suitable for steady 60 FPS on modest hardware when not CPU-bound elsewhere.

Exact draw calls depend on biome and generated layout; treat this as **hundreds** of mesh primitives across the hole, not tens of thousands of dynamic objects.

---

## Ball physics (high level)

Implemented in **`SphereToGoal`** with a small **`Projectile`** state (`x,y,z`, `vx,vy,vz`, bounce count, rolling flag).

1. **Flight:** Semi-discrete Euler step each frame: **`vy += gravityY * dt`**, horizontal **`vx`/`vz` += wind acceleration × `dt`**, then **`position += velocity × `dt`**. Gravity and wind strengths come from **vehicle config** and **`prepareShotWind()`** (see below).
2. **Wind:** Modeled as **constant horizontal acceleration** for the shot (`lib/game/wind.ts`: random direction, magnitude up to **`WIND_ACCEL_MAX`**). It is **not** a fluid simulation—just XZ acceleration applied every step while the ball moves.
3. **Ground:** A fixed floor height **`FLOOR_CONTACT_CENTER_Y`**. Landing resolves **line–plane** intersection for where the ball crossed the plane; **void** (not over any island) triggers penalty/outcomes via **`pointInVoidXZ`**.
4. **Bounce:** If allowed, **`vy` flips** with **`bounceRestitution`** × inbound speed; **`bouncesRemaining`** decrements.
5. **Roll:** If horizontal speed is above a stop threshold and roll is allowed, the ball enters a **`rolling`** phase: no vertical motion, **`rollDeceleration`** reduces horizontal speed magnitude each frame, wind still applies to XZ. Mesh **rotation** is updated from roll speed for visuals.

**Guideline preview** (`firstSegmentGuideline.ts`) samples the **first airborne segment only** with a fixed **`DT = 1/120`** and **no wind / no bounces**—a cheap analytic-style preview, not identical to the full shot when wind and bounces matter.

---

## Supabase (backend)

The game uses **Supabase** for optional online features: **anonymous auth**, **player profiles** (username + synced gold / shop JSON), and **PvP / PvE rooms** (turn-based matches, Elo for PvP duels).

### Tables (public)

| Table | Role |
|-------|------|
| `player_profiles` | `user_id` → `auth.users`; optional `username`; `total_gold_coins`, `shop_inventory` when username is set |
| `pvp_rooms` | Match room: `status`, `course_seed`, `match_mode` (`pvp` \| `pve`), **`biome_choice`** (`random` or a fixed `BiomeId`), spawns, vehicles, chat, etc. |
| `pvp_shots` | Per-shot outcomes for a room |
| `pvp_player_ratings` | Elo + W/L (PvP only; PvE skips Elo updates) |
| `pvp_match_results` | One row per finished ranked PvP match (stats + Elo before/after) |

RLS generally restricts reads to participants; writes go through **RPCs** (`security definer`).

### RPCs (representative)

- `create_pvp_room(p_match_mode, p_biome_choice)` — host creates a waiting room; stores fairway preference for the match.
- `join_pvp_room_by_id`, `join_first_open_pvp_room` — guest joins.
- `submit_pvp_shot`, `leave_pvp_room`, `set_pvp_room_vehicle`, spawn sync helpers, etc.
- `set_player_username`, `set_player_progress` — profile / cloud sync when a username exists.

### Online fairway (biome)

For **online** rooms, the host picks **random** or a **fixed biome**; it is stored on `pvp_rooms.biome_choice`. Both clients resolve the same visual biome from the room seed where needed (`resolvePvpRoomBiome` in `lib/game/sessionBattleMaps.ts`) so layouts stay in sync.

### Reset / “clean DB” (start fresh)

To **delete all application rows** but keep the schema (and **not** delete `auth.users`), run the script in the Supabase SQL Editor:

`supabase/scripts/reset_all_app_data.sql`

That truncates match history, rooms, shots, ratings, and profiles. Users can still sign in; they will need to set username / sync again. To remove identities, use the Dashboard → Authentication.

---

## Related files

- Render entry: `components/CubeScene.tsx`, `components/HomeCanvas.tsx`
- Ball: `components/game/cube/SphereToGoal.tsx`, `lib/game/types.ts` (`Projectile`)
- Camera: `components/game/cube/TeleportOrbitRig.tsx`
- Islands / counts: `lib/game/islands.ts` (`NUM_ISLANDS`, `computeIslandsForLane`)
- Wind: `lib/game/wind.ts`
- Power-up slots / charges: `lib/game/constants.ts` (`POWERUP_SLOTS`, `INITIAL_POWERUP_CHARGES`); HUD: `components/game/cube/hud/PowerupSlotRow.tsx`
- PvP client: `components/PvpCubeScene.tsx`, `lib/pvp/plazaActions.ts`, `lib/pvp/usePvpRoom.ts`
- Plaza multiplayer UI: `components/game/cube/modals/MultiplayerModal.tsx`, `components/PlazaScene.tsx`
