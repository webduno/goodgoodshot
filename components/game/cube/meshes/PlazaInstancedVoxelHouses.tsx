"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type PlazaVoxelHouseSpec = {
  lx: number;
  lz: number;
  floorY: number;
  wallHex: string;
  roofHex: string;
  bodyW: number;
  bodyD: number;
  bodyH: number;
};

/**
 * Two instanced box meshes (body + roof) replace many individual `mesh` nodes for the plaza ring.
 */
export function PlazaInstancedVoxelHouses({
  houses,
}: {
  houses: readonly PlazaVoxelHouseSpec[];
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const roofGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.38,
        metalness: 0.12,
        vertexColors: true,
        emissive: "#e8eef4",
        emissiveIntensity: 0.04,
      }),
    []
  );
  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.42,
        metalness: 0.14,
        vertexColors: true,
        emissive: "#f0e8e4",
        emissiveIntensity: 0.035,
      }),
    []
  );

  const n = houses.length;
  useLayoutEffect(() => {
    const bodyMesh = bodyRef.current;
    const roofMesh = roofRef.current;
    if (!bodyMesh || !roofMesh || n === 0) return;

    for (let i = 0; i < n; i++) {
      const h = houses[i]!;
      const roofH = Math.min(0.55, h.bodyH * 0.38);

      dummy.position.set(h.lx, h.floorY + h.bodyH / 2, h.lz);
      dummy.scale.set(h.bodyW, h.bodyH, h.bodyD);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      tmpColor.set(h.wallHex);
      bodyMesh.setColorAt(i, tmpColor);

      dummy.position.set(h.lx, h.floorY + h.bodyH + roofH / 2, h.lz);
      dummy.scale.set(h.bodyW * 1.06, roofH, h.bodyD * 1.06);
      dummy.updateMatrix();
      roofMesh.setMatrixAt(i, dummy.matrix);
      tmpColor.set(h.roofHex);
      roofMesh.setColorAt(i, tmpColor);
    }

    bodyMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
    if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
  }, [houses, n, dummy, tmpColor]);

  if (n === 0) return null;

  return (
    <>
      <instancedMesh
        ref={bodyRef}
        args={[bodyGeo, bodyMat, n]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={roofRef}
        args={[roofGeo, roofMat, n]}
        castShadow
        receiveShadow
      />
    </>
  );
}
