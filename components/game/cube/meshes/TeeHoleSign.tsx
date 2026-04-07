"use client";

import { Text } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { biomeDisplayName } from "@/lib/game/biomes";
import {
  TEE_PAD_CENTER_Y,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
  TEE_PAD_EXTEND_BACK_Z,
} from "@/lib/game/constants";
import type { BiomeId } from "@/lib/game/types";

/** Compact board; fits biome title + “Goal length: NNN blocks” + coins line. */
const SIGN_WIDTH = 2.95;
const SIGN_HEIGHT = 0.78;
const SIGN_DEPTH = 0.22;
/** Pole from tee pad top up to the sign panel. */
const STICK_HEIGHT = 1.05;
const STICK_CROSS = 0.16;
/** Same vertical placement as `SpawnTeePad` mesh center. */
const PAD_MESH_CENTER_Y = TEE_PAD_CENTER_Y - 0.55;
const PAD_HALF_HEIGHT_Y = TEE_PAD_HALF_Y * 3;
const PAD_TOP_Y = PAD_MESH_CENTER_Y + PAD_HALF_HEIGHT_Y;

type TeeHoleSignProps = {
  biome: BiomeId;
  goalLength: number;
  coinCount: number;
};

/** Beige sign at the back-right of the tee with biome, hole length, and coin count for this level. */
export function TeeHoleSign({ biome, goalLength, coinCount }: TeeHoleSignProps) {
  const signMeshRef = useRef<THREE.Mesh>(null);
  const stickMeshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const noop = () => {};
    const s = signMeshRef.current;
    const t = stickMeshRef.current;
    if (s) s.raycast = noop;
    if (t) t.raycast = noop;
  }, []);

  /** Pad back edge (−Z) after `SpawnTeePad` extension toward −Z. */
  const minPadZ = -TEE_PAD_HALF_Z - TEE_PAD_EXTEND_BACK_Z;
  const EDGE_MARGIN = 0.1;
  const signCenterX = TEE_PAD_HALF_X - SIGN_WIDTH / 2 - EDGE_MARGIN;
  const signCenterZ = minPadZ + SIGN_DEPTH / 2 + 0.06;
  /** Sign center Y: raised on a stick from the pad top. */
  const signCenterY = PAD_TOP_Y + STICK_HEIGHT + SIGN_HEIGHT / 2;
  const goalBlocks = Math.round(goalLength);
  const biomeTitle = biomeDisplayName(biome);

  /** Stick top meets sign bottom; stick bottom on pad top (`PAD_TOP_Y`). */
  const stickCenterLocalY = -(SIGN_HEIGHT / 2 + STICK_HEIGHT / 2);

  return (
    <group position={[signCenterX, signCenterY, signCenterZ]}>
      <mesh
        ref={stickMeshRef}
        position={[0, stickCenterLocalY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[STICK_CROSS, STICK_HEIGHT, STICK_CROSS]} />
        <meshStandardMaterial
          color="#b8a892"
          roughness={0.78}
          metalness={0.05}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <mesh ref={signMeshRef} castShadow receiveShadow>
        <boxGeometry args={[SIGN_WIDTH, SIGN_HEIGHT, SIGN_DEPTH]} />
        <meshStandardMaterial
          color="#d9c9a8"
          roughness={0.72}
          metalness={0.06}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <Text
        position={[0, 0.24, SIGN_DEPTH / 2 + 0.015]}
        fontSize={0.175}
        fontWeight={700}
        color="#1a1610"
        anchorX="center"
        anchorY="middle"
      >
        {biomeTitle}
      </Text>
      <Text
        position={[0, 0.02, SIGN_DEPTH / 2 + 0.015]}
        fontSize={0.125}
        color="#2a2418"
        anchorX="center"
        anchorY="middle"
      >
        Goal length: {goalBlocks} blocks
      </Text>
      <Text
        position={[0, 0.02, -(SIGN_DEPTH / 2 + 0.015)]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.125}
        color="#2a2418"
        anchorX="center"
        anchorY="middle"
      >
        Goal length: {goalBlocks} blocks
      </Text>
      <Text
        position={[0, -0.2, SIGN_DEPTH / 2 + 0.015]}
        fontSize={0.105}
        color="#2a2418"
        anchorX="center"
        anchorY="middle"
      >
        Coins available: {coinCount}
      </Text>
    </group>
  );
}
