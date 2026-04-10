"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { POWERUP_WORLD_RGB } from "@/components/gameHudStyles";

const PARTICLE_COUNT = 20;
const BURST_SEC = 0.38;

export type VehiclePowerupBurstSlot = keyof typeof POWERUP_WORLD_RGB;

/**
 * Short radial burst on the vehicle; single `THREE.Points`, positions updated in `useFrame`.
 */
export function VehiclePowerupBurst({
  burstSeq,
  slot,
}: {
  /** Increment to replay; 0 = never fired (hidden). */
  burstSeq: number;
  slot: VehiclePowerupBurstSlot;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const lifeRef = useRef(1);
  const originRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  const velRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.065,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    []
  );

  useLayoutEffect(() => {
    if (burstSeq <= 0) {
      lifeRef.current = 1;
      material.opacity = 0;
      if (pointsRef.current) pointsRef.current.visible = false;
      return;
    }

    const rgb = POWERUP_WORLD_RGB[slot];
    material.color.setRGB(rgb[0], rgb[1], rgb[2]);
    material.opacity = 1;

    const origin = originRef.current;
    const vel = velRef.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      origin[i3] = (Math.random() - 0.5) * 0.07;
      origin[i3 + 1] = 0.22 + Math.random() * 0.18;
      origin[i3 + 2] = (Math.random() - 0.5) * 0.07;

      const th = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const sp = 0.5 + Math.random() * 0.55;
      vel[i3] = Math.cos(th) * s * sp;
      vel[i3 + 1] = (0.32 + Math.random() * 0.45) * sp;
      vel[i3 + 2] = Math.sin(th) * s * sp;
    }

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    pos.array.set(origin);
    pos.needsUpdate = true;

    lifeRef.current = 0;
    if (pointsRef.current) pointsRef.current.visible = true;
  }, [burstSeq, slot, geometry, material]);

  useFrame((_, dt) => {
    const life = lifeRef.current;
    if (life >= 1) {
      if (pointsRef.current?.visible) {
        pointsRef.current.visible = false;
        material.opacity = 0;
      }
      return;
    }

    lifeRef.current = Math.min(1, life + dt / BURST_SEC);
    const t = lifeRef.current;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const out = posAttr.array as Float32Array;
    const origin = originRef.current;
    const vel = velRef.current;
    const drag = 1 - t * 0.35;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      out[i3] = origin[i3]! + vel[i3]! * t * drag;
      out[i3 + 1] =
        origin[i3 + 1]! + vel[i3 + 1]! * t * drag - 0.15 * t * t;
      out[i3 + 2] = origin[i3 + 2]! + vel[i3 + 2]! * t * drag;
    }
    posAttr.needsUpdate = true;
    material.opacity = Math.max(0, 1 - t);
  });

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  );
}
