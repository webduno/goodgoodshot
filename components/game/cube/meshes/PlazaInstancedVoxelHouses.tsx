"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

import { addMultiplicativeWhiteVertexColors } from "@/lib/game/threeInstancing";

export type PlazaVoxelHouseKind = "normal" | "colored" | "glassBlue" | "glassWhite";

export type PlazaVoxelHouseSpec = {
  lx: number;
  lz: number;
  floorY: number;
  wallHex: string;
  roofHex: string;
  bodyW: number;
  bodyD: number;
  bodyH: number;
  kind: PlazaVoxelHouseKind;
};

/**
 * Plinth ring houses: lit neutral, vivid solids, or tinted glass.
 * Instanced `setColorAt` needs geometry `color` = white — see `addMultiplicativeWhiteVertexColors`.
 */
export function PlazaInstancedVoxelHouses({
  houses,
}: {
  houses: readonly PlazaVoxelHouseSpec[];
}) {
  const bodyNormalRef = useRef<THREE.InstancedMesh>(null);
  const roofNormalRef = useRef<THREE.InstancedMesh>(null);
  const bodyColoredRef = useRef<THREE.InstancedMesh>(null);
  const roofColoredRef = useRef<THREE.InstancedMesh>(null);
  const bodyGlassBlueRef = useRef<THREE.InstancedMesh>(null);
  const roofGlassBlueRef = useRef<THREE.InstancedMesh>(null);
  const bodyGlassWhiteRef = useRef<THREE.InstancedMesh>(null);
  const roofGlassWhiteRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const boxGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    addMultiplicativeWhiteVertexColors(g);
    return g;
  }, []);
  const boxGeoGlass = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matNormalBody = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.34,
        metalness: 0.14,
        emissive: "#e6eef8",
        emissiveIntensity: 0.14,
      }),
    []
  );
  const matNormalRoof = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.36,
        metalness: 0.12,
        emissive: "#e5eaf2",
        emissiveIntensity: 0.12,
      }),
    []
  );

  const matColoredBody = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
    []
  );
  const matColoredRoof = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
    []
  );

  const matGlassBlue = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#7ec8f8",
        transparent: true,
        opacity: 0.55,
        roughness: 0.06,
        metalness: 0.08,
        transmission: 0.62,
        thickness: 0.55,
        ior: 1.42,
        attenuationColor: new THREE.Color("#5ab0e8"),
        attenuationDistance: 0.85,
        emissive: "#a8d8ff",
        emissiveIntensity: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const matGlassWhite = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f8fafc",
        transparent: true,
        opacity: 0.48,
        roughness: 0.05,
        metalness: 0.06,
        transmission: 0.58,
        thickness: 0.5,
        ior: 1.4,
        attenuationColor: new THREE.Color("#e8f0f8"),
        attenuationDistance: 0.85,
        emissive: "#f0f6ff",
        emissiveIntensity: 0.06,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const buckets = useMemo(() => {
    const normal: PlazaVoxelHouseSpec[] = [];
    const colored: PlazaVoxelHouseSpec[] = [];
    const glassBlue: PlazaVoxelHouseSpec[] = [];
    const glassWhite: PlazaVoxelHouseSpec[] = [];
    for (const h of houses) {
      if (h.kind === "normal") normal.push(h);
      else if (h.kind === "colored") colored.push(h);
      else if (h.kind === "glassBlue") glassBlue.push(h);
      else glassWhite.push(h);
    }
    return { normal, colored, glassBlue, glassWhite };
  }, [houses]);

  const writeInstances = (
    bodyRef: RefObject<THREE.InstancedMesh | null>,
    roofRef: RefObject<THREE.InstancedMesh | null>,
    list: readonly PlazaVoxelHouseSpec[],
    setColor: boolean
  ) => {
    const bodyMesh = bodyRef.current;
    const roofMesh = roofRef.current;
    if (!bodyMesh || !roofMesh || list.length === 0) return;
    for (let i = 0; i < list.length; i++) {
      const h = list[i]!;
      const roofH = Math.min(0.55, h.bodyH * 0.38);
      dummy.position.set(h.lx, h.floorY + h.bodyH / 2, h.lz);
      dummy.scale.set(h.bodyW, h.bodyH, h.bodyD);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      if (setColor) {
        tmpColor.set(h.wallHex);
        bodyMesh.setColorAt(i, tmpColor);
      }
      dummy.position.set(h.lx, h.floorY + h.bodyH + roofH / 2, h.lz);
      dummy.scale.set(h.bodyW * 1.06, roofH, h.bodyD * 1.06);
      dummy.updateMatrix();
      roofMesh.setMatrixAt(i, dummy.matrix);
      if (setColor) {
        tmpColor.set(h.roofHex);
        roofMesh.setColorAt(i, tmpColor);
      }
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    if (setColor && bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
    if (setColor && roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    writeInstances(bodyNormalRef, roofNormalRef, buckets.normal, true);
    writeInstances(bodyColoredRef, roofColoredRef, buckets.colored, true);
    writeInstances(bodyGlassBlueRef, roofGlassBlueRef, buckets.glassBlue, false);
    writeInstances(bodyGlassWhiteRef, roofGlassWhiteRef, buckets.glassWhite, false);
  }, [buckets, dummy, tmpColor]);

  const nn = buckets.normal.length;
  const nc = buckets.colored.length;
  const nb = buckets.glassBlue.length;
  const nw = buckets.glassWhite.length;

  return (
    <>
      {nn > 0 && (
        <>
          <instancedMesh
            ref={bodyNormalRef}
            args={[boxGeo, matNormalBody, nn]}
            castShadow
            receiveShadow
          />
          <instancedMesh
            ref={roofNormalRef}
            args={[boxGeo, matNormalRoof, nn]}
            castShadow
            receiveShadow
          />
        </>
      )}
      {nc > 0 && (
        <>
          <instancedMesh ref={bodyColoredRef} args={[boxGeo, matColoredBody, nc]} />
          <instancedMesh ref={roofColoredRef} args={[boxGeo, matColoredRoof, nc]} />
        </>
      )}
      {nb > 0 && (
        <>
          <instancedMesh
            ref={bodyGlassBlueRef}
            args={[boxGeoGlass, matGlassBlue, nb]}
            castShadow={false}
            receiveShadow
          />
          <instancedMesh
            ref={roofGlassBlueRef}
            args={[boxGeoGlass, matGlassBlue, nb]}
            castShadow={false}
            receiveShadow
          />
        </>
      )}
      {nw > 0 && (
        <>
          <instancedMesh
            ref={bodyGlassWhiteRef}
            args={[boxGeoGlass, matGlassWhite, nw]}
            castShadow={false}
            receiveShadow
          />
          <instancedMesh
            ref={roofGlassWhiteRef}
            args={[boxGeoGlass, matGlassWhite, nw]}
            castShadow={false}
            receiveShadow
          />
        </>
      )}
    </>
  );
}
