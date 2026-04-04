"use client";

import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { MID_GOAL_Z } from "@/lib/game/constants";

/**
 * Two world-fixed key lights (spawn and goal regions). They do not follow `spawnCenter` or the camera.
 * Shadow cameras are sized to cover the initial field plane.
 */
export function StaticSceneLights() {
  const { scene } = useThree();
  const spawnLightRef = useRef<THREE.DirectionalLight>(null);
  const goalLightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const configureShadow = (light: THREE.DirectionalLight) => {
      const cam = light.shadow.camera as THREE.OrthographicCamera;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.bias = -0.00008;
      light.shadow.normalBias = 0.025;
      cam.near = 0.5;
      cam.far = 480;
      cam.left = -90;
      cam.right = 90;
      cam.top = 90;
      cam.bottom = -90;
      cam.updateProjectionMatrix();
    };
    const spawn = spawnLightRef.current;
    const goal = goalLightRef.current;
    if (spawn) configureShadow(spawn);
    if (goal) configureShadow(goal);
  }, []);

  useLayoutEffect(() => {
    const spawn = spawnLightRef.current;
    const goal = goalLightRef.current;
    if (spawn) {
      if (spawn.target.parent !== scene) scene.add(spawn.target);
      spawn.target.position.set(0, 0, 0);
    }
    if (goal) {
      if (goal.target.parent !== scene) scene.add(goal.target);
      goal.target.position.set(0, 0, MID_GOAL_Z);
    }
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.42} />
      <hemisphereLight
        color="#bfe8ff"
        groundColor="#4a9d52"
        intensity={0.32}
      />
      <directionalLight
        ref={spawnLightRef}
        position={[-12, 30, -16]}
        intensity={0.72}
        castShadow
      />
      <directionalLight
        ref={goalLightRef}
        position={[14, 38, MID_GOAL_Z + 42]}
        intensity={0.62}
        castShadow
      />
    </>
  );
}
