"use client";

import { useEffect, useMemo } from "react";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

import {
  PlazaInstancedVoxelHouses,
  type PlazaVoxelHouseKind,
  type PlazaVoxelHouseSpec,
} from "@/components/game/cube/meshes/PlazaInstancedVoxelHouses";
import {
  PLAZA_PORTAL_ORBIT,
  PLAZA_VIBE_JAM_PORTAL_EXIT_X,
  PLAZA_VIBE_JAM_PORTAL_EXIT_Z,
  PLAZA_VEHICLE_TOOL_PORTAL_X,
  PLAZA_VEHICLE_TOOL_PORTAL_Z,
} from "@/lib/game/plazaHub";

/** Porcelain / mist “buildings” — Frutiger Aero (avoid dark brown stone). */
const STONE = "#f2f6fb";
const STONE_DARK = "#e0e8f0";
const STONE_COOL = "#e8f2fa";
const STONE_AERO = "#e4f4f4";
const STONE_WARM = "#faf6f0";
const GRASS_TRIM = "#7ee0a8";
const GRASS_TRIM_DARK = "#58c888";

/** Lit “porcelain” — `kind: normal`. */
const NEUTRAL_WALL = "#e4ebf4";
const NEUTRAL_ROOF = "#d4dde8";

/** Saturated — `kind: colored`. */
const WALL_PALETTE = [
  "#ff1493",
  "#00e5ff",
  "#ffea00",
  "#76ff03",
  "#ff5722",
  "#e040fb",
  "#00e676",
  "#ffd600",
  "#ff4d9a",
  "#ffffff",
] as const;

const ROOF_PALETTE = [
  "#ff1744",
  "#2979ff",
  "#00e676",
  "#ffc400",
  "#d500f9",
  "#00b0ff",
  "#ff6d00",
  "#aa00ff",
] as const;

const PORTAL_EXCLUSION_R = 4.6;

/** Voxel decoration houses — scale vs character / plaza (footprint + height + cluster spacing). */
const DECOR_HOUSE_SCALE = 3;

function clearOfPortals(
  lx: number,
  lz: number,
  wx: number,
  wz: number
): boolean {
  const px = lx - wx;
  const pz = lz - wz;
  const o = PLAZA_PORTAL_ORBIT;
  const anchors: [number, number][] = [
    [0, o],
    [0, -o],
    [o, 0],
    [-o, 0],
    [PLAZA_VIBE_JAM_PORTAL_EXIT_X, PLAZA_VIBE_JAM_PORTAL_EXIT_Z],
    [PLAZA_VEHICLE_TOOL_PORTAL_X, PLAZA_VEHICLE_TOOL_PORTAL_Z],
  ];
  for (const [kx, kz] of anchors) {
    if (Math.hypot(px - kx, pz - kz) < PORTAL_EXCLUSION_R) return false;
  }
  return true;
}

function hashPick<T>(seed: string, arr: readonly T[]): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return arr[Math.abs(h) % arr.length]!;
}

/** Deterministic tight offsets for clumped placement. */
function jitter2(seed: string, i: number): [number, number] {
  const s = `${seed}|${i}`;
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  const h1 = (h >>> 0) / 4294967296;
  const h2 = (Math.imul(h, 1103515245) >>> 0) / 4294967296;
  return [(h1 - 0.5) * 1.45, (h2 - 0.5) * 1.45];
}

function hashUnit01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10001) / 10000;
}

type TerraceLevelSpec = { halfScale: number; thickness: number };

type TerraceTier = {
  cy: number;
  topY: number;
  hw: number;
  hd: number;
  thickness: number;
  i: number;
};

function getTerraceTiers(
  baseY: number,
  baseHalfW: number,
  baseHalfD: number,
  levels: readonly TerraceLevelSpec[]
): TerraceTier[] {
  return levels.reduce<TerraceTier[]>((acc, L, i) => {
    const prevTop = acc.length === 0 ? baseY : acc[acc.length - 1]!.topY;
    const cy = prevTop + L.thickness / 2;
    const topY = prevTop + L.thickness;
    return [
      ...acc,
      {
        cy,
        topY,
        hw: baseHalfW * L.halfScale,
        hd: baseHalfD * L.halfScale,
        thickness: L.thickness,
        i,
      },
    ];
  }, []);
}

