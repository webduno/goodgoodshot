"use client";

import { rgbTupleToCss, type RgbTuple, type VehicleBodyPart } from "@/components/playerVehicleConfig";
import * as THREE from "three";

function resolvePartColor(
  part: VehicleBodyPart,
  mainRgb: RgbTuple,
  accentRgb: RgbTuple
): string {
  const c = part.color;
  if (c === undefined || c === "main") return rgbTupleToCss(mainRgb);
  if (c === "accent") return rgbTupleToCss(accentRgb);
  return rgbTupleToCss(c);
}

/**
 * Voxel-style vehicle hull from primitive parts (cubes, low-poly cylinders/spheres).
 * Parts use local space with origin at spawn block center (same as the default 1×1×1 box).
 */
export function VehicleBodyParts({
  parts,
  mainRgb,
  accentRgb,
}: {
  parts: readonly VehicleBodyPart[];
  mainRgb: RgbTuple;
  accentRgb: RgbTuple;
}) {
  return (
    <>
      {parts.map((p, i) => {
        const color = resolvePartColor(p, mainRgb, accentRgb);
        const rot = p.rotDeg ?? [0, 0, 0];
        const rx = THREE.MathUtils.degToRad(rot[0]);
        const ry = THREE.MathUtils.degToRad(rot[1]);
        const rz = THREE.MathUtils.degToRad(rot[2]);
        const [sx, sy, sz] = p.size;

        return (
          <group
            key={`${p.type}-${i}`}
            position={[p.pos[0], p.pos[1], p.pos[2]]}
            rotation={[rx, ry, rz]}
          >
            <mesh castShadow receiveShadow>
              {p.type === "cube" && (
                <boxGeometry args={[sx, sy, sz]} />
              )}
              {p.type === "cylinder" && (
                <cylinderGeometry
                  args={[
                    sx,
                    sx,
                    sy,
                    Math.max(3, Math.round(sz)),
                  ]}
                />
              )}
              {p.type === "sphere" && (
                <sphereGeometry
                  args={[
                    sx,
                    Math.max(3, Math.round(sy)),
                    Math.max(2, Math.round(sz)),
                  ]}
                />
              )}
              <meshStandardMaterial
                color={color}
                roughness={0.32}
                metalness={0.2}
                polygonOffset={p.polygonOffset === true}
                polygonOffsetFactor={p.polygonOffset === true ? -1 : 0}
                polygonOffsetUnits={p.polygonOffset === true ? -1 : 0}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
