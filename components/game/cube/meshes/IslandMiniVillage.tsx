"use client";

import { RoundedBox } from "@react-three/drei";

import { TURF_TOP_Y } from "@/lib/game/constants";
import type { MiniVillageHouse, MiniVillageSpec } from "@/lib/game/types";

/** Matches `MINI_VILLAGE_HOUSE_HALF_XZ` in island placement (half-width of footprint). */
const BOX_W = 1.56;
const BOX_D = 1.56;
const BOX_H = 0.95;
const CORNER_RADIUS = 0.18;

function HouseBlocks({ house }: { house: MiniVillageHouse }) {
  const isTall = house.stories === 2;
  /** One mesh per house: tall = double height (clearer than two 50% transparent layers). */
  const h = isTall ? BOX_H * 2 : BOX_H;
  const cy = TURF_TOP_Y + h / 2;
  return (
    <group position={[house.worldX, 0, house.worldZ]}>
      <RoundedBox
        position={[0, cy, 0]}
        args={[BOX_W, h, BOX_D]}
        radius={CORNER_RADIUS}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={house.colorHex}
          transparent
          opacity={0.5}
          roughness={0.42}
          metalness={0.06}
          depthWrite={false}
        />
      </RoundedBox>
    </group>
  );
}

/** One mini village per level: several rounded main blocks (no windows/doors). */
export function IslandMiniVillage({ miniVillage }: { miniVillage: MiniVillageSpec }) {
  return (
    <group>
      {miniVillage.houses.map((h, i) => (
        <HouseBlocks key={`${h.worldX}-${h.worldZ}-${i}`} house={h} />
      ))}
    </group>
  );
}
