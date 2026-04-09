"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import {
  PLAZA_AQUARIUM_ISLAND_OFFSET_X,
  PLAZA_AQUARIUM_ISLAND_OFFSET_Z,
} from "@/lib/shop/plazaShopConstants";
import { addMultiplicativeWhiteVertexColors } from "@/lib/game/threeInstancing";

/** Main white plaza towers — height vs character (2–3× original). */
const PLAZA_CENTRAL_TOWER_HEIGHT_SCALE = 2.5;

/** Floating bubbles: split by material (glass / opaque / brushed metal / bright accents). */
const BUBBLE_COUNT = 72;
const BUBBLE_GLASS_COUNT = 24;
const BUBBLE_OPAQUE_COUNT = 24;
const BUBBLE_METAL_COUNT = 16;
const BUBBLE_BRIGHT_COUNT = 8;
/** A few oversized floaters (radius × `BUBBLE_MEGA_RADIUS_SCALE`). */
const BUBBLE_MEGA_COUNT = 3;
const BUBBLE_MEGA_RADIUS_SCALE = 4;
const ORB_COUNT = 28;
const FISH_COUNT = 42;
const BUILDING_COUNT = 6;
/** Smaller “city block” cubes beside each tower; split opaque vs glass (Frutiger Aero). */
const SATELLITE_OPAQUE_COUNT = 12;
const SATELLITE_GLASS_COUNT = 6;

const BUBBLE_PALETTE = [
  "#e8ffff",
  "#ffffff",
  "#c8f8ff",
  "#d8fff8",
  "#f0ffff",
  "#b8f0ff",
] as const;

const ORB_PALETTE = [
  "#ffb8d8",
  "#88d0ff",
  "#c8ffa8",
  "#ffe898",
  "#d8c0ff",
  "#68e8d8",
] as const;

const FISH_COLORS = [
  "#ff1493",
  "#00e5ff",
  "#ffea00",
  "#ff6b00",
  "#7cff00",
  "#b026ff",
  "#ff3355",
  "#00ffaa",
] as const;

type BubbleSpec = {
  x: number;
  z: number;
  y0: number;
  ph: number;
  sp: number;
  r: number;
};

type OrbSpec = {
  x: number;
  z: number;
  y0: number;
  ph: number;
  sp: number;
  r: number;
};

type FishSpec = {
  cx: number;
  cz: number;
  r: number;
  ph: number;
  sp: number;
  y0: number;
  wobble: number;
};

type SatelliteSpec = {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
};

