import * as THREE from "three";

/**
 * InstancedMesh `setColorAt` multiplies instance color with the geometry `color` attribute.
 * Default geometry has no `color` ⇒ effectively 0 ⇒ black. Fill white so instance colors show.
 */
export function addMultiplicativeWhiteVertexColors(
  geometry: THREE.BufferGeometry
): void {
  if (geometry.getAttribute("color")) return;
  const n = geometry.attributes.position.count;
  const colors = new Float32Array(n * 3);
  colors.fill(1);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
