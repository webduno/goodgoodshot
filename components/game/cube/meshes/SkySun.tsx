"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import {
  SUN_BILLBOARD_SIZE,
  SUN_WORLD_X,
  SUN_WORLD_Y,
  SUN_WORLD_Z,
} from "@/lib/game/constants";

function createSunGradientTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const r = cx * 0.98;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, r);
  g.addColorStop(0, "#fffde7");
  g.addColorStop(0.28, "#ffeb3b");
  g.addColorStop(0.62, "#ffb300");
  g.addColorStop(1, "#e65100");
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Yellow→orange gradient billboard past the farthest goal (+Z). Ignores fog so it stays readable in the sky.
 */
export function SkySun() {
  const map = useMemo(() => createSunGradientTexture(), []);

  useEffect(() => {
    return () => {
      map.dispose();
    };
  }, [map]);

  return (
    <sprite
      position={[SUN_WORLD_X, SUN_WORLD_Y, SUN_WORLD_Z]}
      scale={[SUN_BILLBOARD_SIZE, SUN_BILLBOARD_SIZE, 1]}
    >
      <spriteMaterial
        map={map}
        transparent
        fog={false}
        depthWrite={false}
      />
    </sprite>
  );
}