function seededRand(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Grayscale noise for metal roughness (no external assets; SSR-safe). */
function createBrushedRoughnessDataTexture(): THREE.DataTexture {
  const w = 64;
  const h = 64;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n =
        Math.sin(x * 0.31) * Math.cos(y * 0.27) * 0.5 +
        Math.sin((x + y) * 0.11) * 0.25 +
        0.5;
      const streak = 0.72 + (x / w) * 0.28;
      const v = Math.min(255, Math.floor(255 * n * streak));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Frutiger Aero layer: bright bubbles, water, glass aquarium, fish (one `useFrame`), instanced towers. */
export function PlazaFrutigerAeroDecor({
  wx,
  wz,
  walk,
  outer,
  onPointerDownAquariumShop,
}: {
  wx: number;
  wz: number;
  walk: number;
  outer: number;
  /** Opens the aquarium shop modal (plaza hub). */
  onPointerDownAquariumShop?: () => void;
}) {
  const bubbleGlassRef = useRef<THREE.InstancedMesh>(null);
  const bubbleOpaqueRef = useRef<THREE.InstancedMesh>(null);
  const bubbleMetalRef = useRef<THREE.InstancedMesh>(null);
  const bubbleBrightRef = useRef<THREE.InstancedMesh>(null);
  const orbRef = useRef<THREE.InstancedMesh>(null);
  const fishRef = useRef<THREE.InstancedMesh>(null);
  const buildingRef = useRef<THREE.InstancedMesh>(null);
  const satelliteOpaqueRef = useRef<THREE.InstancedMesh>(null);
  const satelliteGlassRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const rInner = walk + 2.8;
  const rOuter = outer - 1.35;

  const {
    bubblesGlass,
    bubblesOpaque,
    bubblesMetal,
    bubblesBright,
    orbs,
    fishSpecs,
    aquarium,
    buildings,
    satelliteOpaque,
    satelliteGlass,
  } = useMemo(() => {
    const rand = seededRand(90210);
    const bubblesGlass: BubbleSpec[] = [];
    const bubblesOpaque: BubbleSpec[] = [];
    const bubblesMetal: BubbleSpec[] = [];
    const bubblesBright: BubbleSpec[] = [];
    const megaIndices = new Set<number>();
    const megaPick = seededRand(90211);
    while (megaIndices.size < BUBBLE_MEGA_COUNT) {
      megaIndices.add(Math.floor(megaPick() * BUBBLE_COUNT));
    }
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const th = rand() * Math.PI * 2;
      const rad = rInner + rand() * Math.max(0.4, rOuter - rInner);
      const baseR = 0.24 + rand() * 0.34;
      const mega = megaIndices.has(i);
      const r = baseR * (mega ? BUBBLE_MEGA_RADIUS_SCALE : 1);
      let y0 = TURF_TOP_Y + 0.95 + rand() * 3.8;
      if (mega) {
        y0 = Math.max(y0, TURF_TOP_Y + r + 0.28);
      }
      const spec: BubbleSpec = {
        x: wx + Math.cos(th) * rad,
        z: wz + Math.sin(th) * rad,
        y0,
        ph: rand() * Math.PI * 2,
        sp: 0.5 + rand() * 0.95,
        r,
      };
      const slot = i % 9;
      if (slot < 3) bubblesGlass.push(spec);
      else if (slot < 6) bubblesOpaque.push(spec);
      else if (slot < 8) bubblesMetal.push(spec);
      else bubblesBright.push(spec);
    }

    const orbs: OrbSpec[] = [];
    for (let i = 0; i < ORB_COUNT; i++) {
      const th = rand() * Math.PI * 2;
      const rad = rInner + 0.5 + rand() * Math.max(0.3, rOuter - rInner - 0.9);
      orbs.push({
        x: wx + Math.cos(th) * rad,
        z: wz + Math.sin(th) * rad,
        y0: TURF_TOP_Y + 0.4 + rand() * 1.05,
        ph: rand() * Math.PI * 2,
        sp: 0.8 + rand() * 1.15,
        r: 0.13 + rand() * 0.14,
      });
    }

    const aquW = 7.2;
    const aquD = 5.8;
    const aquH = 3.6;
    const aquCx = wx + PLAZA_AQUARIUM_ISLAND_OFFSET_X;
    const aquCz = wz + PLAZA_AQUARIUM_ISLAND_OFFSET_Z;
    const aquarium = {
      cx: aquCx,
      cz: aquCz,
      w: aquW,
      d: aquD,
      h: aquH,
      baseY: TURF_TOP_Y + 0.02,
    };

    const maxFishR = Math.min(aquW, aquD) * 0.38;
    const fishSpecs: FishSpec[] = [];
    for (let i = 0; i < FISH_COUNT; i++) {
      fishSpecs.push({
        cx: aquCx,
        cz: aquCz,
        r: 0.28 + rand() * Math.max(0.15, maxFishR - 0.28),
        ph: rand() * Math.PI * 2,
        sp: 0.45 + rand() * 0.55,
        y0: TURF_TOP_Y + 0.45 + rand() * (aquH - 0.55),
        wobble: rand() * Math.PI * 2,
      });
    }

    const towerH = PLAZA_CENTRAL_TOWER_HEIGHT_SCALE;
    const bldgLayout: {
      ox: number;
      oz: number;
      bw: number;
      bh: number;
      bd: number;
    }[] = [
      { ox: 23, oz: 13, bw: 3.8, bh: 10.5 * towerH, bd: 3.4 },
      { ox: -21, oz: 15, bw: 4.4, bh: 12 * towerH, bd: 3.8 },
      { ox: -18, oz: -20, bw: 3.6, bh: 9 * towerH, bd: 4.2 },
      { ox: 20, oz: -17, bw: 4.8, bh: 11 * towerH, bd: 3.2 },
      { ox: 8, oz: 26, bw: 3.2, bh: 8 * towerH, bd: 3 },
      { ox: -11, oz: 24, bw: 3.5, bh: 9.5 * towerH, bd: 3.6 },
    ];
    const buildings = bldgLayout.map((b) => ({
      x: wx + b.ox,
      z: wz + b.oz,
      w: b.bw,
      h: b.bh,
      d: b.bd,
    }));

    /** Local offsets from each tower center — short opaque blocks + one glass slab per tower. */
    const companions: {
      dx: number;
      dz: number;
      bw: number;
      bh: number;
      bd: number;
      glass: boolean;
    }[][] = [
      [
        { dx: 3.15, dz: 0.2, bw: 1.65, bh: 4.4 * towerH, bd: 1.35, glass: false },
        { dx: -2.85, dz: 1.95, bw: 1.25, bh: 3.6 * towerH, bd: 1.15, glass: false },
        { dx: 0.35, dz: -2.75, bw: 1.35, bh: 6.8 * towerH, bd: 1.05, glass: true },
      ],
      [
        { dx: -3.2, dz: -0.25, bw: 1.7, bh: 5.1 * towerH, bd: 1.4, glass: false },
        { dx: 2.6, dz: 2.1, bw: 1.3, bh: 4.0 * towerH, bd: 1.2, glass: false },
        { dx: 0.5, dz: -3.0, bw: 1.15, bh: 7.2 * towerH, bd: 1.0, glass: true },
      ],
      [
        { dx: 2.9, dz: -1.8, bw: 1.55, bh: 3.8 * towerH, bd: 1.3, glass: false },
        { dx: -2.5, dz: -2.4, bw: 1.4, bh: 4.6 * towerH, bd: 1.25, glass: false },
        { dx: -0.4, dz: 3.05, bw: 1.2, bh: 6.5 * towerH, bd: 0.95, glass: true },
      ],
      [
        { dx: -3.05, dz: 1.5, bw: 1.75, bh: 4.9 * towerH, bd: 1.45, glass: false },
        { dx: 2.4, dz: -1.6, bw: 1.35, bh: 3.4 * towerH, bd: 1.1, glass: false },
        { dx: 0.2, dz: 2.95, bw: 1.1, bh: 7.0 * towerH, bd: 1.0, glass: true },
      ],
      [
        { dx: 2.75, dz: 2.2, bw: 1.5, bh: 4.2 * towerH, bd: 1.25, glass: false },
        { dx: -2.65, dz: -0.3, bw: 1.45, bh: 5.0 * towerH, bd: 1.3, glass: false },
        { dx: 0.6, dz: -2.9, bw: 1.2, bh: 6.2 * towerH, bd: 0.9, glass: true },
      ],
      [
        { dx: -3.1, dz: 1.1, bw: 1.6, bh: 4.5 * towerH, bd: 1.35, glass: false },
        { dx: 2.5, dz: -2.0, bw: 1.3, bh: 3.7 * towerH, bd: 1.15, glass: false },
        { dx: -0.2, dz: 2.85, bw: 1.15, bh: 6.6 * towerH, bd: 0.95, glass: true },
      ],
    ];

    const satelliteOpaque: SatelliteSpec[] = [];
    const satelliteGlass: SatelliteSpec[] = [];
    for (let ti = 0; ti < bldgLayout.length; ti++) {
      const base = bldgLayout[ti]!;
      const bx = wx + base.ox;
      const bz = wz + base.oz;
      for (const c of companions[ti]!) {
        const spec: SatelliteSpec = {
          x: bx + c.dx,
          z: bz + c.dz,
          w: c.bw,
          h: c.bh,
          d: c.bd,
        };
        if (c.glass) satelliteGlass.push(spec);
        else satelliteOpaque.push(spec);
      }
    }

    return {
      bubblesGlass,
      bubblesOpaque,
      bubblesMetal,
      bubblesBright,
      orbs,
      fishSpecs,
      aquarium,
      buildings,
      satelliteOpaque,
      satelliteGlass,
    };
  }, [wx, wz, rInner, rOuter]);

  const bubbleGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 10, 8);
    addMultiplicativeWhiteVertexColors(g);
    return g;
  }, []);
  const orbGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 8, 6);
    addMultiplicativeWhiteVertexColors(g);
    return g;
  }, []);
  const fishGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.14, 0.52, 5, 1, false);
    /** Per-vertex white so `vertexColors` + `setColorAt` multiply to instance colors (no attr ⇒ black). */
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    colors.fill(1);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  const buildingGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const metalRoughnessTex = useMemo(() => createBrushedRoughnessDataTexture(), []);
  useEffect(() => {
    return () => {
      metalRoughnessTex.dispose();
    };
  }, [metalRoughnessTex]);

  const bubbleGlassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#d8f8ff",
        transparent: true,
        opacity: 0.55,
        roughness: 0.06,
        metalness: 0.12,
        transmission: 0.72,
        thickness: 0.55,
        ior: 1.35,
        attenuationColor: new THREE.Color("#b8e8ff"),
        attenuationDistance: 1.2,
        emissive: "#7ec8f8",
        emissiveIntensity: 0.12,
        depthWrite: false,
        clearcoat: 0.55,
        clearcoatRoughness: 0.08,
      }),
    []
  );

  const bubbleOpaqueMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.38,
        metalness: 0.06,
        emissive: "#c8e4f8",
        emissiveIntensity: 0.22,
      }),
    []
  );

  const bubbleMetalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f2f7fc",
        roughness: 0.38,
        metalness: 0.82,
        roughnessMap: metalRoughnessTex,
        emissive: "#c8dcf0",
        emissiveIntensity: 0.58,
      }),
    [metalRoughnessTex]
  );

  const bubbleBrightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.22,
        metalness: 0.18,
        emissive: "#000000",
        emissiveIntensity: 0,
      }),
    []
  );

  const orbMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        toneMapped: false,
      }),
    []
  );

  const fishMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        vertexColors: true,
        toneMapped: false,
      }),
    []
  );

  const buildingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbfdff",
        roughness: 0.22,
        metalness: 0.35,
        emissive: "#c8e0f8",
        emissiveIntensity: 0.08,
      }),
    []
  );

  const satelliteOpaqueMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.26,
        metalness: 0.28,
        emissive: "#dceaf8",
        emissiveIntensity: 0.055,
      }),
    []
  );

  /** Frosted glass towers — distinct from aquarium panes, reads as built volume. */
  const satelliteGlassBuildingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#eef6ff",
        transparent: true,
        opacity: 0.34,
        roughness: 0.14,
        metalness: 0.38,
        emissive: "#c4dcf8",
        emissiveIntensity: 0.09,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8f0ff",
        transparent: true,
        opacity: 0.22,
        roughness: 0.04,
        metalness: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a7fd4",
        roughness: 0.12,
        metalness: 0.04,
        transparent: true,
        opacity: 0.42,
        emissive: "#38b4ff",
        emissiveIntensity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const poolWaterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a9ec8",
        roughness: 0.05,
        metalness: 0.06,
        transparent: true,
        opacity: 0.92,
        emissive: "#6ec0e8",
        emissiveIntensity: 0.18,
      }),
    []
  );

  useLayoutEffect(() => {
    const bgMesh = bubbleGlassRef.current;
    const boMesh = bubbleOpaqueRef.current;
    const bmMesh = bubbleMetalRef.current;
    const bbMesh = bubbleBrightRef.current;
    const oMesh = orbRef.current;
    const fMesh = fishRef.current;
    const blMesh = buildingRef.current;
    const soMesh = satelliteOpaqueRef.current;
    const sgMesh = satelliteGlassRef.current;
    if (
      !bgMesh ||
      !boMesh ||
      !bmMesh ||
      !bbMesh ||
      !oMesh ||
      !fMesh ||
      !blMesh ||
      !soMesh ||
      !sgMesh
    ) {
      return;
    }

    for (let i = 0; i < BUBBLE_GLASS_COUNT; i++) {
      const b = bubblesGlass[i]!;
      dummy.position.set(b.x, b.y0, b.z);
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bgMesh.setMatrixAt(i, dummy.matrix);
    }
    bgMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BUBBLE_OPAQUE_COUNT; i++) {
      const b = bubblesOpaque[i]!;
      dummy.position.set(b.x, b.y0, b.z);
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      boMesh.setMatrixAt(i, dummy.matrix);
      color.set(BUBBLE_PALETTE[i % BUBBLE_PALETTE.length]!);
      boMesh.setColorAt(i, color);
    }
    boMesh.instanceMatrix.needsUpdate = true;
    if (boMesh.instanceColor) boMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < BUBBLE_METAL_COUNT; i++) {
      const b = bubblesMetal[i]!;
      dummy.position.set(b.x, b.y0, b.z);
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bmMesh.setMatrixAt(i, dummy.matrix);
    }
    bmMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BUBBLE_BRIGHT_COUNT; i++) {
      const b = bubblesBright[i]!;
      dummy.position.set(b.x, b.y0, b.z);
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bbMesh.setMatrixAt(i, dummy.matrix);
      color.set(ORB_PALETTE[i % ORB_PALETTE.length]!);
      bbMesh.setColorAt(i, color);
    }
    bbMesh.instanceMatrix.needsUpdate = true;
    if (bbMesh.instanceColor) bbMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < ORB_COUNT; i++) {
      const o = orbs[i]!;
      dummy.position.set(o.x, o.y0, o.z);
      dummy.scale.setScalar(o.r);
      dummy.updateMatrix();
      oMesh.setMatrixAt(i, dummy.matrix);
      color.set(ORB_PALETTE[i % ORB_PALETTE.length]!);
      oMesh.setColorAt(i, color);
    }
    oMesh.instanceMatrix.needsUpdate = true;
    if (oMesh.instanceColor) oMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < FISH_COUNT; i++) {
      const f = fishSpecs[i]!;
      const ang = f.ph;
      dummy.position.set(
        f.cx + Math.cos(ang) * f.r,
        f.y0,
        f.cz + Math.sin(ang) * f.r
      );
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(Math.PI / 2, ang + Math.PI / 2, 0);
      dummy.updateMatrix();
      fMesh.setMatrixAt(i, dummy.matrix);
      color.set(FISH_COLORS[i % FISH_COLORS.length]!);
      fMesh.setColorAt(i, color);
    }
    fMesh.instanceMatrix.needsUpdate = true;
    if (fMesh.instanceColor) fMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < BUILDING_COUNT; i++) {
      const b = buildings[i]!;
      dummy.position.set(b.x, TURF_TOP_Y + b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      blMesh.setMatrixAt(i, dummy.matrix);
    }
    blMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SATELLITE_OPAQUE_COUNT; i++) {
      const s = satelliteOpaque[i]!;
      dummy.position.set(s.x, TURF_TOP_Y + s.h / 2, s.z);
      dummy.scale.set(s.w, s.h, s.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      soMesh.setMatrixAt(i, dummy.matrix);
    }
    soMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SATELLITE_GLASS_COUNT; i++) {
      const s = satelliteGlass[i]!;
      dummy.position.set(s.x, TURF_TOP_Y + s.h / 2, s.z);
      dummy.scale.set(s.w, s.h, s.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      sgMesh.setMatrixAt(i, dummy.matrix);
    }
    sgMesh.instanceMatrix.needsUpdate = true;
  }, [
    bubblesGlass,
    bubblesOpaque,
    bubblesMetal,
    bubblesBright,
    orbs,
    fishSpecs,
    buildings,
    satelliteOpaque,
    satelliteGlass,
    dummy,
    color,
  ]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const bgMesh = bubbleGlassRef.current;
    const boMesh = bubbleOpaqueRef.current;
    const bmMesh = bubbleMetalRef.current;
    const bbMesh = bubbleBrightRef.current;
    const oMesh = orbRef.current;
    const fMesh = fishRef.current;
    if (!bgMesh || !boMesh || !bmMesh || !bbMesh || !oMesh || !fMesh) return;

    const bobble = (b: BubbleSpec) => {
      const bob = Math.sin(t * b.sp + b.ph) * 0.34;
      const sway = Math.sin(t * 0.33 + b.ph * 0.5) * 0.1;
      dummy.position.set(
        b.x + sway,
        b.y0 + bob,
        b.z + Math.cos(t * 0.27 + b.ph) * 0.07
      );
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
    };

    for (let i = 0; i < BUBBLE_GLASS_COUNT; i++) {
      bobble(bubblesGlass[i]!);
      bgMesh.setMatrixAt(i, dummy.matrix);
    }
    bgMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BUBBLE_OPAQUE_COUNT; i++) {
      bobble(bubblesOpaque[i]!);
      boMesh.setMatrixAt(i, dummy.matrix);
    }
    boMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BUBBLE_METAL_COUNT; i++) {
      bobble(bubblesMetal[i]!);
      bmMesh.setMatrixAt(i, dummy.matrix);
    }
    bmMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BUBBLE_BRIGHT_COUNT; i++) {
      bobble(bubblesBright[i]!);
      bbMesh.setMatrixAt(i, dummy.matrix);
    }
    bbMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < ORB_COUNT; i++) {
      const o = orbs[i]!;
      const wobble = Math.sin(t * o.sp + o.ph) * 0.07;
      dummy.position.set(o.x, o.y0 + wobble, o.z);
      dummy.scale.setScalar(o.r);
      dummy.updateMatrix();
      oMesh.setMatrixAt(i, dummy.matrix);
    }
    oMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < FISH_COUNT; i++) {
      const f = fishSpecs[i]!;
      const ang = t * f.sp + f.ph;
      const bob = Math.sin(t * 1.6 + f.wobble) * 0.07;
      const px = f.cx + Math.cos(ang) * f.r;
      const pz = f.cz + Math.sin(ang) * f.r;
      dummy.position.set(px, f.y0 + bob, pz);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(Math.PI / 2, ang + Math.PI / 2, 0);
      dummy.updateMatrix();
      fMesh.setMatrixAt(i, dummy.matrix);
    }
    fMesh.instanceMatrix.needsUpdate = true;
  });

  const wallT = 0.07;
  const hw = aquarium.w / 2;
  const hd = aquarium.d / 2;
  const hyLocal = aquarium.h / 2;
  const innerW = aquarium.w - 2 * wallT - 0.08;
  const innerD = aquarium.d - 2 * wallT - 0.08;
  const innerH = aquarium.h - wallT - 0.08;
  const waterCenterY = wallT + innerH / 2;

  const waterPools = useMemo(
    () => [
      { x: wx + 12, z: wz + 21, r: 3.6 },
      { x: wx - 16, z: wz + 18, r: 2.9 },
      { x: wx - 10, z: wz - 22, r: 3.2 },
    ],
    [wx, wz]
  );

  return (
    <group>
      {waterPools.map((p, i) => (
        <mesh
          key={`pool-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, TURF_TOP_Y + 0.03, p.z]}
          receiveShadow
          material={poolWaterMat}
        >
          <circleGeometry args={[p.r, 28]} />
        </mesh>
      ))}

      <group position={[aquarium.cx, aquarium.baseY, aquarium.cz]}>
        <pointLight
          position={[0, aquarium.h + 0.55, 0]}
          color="#d4efff"
          intensity={5}
          distance={Math.max(aquarium.w, aquarium.d) * 2.8}
          decay={2}
        />
        <mesh
          position={[0, waterCenterY, 0]}
          castShadow={false}
          receiveShadow
          material={waterMat}
          renderOrder={-1}
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[innerW, innerH, innerD]} />
        </mesh>
        <mesh
          position={[0, hyLocal, -hd + wallT / 2]}
          castShadow={false}
          receiveShadow
          material={glassMat}
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[aquarium.w, aquarium.h, wallT]} />
        </mesh>
        <mesh
          position={[0, hyLocal, hd - wallT / 2]}
          castShadow={false}
          receiveShadow
          material={glassMat}
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[aquarium.w, aquarium.h, wallT]} />
        </mesh>
        <mesh
          position={[-hw + wallT / 2, hyLocal, 0]}
          castShadow={false}
          receiveShadow
          material={glassMat}
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[wallT, aquarium.h, aquarium.d]} />
        </mesh>
        <mesh
          position={[hw - wallT / 2, hyLocal, 0]}
          castShadow={false}
          receiveShadow
          material={glassMat}
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[wallT, aquarium.h, aquarium.d]} />
        </mesh>
        <mesh
          position={[0, wallT / 2, 0]}
          receiveShadow
          onPointerDown={
            onPointerDownAquariumShop
              ? (e) => {
                  e.stopPropagation();
                  onPointerDownAquariumShop();
                }
              : undefined
          }
        >
          <boxGeometry args={[aquarium.w, wallT, aquarium.d]} />
          <meshStandardMaterial
            color="#d8e8f4"
            roughness={0.32}
            metalness={0.18}
            transparent
            opacity={0.72}
          />
        </mesh>
      </group>

      <instancedMesh
        ref={buildingRef}
        args={[buildingGeo, buildingMat, BUILDING_COUNT]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={satelliteOpaqueRef}
        args={[buildingGeo, satelliteOpaqueMat, SATELLITE_OPAQUE_COUNT]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={satelliteGlassRef}
        args={[buildingGeo, satelliteGlassBuildingMat, SATELLITE_GLASS_COUNT]}
        castShadow={false}
        receiveShadow
        renderOrder={2}
      />

      <instancedMesh
        ref={bubbleGlassRef}
        args={[bubbleGeo, bubbleGlassMat, BUBBLE_GLASS_COUNT]}
        castShadow={false}
        receiveShadow
        renderOrder={3}
      />
      <instancedMesh
        ref={bubbleOpaqueRef}
        args={[bubbleGeo, bubbleOpaqueMat, BUBBLE_OPAQUE_COUNT]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bubbleMetalRef}
        args={[bubbleGeo, bubbleMetalMat, BUBBLE_METAL_COUNT]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bubbleBrightRef}
        args={[bubbleGeo, bubbleBrightMat, BUBBLE_BRIGHT_COUNT]}
        castShadow
        receiveShadow
        renderOrder={2}
      />
      <instancedMesh ref={orbRef} args={[orbGeo, orbMat, ORB_COUNT]} />
      <instancedMesh
        ref={fishRef}
        args={[fishGeo, fishMat, FISH_COUNT]}
        renderOrder={1}
      />
    </group>
  );
}
