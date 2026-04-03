# Vehicle stats (angle & strength)

Data source: `data/defaultVehicles.json`. Values below match the file as of the last edit.

| `v_id` | Name | Launch angle (°) | Base strength |
|--------|------|------------------|---------------|
| `default` | Grid Runner | 48 | 8 |
| `scrap-crawler` | Scrap Crawler | 35 | 10 |
| `drift-sprinter` | Drift Sprinter | 62 | 6 |
| `arc-lobber` | Arc Lobber | 75 | 7 |

Launch angles are spread from **35°** (shallowest) to **75°** (steepest) across the four builds.

## What these mean

- **Launch angle** — Degrees above horizontal (`launchAngleDeg`). Used for the shot trajectory and for the aim prism (barrel) tilt on the vehicle.
- **Base strength** — `strengthPerBaseClick`: impulse from the first click in the charge window. Extra clicks multiply by `extraClickStrengthFraction` per additional click (see JSON for each vehicle).

Pick a vehicle in-game with `?vehicle=<v_id>` (omit or `default` for Grid Runner).
