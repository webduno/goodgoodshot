"use client";

import { VehicleBodyPartMesh } from "@/components/game/cube/meshes/VehicleBodyParts";
import type { RgbTuple, VehicleBodyPart } from "@/components/playerVehicleConfig";
import { OrbitControls, TransformControls } from "@react-three/drei";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import * as THREE from "three";

export type GizmoMode = "translate" | "rotate" | "scale";

type PartRow = VehicleBodyPart & { id: string };

function BuilderPartGroup({
  part,
  mainRgb,
  accentRgb,
  isSelected,
  gizmoMode,
  onPartTransform,
}: {
  part: PartRow;
  mainRgb: RgbTuple;
  accentRgb: RgbTuple;
  isSelected: boolean;
  gizmoMode: GizmoMode;
  onPartTransform: (
    id: string,
    patch: Partial<Omit<PartRow, "id">>
  ) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sizeRef = useRef<[number, number, number]>([
    part.size[0],
    part.size[1],
    part.size[2],
  ]);

  useLayoutEffect(() => {
    sizeRef.current = [part.size[0], part.size[1], part.size[2]];
  }, [part.size]);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(part.pos[0], part.pos[1], part.pos[2]);
    const rot = part.rotDeg ?? [0, 0, 0];
    g.rotation.set(
      THREE.MathUtils.degToRad(rot[0]),
      THREE.MathUtils.degToRad(rot[1]),
      THREE.MathUtils.degToRad(rot[2])
    );
    g.scale.set(1, 1, 1);
  }, [part.pos, part.rotDeg, part.size, part.id]);

  const handleObjectChange = useCallback(() => {
    const g = groupRef.current;
    if (!g || !isSelected) return;

    if (gizmoMode === "translate") {
      onPartTransform(part.id, {
        pos: [g.position.x, g.position.y, g.position.z],
      });
      return;
    }

    if (gizmoMode === "rotate") {
      onPartTransform(part.id, {
        rotDeg: [
          THREE.MathUtils.radToDeg(g.rotation.x),
          THREE.MathUtils.radToDeg(g.rotation.y),
          THREE.MathUtils.radToDeg(g.rotation.z),
        ],
      });
      return;
    }

    const [sx, sy, sz] = sizeRef.current;
    onPartTransform(part.id, {
      size: [sx * g.scale.x, sy * g.scale.y, sz * g.scale.z],
    });
    g.scale.set(1, 1, 1);
  }, [gizmoMode, isSelected, onPartTransform, part.id]);

  return (
    <>
      <group ref={groupRef}>
        <VehicleBodyPartMesh part={part} mainRgb={mainRgb} accentRgb={accentRgb} />
      </group>
      {isSelected && (
        <TransformControls
          object={groupRef as React.RefObject<THREE.Object3D>}
          mode={gizmoMode}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
}

export function VehicleBuilderScene({
  parts,
  mainRgb,
  accentRgb,
  selectedId,
  gizmoMode,
  onPartTransform,
}: {
  parts: PartRow[];
  mainRgb: RgbTuple;
  accentRgb: RgbTuple;
  selectedId: string | null;
  gizmoMode: GizmoMode;
  onPartTransform: (
    id: string,
    patch: Partial<Omit<PartRow, "id">>
  ) => void;
}) {
  return (
    <>
      {parts.map((p) => (
        <BuilderPartGroup
          key={p.id}
          part={p}
          mainRgb={mainRgb}
          accentRgb={accentRgb}
          isSelected={p.id === selectedId}
          gizmoMode={gizmoMode}
          onPartTransform={onPartTransform}
        />
      ))}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#7ecf6a" roughness={0.85} />
      </mesh>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={14}
        target={[0, 0, 0]}
      />
    </>
  );
}
