"use client";

import {
  BG,
  POND_HALF_Y_VIS,
  POND_SECOND_SURFACE_DROP,
  POND_VIS_CENTER_Y,
} from "@/lib/game/constants";
import type { Vec3 } from "@/lib/game/types";

/** Wide, flat water hazard — sky-colored slab barely above the green field plane. */
export function PenaltyPond({
  center,
  halfX,
  halfZ,
  surfaceLayer,
}: {
  center: Vec3;
  halfX: number;
  halfZ: number;
  surfaceLayer: 0 | 1;
}) {
  const drop = surfaceLayer === 0 ? 0 : POND_SECOND_SURFACE_DROP;
  return (
    <mesh
      position={[center[0], POND_VIS_CENTER_Y - drop, center[2]]}
      receiveShadow
      renderOrder={1 + surfaceLayer}
    >
      <boxGeometry
        args={[halfX * 2, POND_HALF_Y_VIS * 2, halfZ * 2]}
      />
      <meshStandardMaterial
        color={BG}
        roughness={0.26}
        metalness={0.16}
        polygonOffset
        polygonOffsetFactor={3 + surfaceLayer}
        polygonOffsetUnits={4 + surfaceLayer}
      />
    </mesh>
  );
}
