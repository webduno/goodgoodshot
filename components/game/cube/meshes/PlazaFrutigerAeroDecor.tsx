"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

/** Unlit bubbles — avoids “black sphere” look under directional-only lighting. */
const BUBBLE_COUNT = 72;
const ORB_COUNT = 28;
const FISH_COUNT = 42;
const BUILDING_COUNT = 6;

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

const FISH_COLORS = ["#ff9858", "#ffffff", "#ff7848", "#fff0e8"] as const;

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

function seededRand(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

/** Frutiger Aero layer: bright bubbles, water, glass aquarium, fish (one `useFrame`), instanced towers. */
export function PlazaFrutigerAeroDecor({
  wx,
  wz,
  walk,
  outer,
}: {
  wx: number;
  wz: number;
  walk: number;
  outer: number;
}) {
  const bubbleRef = useRef<THREE.InstancedMesh>(null);
  const orbRef = useRef<THREE.InstancedMesh>(null);
  const fishRef = useRef<THREE.InstancedMesh>(null);
  const buildingRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const rInner = walk + 2.8;
  const rOuter = outer - 1.35;

  const { bubbles, orbs, fishSpecs, aquarium, buildings } = useMemo(() => {
    const rand = seededRand(90210);
    const bubbles: BubbleSpec[] = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const th = rand() * Math.PI * 2;
      const rad = rInner + rand() * Math.max(0.4, rOuter - rInner);
      bubbles.push({
        x: wx + Math.cos(th) * rad,
        z: wz + Math.sin(th) * rad,
        y0: TURF_TOP_Y + 0.95 + rand() * 3.8,
        ph: rand() * Math.PI * 2,
        sp: 0.5 + rand() * 0.95,
        r: 0.24 + rand() * 0.34,
      });
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

    const aquW = 4.2;
    const aquD = 3.4;
    const aquH = 2.35;
    const aquCx = wx + 17;
    const aquCz = wz - 11;
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

    const bldgLayout: {
      ox: number;
      oz: number;
      bw: number;
      bh: number;
      bd: number;
    }[] = [
      { ox: 23, oz: 13, bw: 3.8, bh: 10.5, bd: 3.4 },
      { ox: -21, oz: 15, bw: 4.4, bh: 12, bd: 3.8 },
      { ox: -18, oz: -20, bw: 3.6, bh: 9, bd: 4.2 },
      { ox: 20, oz: -17, bw: 4.8, bh: 11, bd: 3.2 },
      { ox: 8, oz: 26, bw: 3.2, bh: 8, bd: 3 },
      { ox: -11, oz: 24, bw: 3.5, bh: 9.5, bd: 3.6 },
    ];
    const buildings = bldgLayout.map((b) => ({
      x: wx + b.ox,
      z: wz + b.oz,
      w: b.bw,
      h: b.bh,
      d: b.bd,
    }));

    return { bubbles, orbs, fishSpecs, aquarium, buildings };
  }, [wx, wz, rInner, rOuter]);

  const bubbleGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const orbGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const fishGeo = useMemo(
    () => new THREE.ConeGeometry(0.14, 0.52, 5, 1, false),
    []
  );
  const buildingGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const bubbleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        toneMapped: false,
        depthWrite: false,
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
        color: "#4a9ecc",
        roughness: 0.06,
        metalness: 0.08,
        transparent: true,
        opacity: 0.9,
        emissive: "#88ccff",
        emissiveIntensity: 0.22,
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
    const bMesh = bubbleRef.current;
    const oMesh = orbRef.current;
    const fMesh = fishRef.current;
    const blMesh = buildingRef.current;
    if (!bMesh || !oMesh || !fMesh || !blMesh) return;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = bubbles[i]!;
      dummy.position.set(b.x, b.y0, b.z);
      dummy.scale.setScalar(b.r);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bMesh.setMatrixAt(i, dummy.matrix);
      color.set(BUBBLE_PALETTE[i % BUBBLE_PALETTE.length]!);
      bMesh.setColorAt(i, color);
    }
    bMesh.instanceMatrix.needsUpdate = true;
    if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;

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
  }, [bubbles, orbs, fishSpecs, buildings, dummy, color]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const bMesh = bubbleRef.current;
    const oMesh = orbRef.current;
    const fMesh = fishRef.current;
    if (!bMesh || !oMesh || !fMesh) return;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = bubbles[i]!;
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
      bMesh.setMatrixAt(i, dummy.matrix);
    }
    bMesh.instanceMatrix.needsUpdate = true;

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
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat}>
          <planeGeometry args={[aquarium.w - 0.35, aquarium.d - 0.35]} />
        </mesh>
        <mesh
          position={[0, hyLocal, -hd + wallT / 2]}
          castShadow={false}
          receiveShadow
          material={glassMat}
        >
          <boxGeometry args={[aquarium.w, aquarium.h, wallT]} />
        </mesh>
        <mesh
          position={[0, hyLocal, hd - wallT / 2]}
          castShadow={false}
          receiveShadow
          material={glassMat}
        >
          <boxGeometry args={[aquarium.w, aquarium.h, wallT]} />
        </mesh>
        <mesh
          position={[-hw + wallT / 2, hyLocal, 0]}
          castShadow={false}
          receiveShadow
          material={glassMat}
        >
          <boxGeometry args={[wallT, aquarium.h, aquarium.d]} />
        </mesh>
        <mesh
          position={[hw - wallT / 2, hyLocal, 0]}
          castShadow={false}
          receiveShadow
          material={glassMat}
        >
          <boxGeometry args={[wallT, aquarium.h, aquarium.d]} />
        </mesh>
        <mesh position={[0, wallT / 2, 0]} receiveShadow>
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

      <instancedMesh ref={bubbleRef} args={[bubbleGeo, bubbleMat, BUBBLE_COUNT]} />
      <instancedMesh ref={orbRef} args={[orbGeo, orbMat, ORB_COUNT]} />
      <instancedMesh
        ref={fishRef}
        args={[fishGeo, fishMat, FISH_COUNT]}
        renderOrder={1}
      />
    </group>
  );
}
