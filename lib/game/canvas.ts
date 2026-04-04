import type { RootState } from "@react-three/fiber";
import * as THREE from "three";

import { BG, CAMERA_FAR, CAMERA_NEAR } from "./constants";

export function onCanvasCreated({ camera, gl, scene }: RootState) {
  scene.background = new THREE.Color(BG);
  gl.setClearColor(new THREE.Color(BG), 1);

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = 72;
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}
