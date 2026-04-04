"use client";

import { BLOCK_SIZE } from "@/lib/game/constants";
import type { Vec3 } from "@/lib/game/types";

export function Block({ center, color }: { center: Vec3; color: string }) {
  return (
    <mesh position={[...center]} castShadow receiveShadow>
      <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
      {/* Standard material so key lights + shadows read clearly */}
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        metalness={0.08}
      />
    </mesh>
  );
}
