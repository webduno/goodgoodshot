"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { BLOCK_SIZE } from "@/lib/game/constants";

/**
 * Wide flat slabs (not cubes) — reads as sky clouds at distance, still one instanced mesh.
 */
const CLOUD_WIDE_X = BLOCK_SIZE * 52;
const CLOUD_THIN_Y = BLOCK_SIZE * 3.4;
const CLOUD_WIDE_Z = BLOCK_SIZE * 26;

const _dummy = new THREE.Object3D();

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Voxel-style sky clouds: one `InstancedMesh` (single box geometry, one draw call).
 * Axis-aligned slabs (no yaw) so they read as world-grid clouds.
 */
export function SkyClouds() {
  const ref = useRef<THREE.InstancedMesh>(null);

  const positions = useMemo(() => {
    const rand = mulberry32(0x9e3779b9);
    const out: [number, number, number][] = [];
    const clusters = 14;
    for (let c = 0; c < clusters; c++) {
      const cx = (rand() - 0.5) * 200;
      const cz = rand() * 240 - 35;
      const cy = 34 + rand() * 50;
      /** 1–2 wide slabs per cluster, offset when doubled. */
      const pieces = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < pieces; k++) {
        const spread = pieces > 1 ? 22 : 10;
        const ox = (rand() - 0.5) * spread;
        const oy = (rand() - 0.5) * 4;
        const oz = (rand() - 0.5) * (pieces > 1 ? 14 : 8);
        out.push([cx + ox, cy + oy, cz + oz]);
      }
    }
    return out;
  }, []);

  const count = positions.length;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      const p = positions[i];
      _dummy.position.set(p[0], p[1], p[2]);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, positions]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      frustumCulled
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[CLOUD_WIDE_X, CLOUD_THIN_Y, CLOUD_WIDE_Z]} />
      <meshStandardMaterial
        color="#f8fbff"
        roughness={0.95}
        metalness={0}
        emissive="#dfefff"
        emissiveIntensity={0.08}
      />
    </instancedMesh>
  );
}
