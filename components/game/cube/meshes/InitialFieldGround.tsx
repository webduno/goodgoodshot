"use client";

import {
  FIELD_GROUND_MUTED_GREEN,
  TURF_TOP_Y,
} from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

/**
 * Blocky island meshes (void/sky between them). Top face at `TURF_TOP_Y` for ball physics.
 */
export function InitialFieldGround({
  islands,
}: {
  islands: readonly IslandRect[];
}) {
  return (
    <group>
      {islands.map((is, i) => {
        const th = is.blockThickness;
        const cy = TURF_TOP_Y - th / 2;
        return (
          <mesh
            key={`island-${i}-${is.worldX}-${is.worldZ}-${is.halfX}-${is.halfZ}-${th}`}
            position={[is.worldX, cy, is.worldZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[is.halfX * 2, th, is.halfZ * 2]} />
            <meshStandardMaterial
              color={FIELD_GROUND_MUTED_GREEN}
              roughness={0.92}
              metalness={0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
