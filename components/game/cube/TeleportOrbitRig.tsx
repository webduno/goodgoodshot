"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  CAMERA_OFFSET_FROM_SPAWN,
  FOLLOW_BALL_CAMERA_OFFSET,
  INTRO_CAMERA_DURATION_SEC,
  INTRO_CAMERA_OFFSET_FROM_SPAWN,
  ORBIT_TARGET_Y_OFFSET,
  TELEPORT_DURATION_SEC,
  TURF_TOP_Y,
} from "@/lib/game/constants";
import { sameVec3 } from "@/lib/game/math";
import type { Vec3 } from "@/lib/game/types";

const VisualSpawnContext = createContext<MutableRefObject<THREE.Vector3> | null>(
  null
);

/** Keep orbit camera above the visible grass plane (`InitialFieldGround` top). */
const ORBIT_MIN_Y = TURF_TOP_Y + 0.22;

function clampCameraAboveGround(
  cam: THREE.Camera,
  target: THREE.Vector3
) {
  if (cam.position.y < ORBIT_MIN_Y) {
    cam.position.y = ORBIT_MIN_Y;
    cam.lookAt(target);
  }
}

export function SpawnVisualGroup({ children }: { children: ReactNode }) {
  const visualRef = useContext(VisualSpawnContext);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (!g || !visualRef) return;
    const v = visualRef.current;
    g.position.set(v.x, v.y, v.z);
  });
  return <group ref={groupRef}>{children}</group>;
}

export type BallFollowStateRef = MutableRefObject<{
  pos: THREE.Vector3;
  valid: boolean;
}>;

