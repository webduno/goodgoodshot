"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { BallFollowStateRef } from "@/components/game/cube/TeleportOrbitRig";
import { PLAZA_WAR_PORTAL_BATTLE_COUNT, TURF_TOP_Y } from "@/lib/game/constants";
import { PLAZA_WALKABLE_HALF } from "@/lib/game/plazaHub";

/** Major radius, tube radius — match `torusGeometry` args for trigger bounds. */
const PORTAL_MAJOR_R = 3;
const PORTAL_TUBE_R = 0.42;
/** Tiny lift so the mesh does not z-fight with the island slab. */
const TURF_CLEARANCE = 0.018;
/** Sign panel above the arch (world Y is computed from torus bounds). */
const SIGN_WIDTH = 8.2;
const SIGN_HEIGHT = 1.56;
const SIGN_DEPTH = 0.22;
const SIGN_GAP_ABOVE_ARCH = 0.36;

/**
 * Three.js `TorusGeometry` puts the major circle in the **XY** plane (Y up) — a vertical wall, not the
 * ground plane. Do **not** rotate π/2 around X; that maps XY → XZ and lays the torus flat on the turf.
 * Y position is derived from `boundingBox.min.y` so the lowest point rests on `TURF_TOP_Y`.
 */

/**
 * Half-torus portal mesh; when the ball’s world position enters the mesh AABB while in flight,
 * `onBallEnter` runs once per shot.
 */
export function PlazaPortalTorus({
  worldX,
  worldZ,
  rotationY = 0,
  label,
  ballFollowStateRef,
  shotInFlight,
  onBallEnter,
}: {
  worldX: number;
  worldZ: number;
  rotationY?: number;
  label: string;
  ballFollowStateRef: BallFollowStateRef;
  shotInFlight: boolean;
  onBallEnter: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const box = useMemo(() => new THREE.Box3(), []);
  const firedThisShotRef = useRef(false);

  const portalGeometry = useMemo(() => {
    const g = new THREE.TorusGeometry(
      PORTAL_MAJOR_R,
      PORTAL_TUBE_R,
      28,
      56,
      Math.PI
    );
    g.computeBoundingBox();
    return g;
  }, []);

  const portalY = useMemo(() => {
    const bb = portalGeometry.boundingBox;
    if (!bb) return TURF_TOP_Y;
    return TURF_TOP_Y - bb.min.y + TURF_CLEARANCE;
  }, [portalGeometry]);

  const portalTopLocalY = useMemo(() => {
    const bb = portalGeometry.boundingBox;
    if (!bb) return PORTAL_MAJOR_R + PORTAL_TUBE_R;
    return bb.max.y;
  }, [portalGeometry]);

  const signCenterY =
    portalY + portalTopLocalY + SIGN_GAP_ABOVE_ARCH + SIGN_HEIGHT / 2;

  const signMeshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const noop = () => {};
    const s = signMeshRef.current;
    if (s) s.raycast = noop;
  }, []);

  useEffect(() => {
    return () => {
      portalGeometry.dispose();
    };
  }, [portalGeometry]);

  useFrame(() => {
    if (!shotInFlight) {
      firedThisShotRef.current = false;
      return;
    }
    const mesh = meshRef.current;
    if (!mesh || !ballFollowStateRef.current.valid) return;
    box.setFromObject(mesh);
    const p = ballFollowStateRef.current.pos;
    if (box.containsPoint(p)) {
      if (!firedThisShotRef.current) {
        firedThisShotRef.current = true;
        onBallEnter();
      }
    }
  });

  return (
    <group position={[worldX, 0, worldZ]} rotation={[0, rotationY, 0]}>
      <mesh ref={meshRef} position={[0, portalY, 0]} castShadow receiveShadow>
        <primitive object={portalGeometry} attach="geometry" />
        <meshStandardMaterial
          color="#a8e6ff"
          emissive="#00aeef"
          emissiveIntensity={0.38}
          roughness={0.42}
          metalness={0.28}
        />
      </mesh>
      <group position={[0, signCenterY, 0]}>
        <mesh ref={signMeshRef} castShadow receiveShadow>
          <boxGeometry args={[SIGN_WIDTH, SIGN_HEIGHT, SIGN_DEPTH]} />
          <meshStandardMaterial
            color="#e8f8ff"
            emissive="#7dd3fc"
            emissiveIntensity={0.12}
            roughness={0.55}
            metalness={0.12}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <Text
          position={[0, 0, SIGN_DEPTH / 2 + 0.032]}
          fontSize={0.68}
          fontWeight={700}
          color="#063954"
          anchorX="center"
          anchorY="middle"
          maxWidth={SIGN_WIDTH - 0.7}
        >
          {label}
        </Text>
        <Text
          position={[0, 0, -(SIGN_DEPTH / 2 + 0.032)]}
          rotation={[0, Math.PI, 0]}
          fontSize={0.68}
          fontWeight={700}
          color="#063954"
          anchorX="center"
          anchorY="middle"
          maxWidth={SIGN_WIDTH - 0.7}
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

/** Default north-edge war portal (same label + behavior as before `PlazaPortalTorus`). */
export function PlazaWarPortalTorus({
  ballFollowStateRef,
  shotInFlight,
  onBallEnter,
}: {
  ballFollowStateRef: BallFollowStateRef;
  shotInFlight: boolean;
  onBallEnter: () => void;
}) {
  const signLabel = `${PLAZA_WAR_PORTAL_BATTLE_COUNT} Battle War`;
  return (
    <PlazaPortalTorus
      worldX={0}
      worldZ={PLAZA_WALKABLE_HALF}
      rotationY={0}
      label={signLabel}
      ballFollowStateRef={ballFollowStateRef}
      shotInFlight={shotInFlight}
      onBallEnter={onBallEnter}
    />
  );
}