function pushColoredBox(
  list: THREE.BufferGeometry[],
  cx: number,
  cy: number,
  cz: number,
  fullW: number,
  fullH: number,
  fullD: number,
  hexColor: string
): void {
  const g = new THREE.BoxGeometry(fullW, fullH, fullD);
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(cx, cy, cz),
    new THREE.Quaternion(),
    new THREE.Vector3(1, 1, 1)
  );
  g.applyMatrix4(matrix);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  const color = new THREE.Color(hexColor);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  list.push(g);
}

type TerraceSpecForMerge = {
  cx: number;
  cz: number;
  baseHalfW: number;
  baseHalfD: number;
  levels: readonly TerraceLevelSpec[];
  stoneColor: string;
  capGrass: boolean;
};

function mergeTerraceGeometries(
  specs: readonly TerraceSpecForMerge[]
): { stone: THREE.BufferGeometry | null; grass: THREE.BufferGeometry | null } {
  const stoneParts: THREE.BufferGeometry[] = [];
  const grassParts: THREE.BufferGeometry[] = [];
  const baseY = TURF_TOP_Y;

  for (const t of specs) {
    const tiers = getTerraceTiers(baseY, t.baseHalfW, t.baseHalfD, t.levels);
    for (const tier of tiers) {
      const isTop = tier.i === t.levels.length - 1;
      const isGrass = isTop && t.capGrass;
      const { cx, cz } = t;
      const { cy, hw, hd, thickness } = tier;
      const w = hw * 2;
      const d = hd * 2;
      if (isGrass) {
        pushColoredBox(grassParts, cx, cy, cz, w, thickness, d, GRASS_TRIM);
      } else {
        pushColoredBox(stoneParts, cx, cy, cz, w, thickness, d, t.stoneColor);
      }
    }
  }

  const stone =
    stoneParts.length > 0 ? mergeGeometries(stoneParts) : null;
  const grass =
    grassParts.length > 0 ? mergeGeometries(grassParts) : null;
  for (const g of stoneParts) g.dispose();
  for (const g of grassParts) g.dispose();
  return { stone, grass };
}

function mergeRingRetainingLipGeometries(
  wx: number,
  wz: number,
  walk: number
): { stone: THREE.BufferGeometry | null; grass: THREE.BufferGeometry | null } {
  const h = 0.22;
  const cy = TURF_TOP_Y + h / 2;
  const span = walk + 0.85;
  const thick = 0.55;
  const gy = TURF_TOP_Y + h + 0.04;
  const stoneParts: THREE.BufferGeometry[] = [];
  const grassParts: THREE.BufferGeometry[] = [];

  pushColoredBox(
    stoneParts,
    wx,
    cy,
    wz + walk + thick / 2,
    span * 2,
    h,
    thick,
    STONE_DARK
  );
  pushColoredBox(
    stoneParts,
    wx,
    cy,
    wz - walk - thick / 2,
    span * 2,
    h,
    thick,
    STONE_DARK
  );
  pushColoredBox(
    stoneParts,
    wx + walk + thick / 2,
    cy,
    wz,
    thick,
    h,
    span * 2,
    STONE_DARK
  );
  pushColoredBox(
    stoneParts,
    wx - walk - thick / 2,
    cy,
    wz,
    thick,
    h,
    span * 2,
    STONE_DARK
  );

  pushColoredBox(
    grassParts,
    wx,
    gy,
    wz + walk + thick / 2,
    span * 2 - 0.3,
    0.08,
    thick - 0.08,
    GRASS_TRIM_DARK
  );
  pushColoredBox(
    grassParts,
    wx,
    gy,
    wz - walk - thick / 2,
    span * 2 - 0.3,
    0.08,
    thick - 0.08,
    GRASS_TRIM_DARK
  );
  pushColoredBox(
    grassParts,
    wx + walk + thick / 2,
    gy,
    wz,
    thick - 0.08,
    0.08,
    span * 2 - 0.3,
    GRASS_TRIM_DARK
  );
  pushColoredBox(
    grassParts,
    wx - walk - thick / 2,
    gy,
    wz,
    thick - 0.08,
    0.08,
    span * 2 - 0.3,
    GRASS_TRIM_DARK
  );

  const stone =
    stoneParts.length > 0 ? mergeGeometries(stoneParts) : null;
  const grass =
    grassParts.length > 0 ? mergeGeometries(grassParts) : null;
  for (const g of stoneParts) g.dispose();
  for (const g of grassParts) g.dispose();
  return { stone, grass };
}

