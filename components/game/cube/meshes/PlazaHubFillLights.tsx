"use client";

/**
 * Extra fill for the plaza hub only — stacked with `StaticSceneLights`.
 * Keeps porcelain / water / glass reads bright without changing golf-course scenes.
 */
export function PlazaHubFillLights() {
  return (
    <>
      <ambientLight intensity={0.28} color="#f4fbff" />
      <hemisphereLight
        color="#e8f8ff"
        groundColor="#b8e8c8"
        intensity={0.38}
      />
      <directionalLight
        position={[-48, 62, 36]}
        intensity={0.55}
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight
        position={[36, 44, -52]}
        intensity={0.35}
        color="#d8f0ff"
        castShadow={false}
      />
      <pointLight
        position={[0, 38, 0]}
        intensity={0.45}
        distance={140}
        decay={2}
        color="#fffaf0"
      />
    </>
  );
}
