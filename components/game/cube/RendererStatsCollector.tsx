"use client";

import { useFrame } from "@react-three/fiber";
import type { MutableRefObject } from "react";

export type RendererStatsSnapshot = {
  calls: number;
  triangles: number;
};

/**
 * Fills `statsRef` with `WebGLRenderer.info` after each frame render (draw calls + triangles).
 * Must live inside `<Canvas>`.
 */
export function RendererStatsCollector({
  statsRef,
}: {
  statsRef: MutableRefObject<RendererStatsSnapshot | null>;
}) {
  /** R3F runs `useFrame` before `gl.render()`; `info` still holds the prior frame’s totals until the next render resets. */
  useFrame((state) => {
    const { gl } = state;
    statsRef.current = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    };
  });
  return null;
}
