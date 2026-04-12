"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const BASE_HEIGHT = 2.75;
const BASE_RADIUS = 0.44;
/** Bottom disc radius — wide silhouette (see stacked-cylinder canopy). */
const CANOPY_BASE_R_MULT = 1.78;

const TRUNK_COLOR = "#4a3528";
const TRUNK_ROUGHNESS = 0.88;
const TRUNK_METALNESS = 0.05;
const BASE_TRUNK_H = 0.92;
const BASE_TRUNK_R = 0.24;

const PINE_COLOR = "#2a4d42";
const PINE_ROUGHNESS = 0.82;
const PINE_METALNESS = 0.06;

const SNOW_COLOR = "#eef6fb";
const SNOW_ROUGHNESS = 0.92;
const SNOW_METALNESS = 0.04;
const FOLIAGE_LAYER_RADIAL = 10;

/** Few chunky tiers (green + snow); each tier is a truncated cone (sloped sides). */
const GREEN_LAYER_COUNT = 3;
const SNOW_LAYER_COUNT = 2;
/** Total canopy height vs legacy cone scale. */
const CANOPY_HEIGHT_FRAC = 0.82;
const MIN_LAYER_R = 0.036;

type FoliageLayer = {
  centerY: number;
  h: number;
  /** Narrow end (+Y); wider base (-Y). */
  rTop: number;
  rBottom: number;
  snow: boolean;
};

/**
 * Snow fairway tree: brown trunk + stacked frustums (cone-like taper, few tiers),
 * top tiers snow-colored. `groundY` is the world Y of the tree base.
 */
export function SnowPineTree({
  groundY,
  seed = 0,
  raycastDisabled = false,
}: {
  groundY: number;
  seed?: number;
  raycastDisabled?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!raycastDisabled) return;
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => {};
    });
  }, [raycastDisabled]);

  const yaw = (seed % 10007) * 0.0001 * Math.PI * 2;
  const hScale = 0.94 + ((seed >>> 3) % 13) * 0.012;
  const rScale = 0.92 + ((seed >>> 7) % 11) * 0.01;
  const trunkH = BASE_TRUNK_H * (0.96 + ((seed >>> 5) % 7) * 0.012);
  const trunkR = BASE_TRUNK_R * (0.94 + ((seed >>> 9) % 5) * 0.015);
  const trunkTopY = groundY + trunkH;

  const layerCount = GREEN_LAYER_COUNT + SNOW_LAYER_COUNT;
  const canopyTotalH = BASE_HEIGHT * hScale * CANOPY_HEIGHT_FRAC;
  const hPerLayer = canopyTotalH / layerCount;
  const maxR = BASE_RADIUS * rScale * CANOPY_BASE_R_MULT;

  const radiusAt = (t: number, seg: number) =>
    Math.max(
      MIN_LAYER_R,
      maxR *
        Math.pow(1 - t, 0.58) *
        (0.97 + ((seed >>> (seg % 9)) % 5) * 0.012)
    );

  let y = trunkTopY;
  const foliageLayers: FoliageLayer[] = [];
  for (let i = 0; i < layerCount; i++) {
    const t0 = i / layerCount;
    const t1 = (i + 1) / layerCount;
    const rBottom = radiusAt(t0, i);
    const rTop = radiusAt(t1, i);
    const centerY = y + hPerLayer / 2;
    y += hPerLayer;
    foliageLayers.push({
      centerY,
      h: hPerLayer,
      rTop,
      rBottom,
      snow: i >= GREEN_LAYER_COUNT,
    });
  }

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      <mesh
        castShadow
        receiveShadow
        position={[0, groundY + trunkH / 2, 0]}
      >
        <cylinderGeometry args={[trunkR, trunkR, trunkH, 8]} />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          roughness={TRUNK_ROUGHNESS}
          metalness={TRUNK_METALNESS}
        />
      </mesh>
      {foliageLayers.map((layer, i) => (
        <mesh
          key={`foliage-${i}`}
          castShadow
          receiveShadow
          position={[0, layer.centerY, 0]}
        >
          <cylinderGeometry
            args={[
              layer.rTop,
              layer.rBottom,
              layer.h,
              FOLIAGE_LAYER_RADIAL,
            ]}
          />
          <meshStandardMaterial
            color={layer.snow ? SNOW_COLOR : PINE_COLOR}
            roughness={layer.snow ? SNOW_ROUGHNESS : PINE_ROUGHNESS}
            metalness={layer.snow ? SNOW_METALNESS : PINE_METALNESS}
          />
        </mesh>
      ))}
    </group>
  );
}
