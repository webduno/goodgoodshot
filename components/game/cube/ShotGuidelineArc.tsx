"use client";

import { useMemo } from "react";
import * as THREE from "three";

import type { Vec3 } from "@/lib/game/types";

/**
 * Dashed world-space line (first segment of trajectory only; parent computes points).
 */
export function ShotGuidelineArc({
  points,
  color = "#e53935",
}: {
  points: readonly Vec3[];
  color?: string;
}) {
  const lineObject = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = points.length;
    if (n < 2) {
      g.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(6), 3)
      );
    } else {
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = points[i]![0];
        arr[i * 3 + 1] = points[i]![1];
        arr[i * 3 + 2] = points[i]![2];
      }
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    }
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.42,
      gapSize: 0.26,
      depthTest: true,
      transparent: true,
      opacity: 0.92,
    });
    const line = new THREE.Line(g, mat);
    if (n >= 2) line.computeLineDistances();
    line.renderOrder = 900;
    return line;
  }, [color, points]);

  if (points.length < 2) return null;

  return <primitive object={lineObject} />;
}
