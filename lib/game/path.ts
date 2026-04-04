import {
  LANE_MARKER_COUNT_PER_SIDE,
  LANE_MARKER_SIDE_OFFSET_X,
} from "./constants";
import type { Vec3 } from "./types";

/** Stable id for a 1×1×1 grid coin cell (lane bonus pickup). */
export function coinCellKey(center: Vec3): string {
  return `${center[0]},${center[1]},${center[2]}`;
}

/** Axis-aligned grid steps from lane origin to goal (Z first, then X); includes goal as last point. */
export function manhattanPathLaneToGoal(laneOrigin: Vec3, goalCenter: Vec3): Vec3[] {
  const sy = laneOrigin[1];
  let x = laneOrigin[0];
  let z = laneOrigin[2];
  const tx = goalCenter[0];
  const tz = goalCenter[2];
  const out: Vec3[] = [];
  while (z !== tz) {
    z += Math.sign(tz - z) || 0;
    out.push([x, sy, z]);
  }
  while (x !== tx) {
    x += Math.sign(tx - x) || 0;
    out.push([x, sy, z]);
  }
  return out;
}

/**
 * Evenly spaced along the grid path from lane origin toward goal; five pairs on −X and +X,
 * offset from the lane centerline by LANE_MARKER_SIDE_OFFSET_X. Centers sit on integer grid cells.
 */
export function laneMarkerCenters(laneOrigin: Vec3, goalCenter: Vec3): Vec3[] {
  const path = manhattanPathLaneToGoal(laneOrigin, goalCenter);
  if (path.length < 2) return [];
  const interior = path.slice(0, -1);
  const n = interior.length;
  const sy = laneOrigin[1];
  const out: Vec3[] = [];
  for (let i = 1; i <= LANE_MARKER_COUNT_PER_SIDE; i++) {
    const idx = Math.floor((i / (LANE_MARKER_COUNT_PER_SIDE + 1)) * n);
    const cx = interior[idx][0];
    const cz = interior[idx][2];
    out.push([cx - LANE_MARKER_SIDE_OFFSET_X, sy, cz]);
    out.push([cx + LANE_MARKER_SIDE_OFFSET_X, sy, cz]);
  }
  return out;
}
