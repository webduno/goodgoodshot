"use client";

import { useMemo } from "react";

import { TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

import {
  PlazaInstancedVoxelHouses,
  type PlazaVoxelHouseSpec,
} from "@/components/game/cube/meshes/PlazaInstancedVoxelHouses";

/** Porcelain / mist “buildings” — Frutiger Aero (avoid dark brown stone). */
const STONE = "#f2f6fb";
const STONE_DARK = "#e0e8f0";
const STONE_COOL = "#e8f2fa";
const STONE_AERO = "#e4f4f4";
const STONE_WARM = "#faf6f0";
const GRASS_TRIM = "#7ee0a8";
const GRASS_TRIM_DARK = "#58c888";

/** Pastel village accents (still opaque, but light). */
const WALL_PALETTE = [
  "#c8e8f8",
  "#f8d0e8",
  "#b8f0d8",
  "#e8d8f8",
  "#ffe8c8",
  "#d0e8ff",
  "#ffd0d8",
  "#d8f8c8",
  "#f0d8f0",
  "#c8f8f0",
] as const;

const ROOF_PALETTE = [
  "#e89888",
  "#98a8e0",
  "#88c898",
  "#c8a888",
  "#b898d8",
  "#e0c078",
] as const;

const PORTAL_EXCLUSION_R = 4.6;

function clearOfPortals(
  lx: number,
  lz: number,
  wx: number,
  wz: number,
  walk: number
): boolean {
  const px = lx - wx;
  const pz = lz - wz;
  const anchors: [number, number][] = [
    [0, walk],
    [0, -walk],
    [walk, 0],
    [-walk, 0],
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

/** One stepped terrace: several horizontal slabs, smaller as they rise (decorative). */
function TerraceStack({
  cx,
  cz,
  baseHalfW,
  baseHalfD,
  baseY,
  levels,
  stoneColor,
  capGrass,
}: {
  cx: number;
  cz: number;
  baseHalfW: number;
  baseHalfD: number;
  baseY: number;
  levels: readonly { halfScale: number; thickness: number }[];
  stoneColor: string;
  capGrass: boolean;
}) {
  const tiers = useMemo(() => {
    type Tier = {
      cy: number;
      topY: number;
      hw: number;
      hd: number;
      thickness: number;
      i: number;
    };
    return levels.reduce<Tier[]>((acc, L, i) => {
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
  }, [levels, baseY, baseHalfW, baseHalfD]);

  return (
    <group position={[cx, 0, cz]}>
      {tiers.map((t) => {
        const isTop = t.i === levels.length - 1;
        return (
          <mesh
            key={`ter-${t.i}-${t.hw}-${t.hd}`}
            position={[0, t.cy, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[t.hw * 2, t.thickness, t.hd * 2]} />
            <meshStandardMaterial
              color={isTop && capGrass ? GRASS_TRIM : stoneColor}
              roughness={isTop && capGrass ? 0.42 : 0.28}
              metalness={isTop && capGrass ? 0.08 : 0.22}
            />
          </mesh>
        );
      })}
    </group>
  );
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

  const terraceSpecs: {
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
    if (!clearOfPortals(lx, lz, wx, wz, walk)) return;
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
    terraceSpecs.push({
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
      if (!clearOfPortals(lx, lz, wx, wz, walk)) return;
      const pr = Math.hypot(lx - wx, lz - wz);
      if (pr < ringInner - 0.2 || pr > ringOuter + 1.2) return;
      const k = `${lx.toFixed(2)},${lz.toFixed(2)},${floorY.toFixed(2)}`;
      if (houseKeys.has(k)) return;
      houseKeys.add(k);
      const wall = hashPick(seed, WALL_PALETTE);
      const roof = hashPick(seed + "r", ROOF_PALETTE);
      const h0 = Math.abs(
        seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
      );
      const s = 0.62 + (h0 % 4) * 0.12;
      const bodyH = 0.72 + (hi % 4) * 0.14;
      specs.push({
        lx,
        lz,
        floorY,
        wallHex: wall,
        roofHex: roof,
        bodyW: s,
        bodyD: s * (0.92 + (hi % 3) * 0.04),
        bodyH,
      });
      hi += 1;
    };

    const tMax = Math.ceil(outer + 0.5);
    const stepN = 2.15;
    for (let t = -tMax; t <= tMax; t += stepN) {
      tryHouse(wx + t, wz + (ringOuter - 0.55), TURF_TOP_Y, `N${t}`);
      tryHouse(wx + t, wz - (ringOuter - 0.55), TURF_TOP_Y, `S${t}`);
    }
    const tMaxE = Math.ceil(outer * 0.72);
    for (let t = -tMaxE; t <= tMaxE; t += 2.75) {
      tryHouse(wx + (ringOuter - 0.55), wz + t, TURF_TOP_Y, `E${t}`);
      tryHouse(wx - (ringOuter - 0.55), wz + t, TURF_TOP_Y, `W${t}`);
    }

    const innerRow = ringInner + 1.15;
    for (let t = -tMax + 3; t <= tMax - 3; t += 3.05) {
      tryHouse(wx + t, wz + innerRow, TURF_TOP_Y + 0.28, `N2${t}`);
      tryHouse(wx + t, wz - innerRow, TURF_TOP_Y + 0.28, `S2${t}`);
    }
    for (let t = -tMaxE + 2; t <= tMaxE - 2; t += 3.55) {
      tryHouse(wx + innerRow, wz + t, TURF_TOP_Y + 0.28, `E2${t}`);
      tryHouse(wx - innerRow, wz + t, TURF_TOP_Y + 0.28, `W2${t}`);
    }

    const cornerOffsetsLocal: [string, number, number][] = [
      ["ne", ringOuter - 0.35, ringOuter - 0.35],
      ["nw", -ringOuter + 0.75, ringOuter - 0.25],
      ["se", ringOuter - 0.55, -ringOuter + 0.45],
      ["sw", -ringOuter + 0.4, -ringOuter + 0.55],
    ];
    for (const [key, ox, oz] of cornerOffsetsLocal) {
      tryHouse(wx + ox + 0.55, wz + oz + 0.45, cornerFloors, `CHa${key}`);
      tryHouse(wx + ox - 0.5, wz + oz - 0.4, cornerFloors, `CHb${key}`);
    }

    return specs;
  }, [wx, wz, walk, outer, ringInner, ringOuter, cornerFloors]);

  return (
    <group>
      {terraceSpecs.map((t) => (
        <TerraceStack
          key={t.key}
          cx={t.cx}
          cz={t.cz}
          baseHalfW={t.baseHalfW}
          baseHalfD={t.baseHalfD}
          baseY={TURF_TOP_Y}
          levels={t.levels}
          stoneColor={t.stoneColor}
          capGrass={t.capGrass}
        />
      ))}
      <RingRetainingLip wx={wx} wz={wz} walk={walk} />
      <PlazaInstancedVoxelHouses houses={houseSpecs} />
    </group>
  );
}

/** Short stepped blocks hugging the walkable border (pure decoration). */
function RingRetainingLip({
  wx,
  wz,
  walk,
}: {
  wx: number;
  wz: number;
  walk: number;
}) {
  const h = 0.22;
  const cy = TURF_TOP_Y + h / 2;
  const span = walk + 0.85;
  const thick = 0.55;
  const mat = (
    <meshStandardMaterial
      color={STONE_DARK}
      roughness={0.35}
      metalness={0.18}
    />
  );
  const grassCap = (
    <meshStandardMaterial
      color={GRASS_TRIM_DARK}
      roughness={0.4}
      metalness={0.1}
    />
  );
  return (
    <group>
      <mesh position={[wx, cy, wz + walk + thick / 2]} castShadow receiveShadow>
        <boxGeometry args={[span * 2, h, thick]} />
        {mat}
      </mesh>
      <mesh position={[wx, cy, wz - walk - thick / 2]} castShadow receiveShadow>
        <boxGeometry args={[span * 2, h, thick]} />
        {mat}
      </mesh>
      <mesh position={[wx + walk + thick / 2, cy, wz]} castShadow receiveShadow>
        <boxGeometry args={[thick, h, span * 2]} />
        {mat}
      </mesh>
      <mesh position={[wx - walk - thick / 2, cy, wz]} castShadow receiveShadow>
        <boxGeometry args={[thick, h, span * 2]} />
        {mat}
      </mesh>
      <mesh
        position={[wx, TURF_TOP_Y + h + 0.04, wz + walk + thick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[span * 2 - 0.3, 0.08, thick - 0.08]} />
        {grassCap}
      </mesh>
      <mesh
        position={[wx, TURF_TOP_Y + h + 0.04, wz - walk - thick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[span * 2 - 0.3, 0.08, thick - 0.08]} />
        {grassCap}
      </mesh>
      <mesh
        position={[wx + walk + thick / 2, TURF_TOP_Y + h + 0.04, wz]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[thick - 0.08, 0.08, span * 2 - 0.3]} />
        {grassCap}
      </mesh>
      <mesh
        position={[wx - walk - thick / 2, TURF_TOP_Y + h + 0.04, wz]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[thick - 0.08, 0.08, span * 2 - 0.3]} />
        {grassCap}
      </mesh>
    </group>
  );
}