/**
 * Tiered plinths + dense colored blocks on the plaza outer ring only (no physics).
 */
export function PlazaHubEdgeDecor({ island }: { island: IslandRect }) {
  const wx = island.worldX;
  const wz = island.worldZ;
  const walk = island.walkableHalfX ?? island.halfX;
  const outer = island.halfX;

  const ringInner = walk + 0.35;
  const ringOuter = outer - 0.35;
  const midR = (ringInner + ringOuter) / 2;

  const terraceSpecs = useMemo(() => {
    const specs: {
      key: string;
      cx: number;
      cz: number;
      baseHalfW: number;
      baseHalfD: number;
      capGrass: boolean;
      levels: readonly { halfScale: number; thickness: number }[];
      stoneColor: string;
    }[] = [];

    const pushTerrace = (
      key: string,
      lx: number,
      lz: number,
      baseHalfW: number,
      baseHalfD: number,
      capGrass: boolean,
      tall: boolean,
      opts?: {
        levels?: readonly { halfScale: number; thickness: number }[];
        stoneColor?: string;
      }
    ) => {
      if (!clearOfPortals(lx, lz, wx, wz)) return;
      const levels =
        opts?.levels ??
        (tall
          ? [
              { halfScale: 1, thickness: 0.42 },
              { halfScale: 0.78, thickness: 0.38 },
              { halfScale: 0.55, thickness: 0.36 },
              { halfScale: 0.38, thickness: 0.32 },
            ]
          : [
              { halfScale: 1, thickness: 0.38 },
              { halfScale: 0.72, thickness: 0.34 },
              { halfScale: 0.5, thickness: 0.3 },
            ]);
      specs.push({
        key,
        cx: lx,
        cz: lz,
        baseHalfW,
        baseHalfD,
        capGrass,
        levels,
        stoneColor: opts?.stoneColor ?? STONE,
      });
    };

    /** Asymmetric corners — no longer four identical stacks. */
    const ro = ringOuter;
    pushTerrace(
    "corner-ne",
    wx + ro - 0.35,
    wz + ro - 0.35,
    2.25,
    2.25,
    true,
    true,
    { stoneColor: STONE }
  );
  pushTerrace(
    "corner-nw",
    wx - ro + 0.75,
    wz + ro - 0.25,
    2.85,
    2.05,
    true,
    false,
    {
      stoneColor: STONE_COOL,
      levels: [
        { halfScale: 1, thickness: 0.48 },
        { halfScale: 0.82, thickness: 0.4 },
        { halfScale: 0.62, thickness: 0.36 },
      ],
    }
  );
  pushTerrace(
    "corner-se",
    wx + ro - 0.55,
    wz - ro + 0.45,
    2.05,
    2.65,
    true,
    true,
    {
      stoneColor: STONE_AERO,
      levels: [
        { halfScale: 1, thickness: 0.4 },
        { halfScale: 0.7, thickness: 0.36 },
        { halfScale: 0.48, thickness: 0.34 },
        { halfScale: 0.34, thickness: 0.3 },
      ],
    }
  );
  pushTerrace(
    "corner-sw",
    wx - ro + 0.4,
    wz - ro + 0.55,
    2.55,
    2.35,
    true,
    false,
    {
      stoneColor: STONE_WARM,
      levels: [
        { halfScale: 1, thickness: 0.44 },
        { halfScale: 0.68, thickness: 0.38 },
        { halfScale: 0.46, thickness: 0.34 },
      ],
    }
  );

  /** Mid-edge pads — shifted / sized differently per side. */
  const edgePads: [string, number, number, number, number][] = [
    ["n1", -16, midR + 0.45, 3.5, 2.05],
    ["n2", 11, midR - 0.4, 3.4, 1.95],
    ["s1", -13, -midR - 0.25, 2.95, 2.35],
    ["s2", 15, -midR + 0.5, 3.55, 2.1],
    ["e1", midR + 0.35, -9, 2.05, 3.15],
    ["e2", midR - 0.4, 13, 1.95, 3.45],
    ["w1", -midR - 0.25, -10, 2.15, 2.95],
    ["w2", -midR + 0.5, 15, 2.1, 3.25],
  ];
  for (const [key, ox, oz, hw, hd] of edgePads) {
    pushTerrace(`edge-${key}`, wx + ox, wz + oz, hw, hd, true, false, {
      stoneColor: key.startsWith("n") || key.startsWith("s") ? STONE_COOL : STONE_AERO,
    });
  }

  const staggerSpecs: [string, number, number, number, number][] = [
    ["st-n-0", -8, midR - 0.5, 1.9, 1.9],
    ["st-n-1", 5, midR - 0.45, 1.9, 1.9],
    ["st-n-2", 18, midR - 0.55, 1.9, 1.9],
    ["st-s-0", -10, -midR + 0.5, 1.75, 2.05],
    ["st-s-1", 6, -midR + 0.42, 1.75, 2.05],
    ["st-s-2", 17, -midR + 0.48, 1.75, 2.05],
    ["st-e-0", midR - 0.48, -6, 2.05, 1.85],
    ["st-e-1", midR - 0.52, 7, 2.05, 1.85],
    ["st-e-2", midR - 0.5, 17, 2.05, 1.85],
    ["st-w-0", -midR + 0.42, -7, 1.95, 2.1],
    ["st-w-1", -midR + 0.5, 5, 1.95, 2.1],
    ["st-w-2", -midR + 0.46, 16, 1.95, 2.1],
  ];
  for (const [key, ox, oz, hw, hd] of staggerSpecs) {
    pushTerrace(key, wx + ox, wz + oz, hw, hd, true, false, {
      stoneColor: STONE_WARM,
    });
  }

    return specs;
  }, [wx, wz, walk, outer]);

  const mergedTerraceGeoms = useMemo(
    () => mergeTerraceGeometries(terraceSpecs),
    [terraceSpecs]
  );

  const mergedRingLipGeoms = useMemo(
    () => mergeRingRetainingLipGeometries(wx, wz, walk),
    [wx, wz, walk]
  );

  useEffect(() => {
    return () => {
      mergedTerraceGeoms.stone?.dispose();
      mergedTerraceGeoms.grass?.dispose();
      mergedRingLipGeoms.stone?.dispose();
      mergedRingLipGeoms.grass?.dispose();
    };
  }, [mergedTerraceGeoms, mergedRingLipGeoms]);

  const cornerFloors = TURF_TOP_Y + 1.52;

  const houseSpecs = useMemo((): PlazaVoxelHouseSpec[] => {
    const specs: PlazaVoxelHouseSpec[] = [];
    const houseKeys = new Set<string>();
    let hi = 0;

    const tryHouse = (
      lx: number,
      lz: number,
      floorY: number,
      seed: string
    ) => {
      if (!clearOfPortals(lx, lz, wx, wz)) return;
      const pr = Math.hypot(lx - wx, lz - wz);
      if (pr < ringInner - 0.2 || pr > ringOuter + 1.2) return;
      const k = `${lx.toFixed(2)},${lz.toFixed(2)},${floorY.toFixed(2)}`;
      if (houseKeys.has(k)) return;
      houseKeys.add(k);
      const roll = hashUnit01(`${seed}kind`);
      let kind: PlazaVoxelHouseKind;
      let wall: string;
      let roof: string;
      if (roll < 0.34) {
        kind = "normal";
        wall = NEUTRAL_WALL;
        roof = NEUTRAL_ROOF;
      } else if (roll < 0.72) {
        kind = "colored";
        wall = hashPick(seed, WALL_PALETTE);
        roof = hashPick(seed + "r", ROOF_PALETTE);
      } else if (roll < 0.86) {
        kind = "glassWhite";
        wall = "#eef2f8";
        roof = "#e8edf5";
      } else {
        kind = "glassBlue";
        wall = "#b8dcfc";
        roof = "#98ccf8";
      }
      const h0 = Math.abs(
        seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      );
      const s = (0.62 + (h0 % 4) * 0.12) * DECOR_HOUSE_SCALE;
      const bodyH = (0.72 + (hi % 4) * 0.14) * DECOR_HOUSE_SCALE;
      specs.push({
        lx,
        lz,
        floorY,
        wallHex: wall,
        roofHex: roof,
        bodyW: s,
        bodyD: s * (0.92 + (hi % 3) * 0.04),
        bodyH,
        kind,
      });
      hi += 1;
    };

    const innerRow = ringInner + 1.15;
    const rMin = ringInner + 0.62;
    const rMax = ringOuter - 0.42;

    /** Spread clusters around the ring + radius; 2–3 homes touching-ish per cluster. */
    const dS = DECOR_HOUSE_SCALE;
    const ringClusters = 28;
    for (let c = 0; c < ringClusters; c++) {
      const t = (c + 0.41) / ringClusters;
      const angle = t * Math.PI * 2 + 0.22 * Math.sin(c * 1.17);
      const rJ = rMin + hashUnit01(`rj-${c}`) * (rMax - rMin);
      const cx = wx + Math.cos(angle) * rJ;
      const cz = wz + Math.sin(angle) * rJ;
      const mates = 2 + (Math.floor(hashUnit01(`mates-${c}`) * 2) % 2);
      const gap = 0.44 * dS;
      const ux = -Math.sin(angle);
      const uz = Math.cos(angle);
      for (let m = 0; m < mates; m++) {
        const along = (m - (mates - 1) / 2) * gap;
        const [jx, jz] = jitter2(`rg-${c}`, m);
        const lx = cx + ux * along + jx * 0.38 * dS;
        const lz = cz + uz * along + jz * 0.38 * dS;
        tryHouse(lx, lz, TURF_TOP_Y, `rg-${c}-${m}`);
      }
    }

    const innerClusters = 10;
    for (let c = 0; c < innerClusters; c++) {
      const angle = (c / innerClusters) * Math.PI * 2 + 0.73;
      const rJ =
        innerRow + (hashUnit01(`irj-${c}`) - 0.5) * 0.62;
      const cx = wx + Math.cos(angle) * rJ;
      const cz = wz + Math.sin(angle) * rJ;
      const mates = 2;
      const gap = 0.4 * dS;
      const ux = -Math.sin(angle);
      const uz = Math.cos(angle);
      for (let m = 0; m < mates; m++) {
        const along = (m - 0.5) * gap;
        const [jx, jz] = jitter2(`ig-${c}`, m);
        tryHouse(
          cx + ux * along + jx * 0.32 * dS,
          cz + uz * along + jz * 0.32 * dS,
          TURF_TOP_Y + 0.28,
          `ig-${c}-${m}`
        );
      }
    }

    const cornerOffsetsLocal: [string, number, number][] = [
      ["ne", ringOuter - 0.35, ringOuter - 0.35],
      ["nw", -ringOuter + 0.75, ringOuter - 0.25],
      ["se", ringOuter - 0.55, -ringOuter + 0.45],
      ["sw", -ringOuter + 0.4, -ringOuter + 0.55],
    ];
    for (const [key, ox, oz] of cornerOffsetsLocal) {
      const bx = wx + ox;
      const bz = wz + oz;
      const ang = Math.atan2(oz, ox);
      const ux = -Math.sin(ang);
      const uz = Math.cos(ang);
      const [jx, jz] = jitter2(`ch-${key}`, 0);
      tryHouse(
        bx + ux * 0.22 * dS + jx * 0.25 * dS,
        bz + uz * 0.22 * dS + jz * 0.25 * dS,
        cornerFloors,
        `CHa-${key}`
      );
      tryHouse(
        bx - ux * 0.38 * dS - jx * 0.2 * dS,
        bz - uz * 0.38 * dS - jz * 0.2 * dS,
        cornerFloors,
        `CHb-${key}`
      );
    }

    return specs;
  }, [wx, wz, walk, outer, ringInner, ringOuter, cornerFloors]);

  return (
    <group>
      {mergedTerraceGeoms.stone && (
        <mesh geometry={mergedTerraceGeoms.stone} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            color="#ffffff"
            roughness={0.28}
            metalness={0.22}
          />
        </mesh>
      )}
      {mergedTerraceGeoms.grass && (
        <mesh geometry={mergedTerraceGeoms.grass} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            color="#ffffff"
            roughness={0.42}
            metalness={0.08}
          />
        </mesh>
      )}
      {mergedRingLipGeoms.stone && (
        <mesh geometry={mergedRingLipGeoms.stone} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            color="#ffffff"
            roughness={0.35}
            metalness={0.18}
          />
        </mesh>
      )}
      {mergedRingLipGeoms.grass && (
        <mesh geometry={mergedRingLipGeoms.grass} castShadow receiveShadow>
          <meshStandardMaterial
            vertexColors
            color="#ffffff"
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}
      <PlazaInstancedVoxelHouses houses={houseSpecs} />
    </group>
  );
}
