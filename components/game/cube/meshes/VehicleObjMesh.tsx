"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

import { BLOCK_SIZE } from "@/lib/game/constants";

import { ObjMtlLoader } from "./ObjMtlLoader";

function dullImportedMaterials(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhysicalMaterial
      ) {
        mat.roughness = Math.max(mat.roughness, 0.78);
        mat.metalness = Math.min(mat.metalness, 0.04);
        mat.envMapIntensity = 0;
      } else if (mat instanceof THREE.MeshPhongMaterial) {
        mat.shininess = 12;
        mat.specular.multiplyScalar(0.35);
      }
      mat.needsUpdate = true;
    }
  });
}

/**
 * Textured OBJ hull: scaled larger than the default primitive hull so it reads
 * clearly over the fixed-size corner blocks; bottom aligned with the spawn block.
 */
export function VehicleObjMesh({
  url,
  yawOffsetRad = 0,
}: {
  url: string;
  /** Extra Y rotation after fit (e.g. aim barrel toward +Z). */
  yawOffsetRad?: number;
}) {
  const loaded = useLoader(ObjMtlLoader, url) as THREE.Object3D;
  const clone = useMemo(() => loaded.clone(true), [loaded]);

  useLayoutEffect(() => {
    clone.rotation.set(0, 0, 0);
    clone.position.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);

    clone.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(clone);
    const size = box2.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
    /** Normalized max dimension in world units (vs. `VEHICLE_CORNER_BLOCK_SIZE` wheels). */
    const target = 1.7;
    const s = target / maxDim;
    clone.scale.setScalar(s);

    clone.updateMatrixWorld(true);
    const box3 = new THREE.Box3().setFromObject(clone);
    const floorY = -BLOCK_SIZE / 2;
    clone.position.y += floorY - box3.min.y;

    clone.rotation.y = yawOffsetRad;

    dullImportedMaterials(clone);
  }, [clone, yawOffsetRad]);

  return <primitive object={clone} />;
}
