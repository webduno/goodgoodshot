import {
  FLOOR_CONTACT_CENTER_Y,
  SPHERE_RADIUS,
} from "@/lib/game/constants";
import { sphereIntersectsGoalBox } from "@/lib/game/collision";
import { spawnTopYFromBlockCenterY } from "@/lib/game/math";
import type { Vec3 } from "@/lib/game/types";

/** Fixed step (matches typical `useFrame` dt in `SphereToGoal`). */
const DT = 1 / 120;
const MAX_ITERS = 120 * 90;

/**
 * World path of the ball for the first airborne segment only: no wind, no bounces.
 * Stops at first goal intersection or first contact with the ground plane (fairway height).
 */
export function sampleFirstSegmentGuideline(
  spawnCenter: Vec3,
  goalCenter: Vec3,
  gravityY: number,
  worldAimYawRad: number,
  aimPitchOffsetRad: number,
  vehicleLaunchAngleRad: number,
  force: number
): Vec3[] {
  const launchAngleRad = vehicleLaunchAngleRad + aimPitchOffsetRad;
  const horizontalMag = force * Math.cos(launchAngleRad);
  let vely = force * Math.sin(launchAngleRad);
  const topY = spawnTopYFromBlockCenterY(spawnCenter[1]);
  const topX = spawnCenter[0];
  const topZ = spawnCenter[2];

  let x = topX;
  let y = topY;
  let z = topZ;
  const vx = horizontalMag * Math.sin(worldAimYawRad);
  const vz = horizontalMag * Math.cos(worldAimYawRad);

  const out: Vec3[] = [[x, y, z]];

  for (let i = 0; i < MAX_ITERS; i++) {
    const x0 = x;
    const y0 = y;
    const z0 = z;

    vely += gravityY * DT;
    x += vx * DT;
    y += vely * DT;
    z += vz * DT;

    if (sphereIntersectsGoalBox(x, y, z, SPHERE_RADIUS, goalCenter)) {
      out.push([x, y, z]);
      break;
    }

    if (y <= FLOOR_CONTACT_CENTER_Y && y0 > FLOOR_CONTACT_CENTER_Y) {
      const denom = y - y0;
      const t =
        Math.abs(denom) < 1e-10
          ? 1
          : (FLOOR_CONTACT_CENTER_Y - y0) / denom;
      const lx = x0 + t * (x - x0);
      const lz = z0 + t * (z - z0);
      out.push([lx, FLOOR_CONTACT_CENTER_Y, lz]);
      break;
    }

    if (y <= FLOOR_CONTACT_CENTER_Y) {
      out.push([x, FLOOR_CONTACT_CENTER_Y, z]);
      break;
    }

    if (i % 2 === 0) {
      out.push([x, y, z]);
    }
  }

  return out;
}
