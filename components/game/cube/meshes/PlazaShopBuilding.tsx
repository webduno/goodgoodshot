"use client";

import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import {
  PLAZA_SHOP_WORLD_X,
  PLAZA_SHOP_WORLD_Z,
} from "@/lib/shop/plazaShopConstants";

const BASE_W = 4.2;
const BASE_D = 3.4;
const WALL_H = 2.35;
const SIGN_W = 3.6;
const SIGN_H = 0.72;
const SIGN_Y = WALL_H + 0.55;

/** Match `PlazaHubRoads` so the connector reads as the same pavement. */
const SHOP_ROAD_WIDTH = 5;
const SHOP_ROAD_THICKNESS = 0.04;
const SHOP_ROAD_CLEARANCE = 0.012;
const SHOP_ROAD_COLOR = "#c4ccd6";
/** North hub road centerline Z (see `ROAD_CENTER_OFFSET` in PlazaHubRoads). */
const PLAZA_NORTH_ROAD_Z = 28;
/**
 * Connector from the north ring road toward the shop (world XZ).
 * Lateral offset in +X: storefront faces +X (local +Z, group rot Y=π/2); −X was behind the building.
 */
const SHOP_ROAD_Z_START = PLAZA_NORTH_ROAD_Z - SHOP_ROAD_WIDTH / 2;
/** Ends near shop center Z — alongside the flank, not centered on the door. */
const SHOP_ROAD_Z_END = PLAZA_SHOP_WORLD_Z + 0.35;
/** World-X shift (east of shop center, toward the front façade) so the strip sits beside the entrance side. */
const SHOP_ROAD_X_OFFSET = BASE_D / 2 + SHOP_ROAD_WIDTH / 2 + 0.45;

/**
 * Low storefront on the plaza ring — larger than decor houses, with a SHOP sign (pointer opens modal).
 */
export function PlazaShopBuilding({
  onPointerDownOpen,
}: {
  onPointerDownOpen: () => void;
}) {
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffe066",
        roughness: 0.42,
        metalness: 0.08,
      }),
    []
  );
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#94a3b8",
        roughness: 0.5,
        metalness: 0.12,
      }),
    []
  );
  const awningMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fb7185",
        roughness: 0.45,
        metalness: 0.06,
      }),
    []
  );

  const wx = PLAZA_SHOP_WORLD_X;
  const wz = PLAZA_SHOP_WORLD_Z;
  const floorY = TURF_TOP_Y + 0.02;
  const baseCenterY = floorY + 0.14;
  const bodyCenterY = baseCenterY + 0.14 + WALL_H / 2;

  const shopRoadY = TURF_TOP_Y + SHOP_ROAD_CLEARANCE + SHOP_ROAD_THICKNESS / 2;
  const shopRoadSpanZ = SHOP_ROAD_Z_START - SHOP_ROAD_Z_END;
  const shopRoadCenterZ = (SHOP_ROAD_Z_START + SHOP_ROAD_Z_END) / 2;
  const shopRoadCenterX = wx + SHOP_ROAD_X_OFFSET;

  return (
    <>
      <group position={[wx, 0, wz]} rotation={[0, Math.PI / 2, 0]}>
        <mesh
          position={[0, baseCenterY, 0]}
          receiveShadow
          castShadow
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDownOpen();
          }}
        >
          <boxGeometry args={[BASE_W + 0.6, 0.28, BASE_D + 0.5]} />
          <meshStandardMaterial color="#64748b" roughness={0.55} metalness={0.18} />
        </mesh>
        <mesh
          position={[0, bodyCenterY, 0]}
          castShadow
          receiveShadow
          material={bodyMat}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDownOpen();
          }}
        >
          <boxGeometry args={[BASE_W, WALL_H, BASE_D]} />
        </mesh>
        <mesh
          position={[0, bodyCenterY + WALL_H * 0.08, BASE_D / 2 + 0.02]}
          castShadow
          material={awningMat}
        >
          <boxGeometry args={[BASE_W * 1.02, 0.22, 0.42]} />
        </mesh>
        <mesh position={[-BASE_W * 0.28, bodyCenterY - 0.15, BASE_D / 2 + 0.03]} castShadow material={trimMat}>
          <boxGeometry args={[0.85, 1.1, 0.08]} />
        </mesh>
        <mesh position={[BASE_W * 0.22, bodyCenterY - 0.05, BASE_D / 2 + 0.03]} castShadow material={trimMat}>
          <boxGeometry args={[1.25, 1.25, 0.08]} />
        </mesh>
        <group
          position={[0, bodyCenterY + SIGN_Y, BASE_D / 2 + 0.12]}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDownOpen();
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[SIGN_W + 0.24, SIGN_H + 0.16, 0.2]} />
            <meshStandardMaterial color="#facc15" roughness={0.35} metalness={0.14} />
          </mesh>
          <Text
            position={[0, 0, 0.11]}
            fontSize={0.44}
            letterSpacing={0.06}
            color="#1e293b"
            anchorX="center"
            anchorY="middle"
          >
            SHOP
          </Text>
        </group>
      </group>
      <mesh
        position={[shopRoadCenterX, shopRoadY, shopRoadCenterZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[SHOP_ROAD_WIDTH, SHOP_ROAD_THICKNESS, shopRoadSpanZ*3]} />
        <meshStandardMaterial
          color={SHOP_ROAD_COLOR}
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
    </>
  );
}
