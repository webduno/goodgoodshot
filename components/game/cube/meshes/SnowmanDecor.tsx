"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

const SNOW = "#f2f7fb";
const SNOW_ROUGH = 0.9;
const SNOW_METAL = 0.03;
const CARROT = "#e86a2c";
const COAL = "#1a1e24";

const R0 = 0.24;
const R1 = 0.18;
const R2 = 0.13;
/** Few segments = blocky / low-poly spheres. */
const SPHERE_SEG = 6;
const EYE_SEG = 5;
const EYE_WHITE_R = 0.044;
const PUPIL_R = 0.026;
const BUTTON_R = 0.038;
/** Top hat (brim + crown), low-poly cylinders. */
const HAT_BRIM_R = 0.16;
const HAT_BRIM_H = 0.022;
const HAT_CROWN_R = 0.105;
const HAT_CROWN_H = 0.14;
const HAT_SEG = 8;

/**
 * Three stacked snow spheres, carrot nose, white+coal eyes, coal torso buttons, top hat. Visual-only (raycast off).
 */
export function SnowmanDecor({
  worldX,
  worldZ,
  yaw,
  seed,
  groundY = TURF_TOP_Y,
}: {
  worldX: number;
  worldZ: number;
  yaw: number;
  seed: number;
  /** Base Y for the snowman (sphere bottoms rest on this plane). */
  groundY?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => {};
    });
  }, []);

  const y0 = groundY;
  const y1 = R0;
  const y2 = 2 * R0 + R1;
  const y3 = 2 * R0 + 2 * R1 + R2;
  const eyeJ = 0.02 + (seed % 5) * 0.004;
  const ex = R2 * 0.4;
  const yEye = y3 + R2 * 0.1;
  const zEyeWhite = R2 * 0.44;
  const zPupil = R2 * 0.56;
  /** Middle-sphere button: on surface in +Z (local), x=0. */
  const buttonDy = (f: number) => {
    const dy = f * R1;
    const z = Math.sqrt(Math.max(0, R1 * R1 - dy * dy));
    return { y: y2 + dy, z };
  };

  const headCenterY = y3 - 0.1;
  const headTopY = headCenterY + R2;
  const hatBrimY = headTopY*.98 + HAT_BRIM_H / 2;
  const hatCrownY = headTopY*.98 + HAT_BRIM_H + HAT_CROWN_H / 2;

  return (
    <group ref={groupRef} position={[worldX, y0, worldZ]} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, y1, 0]}>
        <sphereGeometry args={[R0, SPHERE_SEG, SPHERE_SEG]} />
        <meshStandardMaterial
          color={SNOW}
          roughness={SNOW_ROUGH}
          metalness={SNOW_METAL}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, y2-.1, 0]}>
        <sphereGeometry args={[R1, SPHERE_SEG, SPHERE_SEG]} />
        <meshStandardMaterial
          color={SNOW}
          roughness={SNOW_ROUGH}
          metalness={SNOW_METAL}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, y3-.1, 0]}>
        <sphereGeometry args={[R2*1.2, SPHERE_SEG, SPHERE_SEG]} />
        <meshStandardMaterial
          color={SNOW}
          roughness={SNOW_ROUGH}
          metalness={SNOW_METAL}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, hatBrimY, 0]}>
        <cylinderGeometry
          args={[HAT_BRIM_R, HAT_BRIM_R, HAT_BRIM_H, HAT_SEG]}
        />
        <meshStandardMaterial
          color={COAL}
          roughness={0.72}
          metalness={0.1}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, hatCrownY, 0]}>
        <cylinderGeometry
          args={[HAT_CROWN_R, HAT_CROWN_R, HAT_CROWN_H, HAT_SEG]}
        />
        <meshStandardMaterial
          color={COAL}
          roughness={0.72}
          metalness={0.1}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, y3-.1, R2 * 0.78]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.058, 0.2, 6]} />
        <meshStandardMaterial
          color={CARROT}
          roughness={0.72}
          metalness={0.06}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[-ex + eyeJ, yEye-.05, zEyeWhite+.05]}>
        <sphereGeometry args={[EYE_WHITE_R, EYE_SEG, EYE_SEG]} />
        <meshStandardMaterial color={SNOW} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh castShadow receiveShadow position={[-ex + eyeJ, yEye-.05, zPupil+.05]}>
        <sphereGeometry args={[PUPIL_R, EYE_SEG, EYE_SEG]} />
        <meshStandardMaterial color={COAL} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh castShadow receiveShadow position={[ex - eyeJ, yEye-.05, zEyeWhite+.05]}>
        <sphereGeometry args={[EYE_WHITE_R, EYE_SEG, EYE_SEG]} />
        <meshStandardMaterial color={SNOW} roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh castShadow receiveShadow position={[ex - eyeJ, yEye-.05, zPupil+.05]}>
        <sphereGeometry args={[PUPIL_R, EYE_SEG, EYE_SEG]} />
        <meshStandardMaterial color={COAL} roughness={0.85} metalness={0.05} />
      </mesh>
      {[0.42, 0, -0.42].map((f, i) => {
        const { y: by, z: bz } = buttonDy(f);
        return (
          <mesh
            key={`btn-${i}`}
            castShadow
            receiveShadow
            position={[0, by-.1, bz]}
          >
            <sphereGeometry args={[BUTTON_R, EYE_SEG, EYE_SEG]} />
            <meshStandardMaterial color={COAL} roughness={0.85} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
}
