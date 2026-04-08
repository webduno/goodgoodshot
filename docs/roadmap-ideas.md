# Roadmap ideas (fun + optimized)

This note builds on **`docs/game-design.md`** and **`docs/technical.md`**. The playfield is intentionally **flat**: one dominant ground plane per fairway segment, **void** between islands, and **hand-integrated** ball math—no general-purpose physics engine. The list below favors changes that add interest **without** forcing terrain meshes, rigid-body stacks, or many simultaneous simulations.

---

## Already in the game (do not re-scope as “roadmap basics”)

The following are **implemented** and documented in the two base docs:

- **Strength** power-up: **stackable** taps before a shot (**×2^n** launch force), then resets on fire.
- **No bounce** and **No wind** power-ups: next-shot modifiers (charges tracked in HUD).
- **Guideline** / trajectory assist: separate from the purchasable slot row; settings + shoot flow in `CubeScene` / `SceneContent`.
- **Placeholder slots** in `POWERUP_SLOTS` (e.g. Time, Magnet, Lucky) are **names only**—good candidates for *future* work, not missing core features.

Roadmap items below are **additive** (new objectives, zones, art passes, etc.), not replacements for the above.

---

## Principles (keep performance sane)

1. **Stay on the flat model:** Prefer rules that only need **XZ tests** (point-in-rectangle, distance to segment) and the existing **floor height** / bounce / roll pipeline.
2. **One ball, one hot path:** New mechanics should extend `Projectile` + `SphereToGoal` logic or **event hooks** (pickup collected, landed on pad), not spawn extra flying actors unless rare and capped.
3. **Data over code:** New vehicles, shot modifiers, and hole parameters belong in **JSON / tables** (`defaultVehicles.json`-style) so balance tweaks do not multiply `useFrame` subscribers.
4. **Visuals that scale:** Favor **material/sky swaps** (time of day, biome tint), **instancing** if a prop type explodes in count, and **cheap particles** (short bursts at shot/landing, not continuous smoke fields).
5. **Preview honesty:** If a feature adds forces (e.g. wind layers), either keep the guideline cheap (first segment only, as today) or accept a **labeled approximation**—full multi-bounce + wind preview can get expensive fast.

---

## Tier A — High fun / low risk (mostly logic & content)

| Idea | Why it fits the flat world | Perf note |
|------|---------------------------|-----------|
| **Hole objectives** | Par, birdie, “land on island 3,” “collect N coins before goal,” optional **challenge flags** per seed. | Branching in outcome handlers; no new geometry required. |
| **Rotating wind or “gust” phases** | Still **constant XZ acceleration** per shot or per time window—no fluid sim. | Same integrator; only the accel vector changes. |
| **Fairway “zones”** | On each island, mark **XZ regions** (mud = stronger roll decel; ice = weaker decel; magnet strip pulls toward goal). | One extra **point-in-polygon** test per frame while rolling or airborne near ground—cheap if zones are few AABBs. |
| **Score bonuses (not Strength)** | **Separate** from existing **Strength ×2^n**: e.g. optional **inner ring** on the green, combo chains, or medal tiers—rewards *placement* or *objectives*, not another global force multiplier. | Still sphere vs region tests; avoids stacking confusion with the Strength power-up. |
| **Wire up placeholder power-ups** | Implement **Time / Magnet / Lucky** (or drop unused ids) using the same **next-shot flag / multiplier** pattern—no new physics engine. | Same order of cost as current `noWind` / `noBounce` plumbing. |
| **Progression meta** | Unlock vehicles, cosmetic trails (see Tier B), gold sinks, **seeded daily holes** (deterministic wind + layout). | Mostly UI and persistence. |
| **Audio polish** | Layered SFX (charge tiers, wind gust, surface type on roll). | CPU-light; watch simultaneous WebAudio nodes on low-end mobile. |

---

## Tier B — Moderate work; still mesh-friendly

| Idea | Why it fits | Perf note |
|------|-------------|-----------|
| **Instanced props** | Trees/bushes/coins already scale with procedural layout; if draw calls hurt, **merge repeated meshes** via `InstancedMesh` for one biome. | Big win when counts grow; one-time refactor per prop type. |
| **Stepped “relief” (fake elevation)** | **Visual only:** slightly offset island mesh chunks or use a **shader** wobble—gameplay still uses flat physics until you commit to real heights. | Zero sim cost if decorative. |
| **Bumpers / rails** | **Cylinder or segment collision in XZ** at floor height: reflect or damp `vx/vz` when the ball’s XZ enters a volume—still no stacked rigid bodies. | A few extra tests per frame while rolling; keep volumes coarse. |
| **Moving goal or patrol target** | Goal messenger pattern already moves on **XZ**; extend with **timing-based** telegraphs (arrows, color pulse). | Same order of magnitude as current enemies; cap count. |
| **Short VFX at events** | Confetti, dust puff on landing, goal flash—**burst** particles, not always-on emitters. | Pool a small number of particle systems; disable when off-screen if needed. |

---

## Tier C — Bigger bets (know the cost)

| Idea | Tradeoff |
|------|----------|
| **Real heightfields / sloped fairways** | Opens golf-like lies and rolls, but collision and guidelines become **much** harder and heavier than today’s single plane + void checks. |
| **Many balls or chain-reaction shots** | Breaks the “one projectile ref” model; budget CPU and UX carefully. |
| **Destructible voxel terrain** | Fun but opposite of “flat + cheap”; treat as a separate prototype. |

---

## Suggested sequencing (example)

1. **Objectives + challenges** (Tier A) to deepen replay without touching the renderer.
2. **Fairway zones** (Tier A) to add reads without new art pipelines.
3. **Instancing audit** (Tier B) if profiling shows GPU bound on dense holes.
4. **Bumpers or moving telegraphs** (Tier B) if you want skill expression without terrain complexity.
5. Revisit **Tier C** only if the game direction truly needs height/slopes and you can budget collision + UX.

---

## What to measure before optimizing further

- **Frame time** on a mid-range laptop and a mid Android device while **charging + following the ball** (worst-case UI + camera + sim).
- **Draw calls** / React component count for **coins × LaneCoin** `useFrame` spinners—if needed, batch idle spins into one updater.

This roadmap stays aligned with: **trajectory skill**, **wind**, **vehicles**, **biomes**, existing **power-ups** (Strength, No bounce, No wind, Guideline flow), and a **flat, readable world** that stays cheap to simulate.