export function TeleportOrbitRig({
  gameSpawn,
  children,
  followBallActive = false,
  ballFollowStateRef,
}: {
  gameSpawn: Vec3;
  children: ReactNode;
  /** When true with valid ball position, orbit is disabled and the camera uses a fixed offset from the ball. */
  followBallActive?: boolean;
  ballFollowStateRef?: BallFollowStateRef;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const visualRef = useRef(
    new THREE.Vector3(gameSpawn[0], gameSpawn[1], gameSpawn[2])
  );
  const fromRef = useRef(new THREE.Vector3());
  const toRef = useRef(new THREE.Vector3());
  const progressRef = useRef(0);
  const transitioningRef = useRef(false);
  const prevGameRef = useRef<Vec3 | null>(null);
  const camStartRef = useRef(new THREE.Vector3());
  const tgtStartRef = useRef(new THREE.Vector3());
  const deltaVRef = useRef(new THREE.Vector3());
  const introDoneRef = useRef(false);
  const introProgressRef = useRef(0);
  const followBallWasActiveRef = useRef(false);
  /** True while follow-ball mode is actively tracking a projectile (cleared when ball ends or follow toggles off). */
  const followBallWasTrackingRef = useRef(false);

  useLayoutEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.22;
    controls.minDistance = 2.1;
    controls.maxDistance = 120;
    controls.enablePan = false;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const prev = prevGameRef.current;
    if (prev === null) {
      const sx = gameSpawn[0];
      const sy = gameSpawn[1];
      const sz = gameSpawn[2];
      camera.position.set(
        sx + INTRO_CAMERA_OFFSET_FROM_SPAWN[0],
        sy + INTRO_CAMERA_OFFSET_FROM_SPAWN[1],
        sz + INTRO_CAMERA_OFFSET_FROM_SPAWN[2]
      );
      controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
      visualRef.current.set(sx, sy, sz);
      introProgressRef.current = 0;
      introDoneRef.current = false;
      controls.enabled = false;
      controls.update();
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      prevGameRef.current = [sx, sy, sz];
      return;
    }
    if (sameVec3(prev, gameSpawn)) return;
    introDoneRef.current = true;
    fromRef.current.copy(visualRef.current);
    toRef.current.set(gameSpawn[0], gameSpawn[1], gameSpawn[2]);
    progressRef.current = 0;
    transitioningRef.current = true;
    camStartRef.current.copy(camera.position);
    tgtStartRef.current.copy(controls.target);
    deltaVRef.current.subVectors(toRef.current, fromRef.current);
    controls.enabled = false;
    prevGameRef.current = [...gameSpawn];
  }, [camera, gameSpawn]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (followBallWasActiveRef.current && !followBallActive) {
      const sx = gameSpawn[0];
      const sy = gameSpawn[1];
      const sz = gameSpawn[2];
      camera.position.set(
        sx + CAMERA_OFFSET_FROM_SPAWN[0],
        sy + CAMERA_OFFSET_FROM_SPAWN[1],
        sz + CAMERA_OFFSET_FROM_SPAWN[2]
      );
      controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
      controls.enabled = true;
      controls.update();
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    }
    followBallWasActiveRef.current = followBallActive;
  }, [followBallActive, gameSpawn, camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const ballState = ballFollowStateRef?.current;
    const ballValid = !!(ballState?.valid);

    if (!followBallActive) {
      followBallWasTrackingRef.current = false;
    }

    if (
      followBallActive &&
      ballState &&
      ballValid &&
      introDoneRef.current &&
      !transitioningRef.current
    ) {
      followBallWasTrackingRef.current = true;
      const b = ballState.pos;
      const ox = FOLLOW_BALL_CAMERA_OFFSET[0];
      const oy = FOLLOW_BALL_CAMERA_OFFSET[1];
      const oz = FOLLOW_BALL_CAMERA_OFFSET[2];
      controls.enabled = false;
      camera.position.set(b.x + ox, b.y + oy, b.z + oz);
      controls.target.set(b.x, b.y, b.z);
      camera.lookAt(controls.target);
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      return;
    }

    if (
      followBallActive &&
      followBallWasTrackingRef.current &&
      !ballValid &&
      introDoneRef.current &&
      !transitioningRef.current
    ) {
      followBallWasTrackingRef.current = false;
      const sx = gameSpawn[0];
      const sy = gameSpawn[1];
      const sz = gameSpawn[2];
      controls.enabled = true;
      camera.position.set(
        sx + CAMERA_OFFSET_FROM_SPAWN[0],
        sy + CAMERA_OFFSET_FROM_SPAWN[1],
        sz + CAMERA_OFFSET_FROM_SPAWN[2]
      );
      controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
      controls.update();
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      return;
    }

    if (transitioningRef.current) {
      progressRef.current += delta;
      const t = Math.min(1, progressRef.current / TELEPORT_DURATION_SEC);
      visualRef.current.lerpVectors(fromRef.current, toRef.current, t);
      deltaVRef.current.subVectors(toRef.current, fromRef.current);
      camera.position.copy(camStartRef.current).addScaledVector(deltaVRef.current, t);
      controls.target
        .copy(tgtStartRef.current)
        .addScaledVector(deltaVRef.current, t);
      controls.update();
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (t >= 1) {
        transitioningRef.current = false;
        visualRef.current.copy(toRef.current);
        controls.enabled = true;
        controls.update();
        clampCameraAboveGround(camera, controls.target);
      }
    } else if (!introDoneRef.current) {
      introProgressRef.current += delta;
      const introDur = Math.max(INTRO_CAMERA_DURATION_SEC, 1e-6);
      const rawT = Math.min(1, introProgressRef.current / introDur);
      const t = rawT * rawT * (3 - 2 * rawT);
      const sx = gameSpawn[0];
      const sy = gameSpawn[1];
      const sz = gameSpawn[2];
      const i0 = INTRO_CAMERA_OFFSET_FROM_SPAWN;
      const i1 = CAMERA_OFFSET_FROM_SPAWN;
      camera.position.set(
        sx + i0[0] + (i1[0] - i0[0]) * t,
        sy + i0[1] + (i1[1] - i0[1]) * t,
        sz + i0[2] + (i1[2] - i0[2]) * t
      );
      controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
      controls.update();
      clampCameraAboveGround(camera, controls.target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (rawT >= 1) {
        introDoneRef.current = true;
        controls.enabled = true;
        controls.update();
        clampCameraAboveGround(camera, controls.target);
      }
    } else {
      controls.update();
      clampCameraAboveGround(camera, controls.target);
    }
  });

  return (
    <VisualSpawnContext.Provider value={visualRef}>
      {children}
    </VisualSpawnContext.Provider>
  );
}
