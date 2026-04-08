"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

import {
  BLOCKY_TREE_LEAF,
  BLOCKY_TREE_LEAF_COLORS,
  BLOCKY_TREE_LEAVES,
  BLOCKY_TREE_TRUNK_COLOR,
  BLOCKY_TREE_TRUNK_D,
  BLOCKY_TREE_TRUNK_H,
  BLOCKY_TREE_TRUNK_W,
} from "./blockyTreeShared";

/** Matches `IslandTrees` wrapper scale for fairway trees. */
const ISLAND_TREE_XZ_SCALE = 0.68;

const _base = new THREE.Matrix4();
const _tmp = new THREE.Matrix4();
const _leafLocal = new THREE.Matrix4();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3(1, 1, 1);

/**
 * Plain-biome experiment: one draw call per primitive type (trunk + six leaf materials)
 * instead of 7×N separate meshes. Visuals match `BlockyTree` + `IslandTrees` transforms.
 */
export function InstancedBlockyTrees({
  islands,
}: {
  islands: readonly IslandRect[];
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leafRefs = useRef<(THREE.InstancedMesh | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);

  const instances = useMemo(() => {
    const out: { wx: number; wz: number; seed: number }[] = [];
    islands.forEach((is, ii) => {
      is.trees.forEach((t, ti) => {
        out.push({
          wx: is.worldX + t.ox,
          wz: is.worldZ + t.oz,
          seed: ii * 7919 + ti * 4999 + Math.round(t.ox * 1e3),
        });
      });
    });
    return out;
  }, [islands]);

  const count = instances.length;

  const trunkGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        BLOCKY_TREE_TRUNK_W,
        BLOCKY_TREE_TRUNK_H,
        BLOCKY_TREE_TRUNK_D
      ),
    []
  );

  const leafGeo = useMemo(
    () =>
      new THREE.BoxGeometry(
        BLOCKY_TREE_LEAF,
        BLOCKY_TREE_LEAF,
        BLOCKY_TREE_LEAF
      ),
    []
  );

  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BLOCKY_TREE_TRUNK_COLOR,
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );

  const leafMats = useMemo(
    () =>
      BLOCKY_TREE_LEAF_COLORS.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.78,
            metalness: 0.04,
          })
      ),
    []
  );

  useLayoutEffect(() => {
    if (count === 0) return;

    const trunkMesh = trunkRef.current;
    const s = ISLAND_TREE_XZ_SCALE;
    const gy = TURF_TOP_Y;

    for (let i = 0; i < count; i++) {
      const { wx, wz, seed } = instances[i]!;
      const yaw = (seed % 10007) * 0.0001 * Math.PI * 2;

      _base.identity();
      _base.makeTranslation(wx, 0, wz);
      _base.multiply(_tmp.makeScale(s, 1, s));
      _base.multiply(_tmp.makeRotationY(yaw));
      _base.multiply(_tmp.makeTranslation(0, gy + BLOCKY_TREE_TRUNK_H / 2, 0));
      trunkMesh?.setMatrixAt(i, _base);

      _base.identity();
      _base.makeTranslation(wx, 0, wz);
      _base.multiply(_tmp.makeScale(s, 1, s));
      _base.multiply(_tmp.makeRotationY(yaw));
      _base.multiply(_tmp.makeTranslation(0, gy + BLOCKY_TREE_TRUNK_H, 0));

      for (let li = 0; li < BLOCKY_TREE_LEAVES.length; li++) {
        const leaf = BLOCKY_TREE_LEAVES[li]!;
        _euler.set(leaf.rot[0], leaf.rot[1], leaf.rot[2], "XYZ");
        _quat.setFromEuler(_euler);
        _pos.set(leaf.pos[0], leaf.pos[1], leaf.pos[2]);
        _scl.set(1, 1, 1);
        _leafLocal.compose(_pos, _quat, _scl);
        _tmp.copy(_base).multiply(_leafLocal);
        leafRefs.current[li]?.setMatrixAt(i, _tmp);
      }
    }

    trunkMesh!.instanceMatrix.needsUpdate = true;
    for (const leaf of leafRefs.current) {
      if (leaf) leaf.instanceMatrix.needsUpdate = true;
    }
  }, [count, instances]);

  useLayoutEffect(() => {
    const t = trunkRef.current;
    if (t) t.raycast = () => {};
    for (const leaf of leafRefs.current) {
      if (leaf) leaf.raycast = () => {};
    }
  }, [count]);

  if (count === 0) return null;

  return (
    <>
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, trunkMat, count]}
        castShadow
        receiveShadow
      />
      {BLOCKY_TREE_LEAVES.map((_, li) => (
        <instancedMesh
          key={`leaf-inst-${li}`}
          ref={(el) => {
            leafRefs.current[li] = el;
          }}
          args={[leafGeo, leafMats[li]!, count]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}
