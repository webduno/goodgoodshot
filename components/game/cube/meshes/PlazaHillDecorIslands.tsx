"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import {
  PLAZA_DECOR_HILL_CENTERS,
  PLAZA_DECOR_HILL_HALF_EXTENT,
  PLAZA_HUB_FOUNDATION_FRUSTUM,
  PLAZA_HUB_TURF_GREEN,
} from "@/lib/game/plazaHub";

const SEGMENTS = 56;
/** Vertical thickness of the solid base below the turf rim (world units). */
const BASE_THICKNESS = 1.35;
/** Same as `InitialFieldGround`: frustum top nudges slightly into the green to hide seams. */
const GRASS_STONE_OVERLAP_Y = 0.06;
/** Scale for the tallest bump after weighting. */
const PEAK_Y = 5.0;

function compactBump(d2: number, radiusSq: number, power: number): number {
  const t = d2 / radiusSq;
  return Math.pow(Math.max(0, 1 - Math.min(1, t)), power);
}

/**
 * Several overlapping smooth knolls (normalized coords on the ~30×30 footprint),
 * tapered to 0 at the square rim so the top seals cleanly to vertical sides.
 */
function hillHeightLocal(nx: number, nz: number, variant: number): number {
  const rot = variant * 1.05;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const rx = nx * c - nz * s;
  const rz = nx * s + nz * c;

  const bumps: { cx: number; cz: number; r2: number; a: number; p: number }[] =
    [
      { cx: 0.22, cz: -0.2, r2: 0.52, a: 1, p: 1.32 },
      { cx: -0.34, cz: 0.12, r2: 0.44, a: 0.78, p: 1.28 },
      { cx: 0.05, cz: 0.36, r2: 0.36, a: 0.62, p: 1.38 },
    ];

  let sum = 0;
  for (const b of bumps) {
    const dx = rx - b.cx;
    const dz = rz - b.cz;
    sum += PEAK_Y * b.a * compactBump(dx * dx + dz * dz, b.r2, b.p);
  }

  const edgeR2 = nx * nx + nz * nz;
  const islandEdge = Math.pow(Math.max(0, 1 - Math.min(1, edgeR2)), 1.12);
  let h = sum * islandEdge;

  h +=
    PEAK_Y *
    0.028 *
    Math.sin(rx * 4.2 + variant) *
    Math.sin(rz * 3.6) *
    islandEdge;

  return h;
}

function createSolidHillIslandGeometry(variant: number): THREE.BufferGeometry {
  const seg = SEGMENTS;
  const half = PLAZA_DECOR_HILL_HALF_EXTENT;
  const positions: number[] = [];
  const indices: number[] = [];
  const nCol = seg + 1;

  const topVert = (i: number, j: number) => i * nCol + j;

  for (let i = 0; i <= seg; i++) {
    const z = -half + (i / seg) * (2 * half);
    for (let j = 0; j <= seg; j++) {
      const x = -half + (j / seg) * (2 * half);
      const y = hillHeightLocal(x / half, z / half, variant);
      positions.push(x, y, z);
    }
  }

  const base = positions.length / 3;

  const botVert = (i: number, j: number) => base + i * nCol + j;

  for (let i = 0; i <= seg; i++) {
    const z = -half + (i / seg) * (2 * half);
    for (let j = 0; j <= seg; j++) {
      const x = -half + (j / seg) * (2 * half);
      positions.push(x, -BASE_THICKNESS, z);
    }
  }

  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const a = topVert(i, j);
      const b = topVert(i, j + 1);
      const c = topVert(i + 1, j + 1);
      const d = topVert(i + 1, j);
      indices.push(a, d, c, a, c, b);
    }
  }

  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const a = botVert(i, j);
      const b = botVert(i, j + 1);
      const c = botVert(i + 1, j + 1);
      const d = botVert(i + 1, j);
      indices.push(a, b, c, a, c, d);
    }
  }

  for (let i = 0; i < seg; i++) {
    const t0 = topVert(i, 0);
    const t1 = topVert(i + 1, 0);
    const b0 = botVert(i, 0);
    const b1 = botVert(i + 1, 0);
    indices.push(t0, b0, b1, t0, b1, t1);
  }

  for (let i = 0; i < seg; i++) {
    const t0 = topVert(i, seg);
    const t1 = topVert(i + 1, seg);
    const b0 = botVert(i, seg);
    const b1 = botVert(i + 1, seg);
    indices.push(t0, t1, b1, t0, b1, b0);
  }

  for (let j = 0; j < seg; j++) {
    const t0 = topVert(0, j);
    const t1 = topVert(0, j + 1);
    const b0 = botVert(0, j);
    const b1 = botVert(0, j + 1);
    indices.push(t0, t1, b1, t0, b1, b0);
  }

  for (let j = 0; j < seg; j++) {
    const t0 = topVert(seg, j);
    const t1 = topVert(seg, j + 1);
    const b0 = botVert(seg, j);
    const b1 = botVert(seg, j + 1);
    indices.push(t0, b0, b1, t0, b1, t1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Large decorative grass knolls around the hub (no collision). Solid slab with displaced top
 * (several overlapping waves) plus flat bottom and side walls.
 */
export function PlazaHillDecorIslands() {
  const geometries = useMemo(() => {
    return PLAZA_DECOR_HILL_CENTERS.map((_, i) => createSolidHillIslandGeometry(i));
  }, []);

  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose();
    };
  }, [geometries]);

  return (
    <group>
      {PLAZA_DECOR_HILL_CENTERS.map((c, i) => {
        const hillYaw = i * 0.55;
        const half = PLAZA_DECOR_HILL_HALF_EXTENT;
        const stoneDepth =
          9 + (i % 3) * 1.2 + Math.min(6, (half + half) * 0.28);
        const slabBottomY = TURF_TOP_Y - BASE_THICKNESS;
        const stoneTopY = slabBottomY + GRASS_STONE_OVERLAP_Y;
        const stoneCenterY = stoneTopY - stoneDepth / 2;
        const foundationTopRadius = half * 1.02 * Math.SQRT2 * 0.94;
        const foundationBottomRadius = Math.max(
          0.14,
          foundationTopRadius * 0.1
        );

        return (
          <group key={`plaza-hill-${c.x.toFixed(1)}-${c.z.toFixed(1)}`}>
            <mesh
              geometry={geometries[i]!}
              position={[c.x, TURF_TOP_Y, c.z]}
              rotation={[0, hillYaw, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={PLAZA_HUB_TURF_GREEN}
                roughness={0.9}
                metalness={0}
              />
            </mesh>
            <mesh
              position={[c.x, stoneCenterY, c.z]}
              rotation={[0, Math.PI / 4 + hillYaw, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[
                  foundationTopRadius,
                  foundationBottomRadius,
                  stoneDepth,
                  4,
                ]}
              />
              <meshStandardMaterial
                color={PLAZA_HUB_FOUNDATION_FRUSTUM}
                roughness={0.48}
                metalness={0.12}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
