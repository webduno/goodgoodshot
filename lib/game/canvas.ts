import type { RootState } from "@react-three/fiber";
import * as THREE from "three";

import {
  CAMERA_FAR,
  CAMERA_NEAR,
  FOG_FAR,
  FOG_NEAR,
  FOG_SKY,
} from "./constants";

/** Vertical gradient matching `SKY_GRADIENT_CSS` (top → bottom of screen). */
function createSkyGradientTexture(): THREE.CanvasTexture | THREE.Color {
  const w = 4;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Color(FOG_SKY);
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#d4f1ff");
  g.addColorStop(0.38, "#7dd3fc");
  g.addColorStop(0.72, "#00aeef");
  g.addColorStop(1, "#0072bc");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function onCanvasCreated({ camera, gl, scene }: RootState) {
  const sky = createSkyGradientTexture();
  scene.background = sky;
  scene.fog = new THREE.Fog(FOG_SKY, FOG_NEAR, FOG_FAR);
  gl.setClearColor(new THREE.Color("#d4f1ff"), 1);

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = 72;
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}
