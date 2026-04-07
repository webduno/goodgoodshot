import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

/**
 * Loads `.obj` plus sibling `.mtl` (and textures) for use with R3F `useLoader`.
 */
export class ObjMtlLoader extends THREE.Loader {
  override load(
    url: string,
    onLoad: (data: THREE.Object3D) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void
  ): void {
    const slash = url.lastIndexOf("/");
    const dir = slash >= 0 ? url.slice(0, slash + 1) : "";
    const objFile = slash >= 0 ? url.slice(slash + 1) : url;
    const base = objFile.replace(/\.obj$/i, "");
    const mtlLoader = new MTLLoader(this.manager);
    mtlLoader.setPath(dir);
    mtlLoader.load(
      `${base}.mtl`,
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader(this.manager);
        objLoader.setMaterials(materials);
        objLoader.load(url, onLoad, onProgress, onError);
      },
      onProgress,
      onError
    );
  }
}
