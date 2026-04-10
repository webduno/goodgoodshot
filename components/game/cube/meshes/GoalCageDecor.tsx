"use client";

import { MAP_CAGE_DOME_RADIUS, TURF_TOP_Y } from "@/lib/game/constants";
import { mapCageKey } from "@/lib/game/mapCages";
import type { Vec3 } from "@/lib/game/types";

export function GoalCageDecor({
  cages,
  brokenKeys,
}: {
  cages: readonly Vec3[];
  brokenKeys: ReadonlySet<string>;
}) {
  if (cages.length === 0) return null;

  return (
    <group>
      {cages.map((c) => {
        const k = mapCageKey(Math.round(c[0]), Math.round(c[2]));
        if (brokenKeys.has(k)) return null;
        return (
          <mesh
            key={k}
            position={[c[0], TURF_TOP_Y, c[2]]}
            castShadow={false}
            receiveShadow={false}
          >
            <sphereGeometry
              args={[
                MAP_CAGE_DOME_RADIUS,
                10,
                5,
                0,
                Math.PI * 2,
                0,
                Math.PI / 2,
              ]}
            />
            <meshBasicMaterial color="#8a8a8a" wireframe />
          </mesh>
        );
      })}
    </group>
  );
}
