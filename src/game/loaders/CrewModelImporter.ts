/**
 * CrewModelImporter.ts - Dynamic 3D Model Loader for Pit Crew Mechanics
 * Supports .glb, .gltf, .zip (containing gltf/glb/obj + textures), and .obj formats.
 * Automatically normalizes orientation, auto-scales to human height (~1.80m),
 * aligns feet with the pit ground (y = 0), and configures PBR shadows.
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import JSZip from 'jszip';

export interface ImportedCrewData {
  rootGroup: THREE.Group;
  name: string;
}

export class CrewModelImporter {
  /**
   * Loads a mechanic model from a user-provided File object (.glb, .gltf, .zip, .obj)
   */
  public static async loadFromFile(file: File): Promise<ImportedCrewData> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.glb')) {
      const buffer = await file.arrayBuffer();
      return this.parseGLBBuffer(buffer, file.name);
    } else if (fileName.endsWith('.zip')) {
      const buffer = await file.arrayBuffer();
      return this.parseZipArchive(buffer, file.name);
    } else if (fileName.endsWith('.gltf')) {
      const text = await file.text();
      return this.parseGLTFText(text, file.name);
    } else if (fileName.endsWith('.obj')) {
      const text = await file.text();
      return this.parseOBJText(text, file.name);
    } else {
      throw new Error(`Formato no soportado (${file.name}). Por favor, sube un archivo .zip, .glb, .gltf o .obj.`);
    }
  }

  /**
   * Parse single binary GLB ArrayBuffer
   */
  private static parseGLBBuffer(buffer: ArrayBuffer, name: string): Promise<ImportedCrewData> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(
        buffer,
        '',
        (gltf: GLTF) => {
          const processed = this.normalizeAndPrepareModel(gltf.scene, name);
          resolve(processed);
        },
        (err) => reject(new Error('Error al parsear el archivo GLB: ' + err))
      );
    });
  }

  /**
   * Parse text-based GLTF
   */
  private static parseGLTFText(text: string, name: string): Promise<ImportedCrewData> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.parse(
        text,
        '',
        (gltf: GLTF) => {
          const processed = this.normalizeAndPrepareModel(gltf.scene, name);
          resolve(processed);
        },
        (err) => reject(new Error('Error al parsear el archivo GLTF: ' + err))
      );
    });
  }

  /**
   * Parse text-based OBJ
   */
  private static parseOBJText(text: string, name: string): Promise<ImportedCrewData> {
    return new Promise((resolve, reject) => {
      try {
        const loader = new OBJLoader();
        const obj = loader.parse(text);
        const processed = this.normalizeAndPrepareModel(obj, name);
        resolve(processed);
      } catch (err) {
        reject(new Error('Error al procesar el archivo OBJ: ' + err));
      }
    });
  }

  /**
   * Parse .ZIP archive containing .glb, .gltf (+ textures/bin), or .obj (+ mtl)
   */
  private static async parseZipArchive(buffer: ArrayBuffer, zipName: string): Promise<ImportedCrewData> {
    const zip = await JSZip.loadAsync(buffer);

    let glbFile: JSZip.JSZipObject | null = null;
    let gltfFile: JSZip.JSZipObject | null = null;
    let objFile: JSZip.JSZipObject | null = null;

    zip.forEach((relativePath, file) => {
      const lower = relativePath.toLowerCase();
      if (lower.endsWith('.glb') && !lower.startsWith('__macosx') && !glbFile) glbFile = file;
      if (lower.endsWith('.gltf') && !lower.startsWith('__macosx') && !gltfFile) gltfFile = file;
      if (lower.endsWith('.obj') && !lower.startsWith('__macosx') && !objFile) objFile = file;
    });

    if (glbFile) {
      const glbBuf = await (glbFile as JSZip.JSZipObject).async('arraybuffer');
      return this.parseGLBBuffer(glbBuf, (glbFile as JSZip.JSZipObject).name.split('/').pop() || zipName);
    }

    if (gltfFile) {
      const gltfObj = gltfFile as JSZip.JSZipObject;
      const gltfText = await gltfObj.async('text');

      const blobUrls: string[] = [];
      const fileEntries = Object.keys(zip.files);
      const blobCache: Record<string, string> = {};

      for (const key of fileEntries) {
        if (!key.endsWith('.gltf') && !zip.files[key].dir) {
          const blob = await zip.files[key].async('blob');
          const blobUrl = URL.createObjectURL(blob);
          blobUrls.push(blobUrl);
          blobCache[key] = blobUrl;
          const simpleName = key.split('/').pop() || key;
          blobCache[simpleName] = blobUrl;
        }
      }

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        const cleanName = url.split('/').pop()?.split('\\').pop() || url;
        if (blobCache[cleanName]) return blobCache[cleanName];
        if (blobCache[url]) return blobCache[url];
        return url;
      });

      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader(manager);
        loader.parse(
          gltfText,
          '',
          (gltf: GLTF) => {
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
            const processed = this.normalizeAndPrepareModel(gltf.scene, gltfObj.name.split('/').pop() || zipName);
            resolve(processed);
          },
          (err) => {
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
            reject(new Error('Error al parsear GLTF desde ZIP: ' + err));
          }
        );
      });
    }

    if (objFile) {
      const objObj = objFile as JSZip.JSZipObject;
      const objText = await objObj.async('text');
      const loader = new OBJLoader();
      const obj = loader.parse(objText);
      return this.normalizeAndPrepareModel(obj, objObj.name.split('/').pop() || zipName);
    }

    throw new Error(`El archivo ZIP "${zipName}" no contiene ningún archivo 3D compatible (.glb, .gltf, .obj).`);
  }

  /**
   * Normalizes human scale (~1.80m height), aligns feet to ground (y = 0),
   * centers pivot, enables shadows and PBR settings.
   */
  private static normalizeAndPrepareModel(rawScene: THREE.Object3D, originalName: string): ImportedCrewData {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'CustomMechanic_' + originalName;

    // Compute bounding box of the raw imported model
    const initialBox = new THREE.Box3().setFromObject(rawScene);
    const initialSize = new THREE.Vector3();
    initialBox.getSize(initialSize);

    // Target human mechanic height: ~1.80m tall
    const targetHeight = 1.80;
    const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
    
    // Scale factor
    let scaleFactor = 1.0;
    if (initialSize.y > 0.05) {
      scaleFactor = targetHeight / initialSize.y;
    } else if (maxDim > 0.05) {
      scaleFactor = targetHeight / maxDim;
    }

    // Centering offset: center X and Z at 0, place feet (min Y) at ground level y = 0
    const centerOffset = new THREE.Vector3(
      -(initialBox.min.x + initialBox.max.x) / 2,
      -initialBox.min.y,
      -(initialBox.min.z + initialBox.max.z) / 2
    );

    // Wrapper group with normalized transforms
    const modelWrapper = new THREE.Group();
    modelWrapper.name = 'MechanicWrapper';
    modelWrapper.position.copy(centerOffset.clone().multiplyScalar(scaleFactor));
    modelWrapper.scale.setScalar(scaleFactor);
    modelWrapper.add(rawScene);

    // Configure materials and shadows
    modelWrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if ('map' in mat && mat.map) this.optimizeTexture(mat.map as THREE.Texture, true);
            if ('emissiveMap' in mat && mat.emissiveMap) this.optimizeTexture(mat.emissiveMap as THREE.Texture, true);
            if ('roughnessMap' in mat && mat.roughnessMap) this.optimizeTexture(mat.roughnessMap as THREE.Texture, false);
            if ('metalnessMap' in mat && mat.metalnessMap) this.optimizeTexture(mat.metalnessMap as THREE.Texture, false);
            if ('normalMap' in mat && mat.normalMap) this.optimizeTexture(mat.normalMap as THREE.Texture, false);

            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
              mat.roughness = Math.max(0.2, mat.roughness ?? 0.5);
              mat.envMapIntensity = 1.0;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });

    rootGroup.add(modelWrapper);

    const cleanName = originalName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    return {
      rootGroup,
      name: cleanName,
    };
  }

  private static optimizeTexture(tex: THREE.Texture | null | undefined, isColor: boolean): void {
    if (!tex) return;
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
  }
}
