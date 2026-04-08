# Game design overview

**Genre:** 3D trajectory / artillery-style play on floating fairway islands.  
**Pillar:** Read the shot (angle, power, wind), land the ball on distant targets within a limited shot budget.

---

## High concept

Players operate a blocky vehicle from a tee area on one island and shoot a ball toward goals or hazards on other platforms. The world is low-poly, bright, and readable: sky, sun, scattered props, and **biome-specific** ground and vegetation. Success depends on **aim**, **shot strength**, **wind**, and **per-vehicle ball behavior** (gravity feel, bounces, roll).

---

## Core gameplay

| Element | Role |
|--------|------|
| **Angle** | Sets launch direction in the horizontal plane (aim dial). |
| **Power** | “Guide power” / charge defines how hard the ball is sent—trajectory preview helps line up the arc. |
| **Wind** | Shown in the HUD (direction + strength); drifts the ball in flight. |
| **Shots** | Limited attempts per round or hole (e.g. `current / max`); each shot consumes one attempt. |
| **Trajectory** | Predicted path (e.g. dotted line) supports planning before committing. |
| **Ball physics** | After landing: optional **bounces** and **ground roll** with deceleration—vehicles differ here. |

**Loop:** Adjust aim and power → confirm shot → watch flight and outcome → repeat until the hole is cleared or shots are exhausted. Navigation aids (minimap, compass-style cues) help orient across 3D space.

---

## Power-ups and shot modifiers (implemented)

These are separate from **base vehicle stats** (they layer on top for the next shot or until consumed):

| Modifier | Behavior (summary) |
|----------|---------------------|
| **Strength** | Stackable before firing: each stack **doubles** effective launch force (**×2^n** total). Spent when the ball is launched. |
| **No bounce** | Next shot: **no bounce and no roll** after landing—ball behavior ends on first ground contact (unless goal/void rules apply first). |
| **No wind** | Next shot: **wind acceleration ignored** for the ball in flight and on the ground. |
| **Guideline** | **Trajectory preview** (first airborne segment) and related UI flow; can be toggled via settings—distinct from the three **gold/charge** power-up slots in the HUD row. |

Charges per type start from **`INITIAL_POWERUP_CHARGES`** in `lib/game/constants.ts` (with persistence via player/session flow). Stats can track uses (e.g. strength / no-bounce totals) for profile or progression.

**Future slots** (named in code, not wired as gameplay yet): e.g. Time, Magnet, Lucky—see `POWERUP_SLOTS` in `lib/game/constants.ts`.

---

## Vehicles

Vehicles are **data-driven** (`data/defaultVehicles.json`): each has a display name, colors, composite **body parts** (cubes / cylinders / spheres) or an optional **`.obj` mesh**, and tuning for:

- **Shot strength** (base power and scaling with charge)
- **Timing** (delay before the shot fires, cooldown between shots)
- **Ball feel:** gravity, default launch angle, **landing bounces**, **bounce restitution**, **roll deceleration**

**Examples in the current roster:**

| ID | Name | Flavor (design intent) |
|----|------|-------------------------|
| `default` | Blue Tank | Balanced starter; moderate arc and one bounce with roll. |
| `scrap-crawler` | Scrap Crawler | Heavier, slower cadence; flatter launch, less bounce, more roll braking. |
| `drift-sprinter` | Drift Sprinter | Faster shots, higher arc, multiple bounces, lighter roll—aggressive scoring line. |
| `arc-lobber` | Arc Lobber | High lob angle, tuned for clearing obstacles. |
| `meshy-ratata` | Ratata | Mesh-based hull; similar systemic role with distinct silhouette. |

Selection can be exposed in UI (“Vehicle”); URL query `?vehicle=<v_id>` can pick a config when it matches a known id.

---

## Biomes

Biomes are **visual themes** for fairways and props (`BiomeId`: `plain` | `desert` | `forest` | `snow`). They drive:

- **Island turf and foundation colors** (sand, muted green, forest turf, snow, etc.)
- **Vegetation:** e.g. blocky trees vs **cactus** in arid themes, **snow pines** in winter
- **Decor rules:** e.g. **dead brush** in desert-style biomes

The **spawn tee** can stay a readable green patch while the surrounding fairway follows the biome. Biomes do not need to change core rules—they reshape **readability and mood** (desert sun vs forest vs snowfield).

---

## Scope note

This document describes **intent and implemented axes** (vehicles, biomes, trajectory play, **power-ups**). Exact UI labels, economy tuning, level layouts, and unlock rules may evolve in code without changing this high-level picture.
