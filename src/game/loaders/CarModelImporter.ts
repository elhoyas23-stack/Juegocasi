/**
 * CarModelImporter.ts - Dynamic 3D Model Loader for Custom Player Vehicles
 * Supports .glb, .gltf, .zip (containing gltf/glb/obj + textures), and .obj formats.
 * Automatically normalizes orientation, auto-scales to Formula 1 dimensions (length ~4.8m),
 * centers pivot, configures PBR shadows, and binds wheels when detectable.
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import JSZip from 'jszip';

export interface ImportedCarData {
  rootGroup: THREE.Group;
  wheelMeshes: THREE.Object3D[];
  wheelPivotsFront: THREE.Object3D[];
  name: string;
}

export class CarModelImporter {
  /**
   * Loads a vehicle model from a user-provided File object (.glb, .gltf, .zip, .obj)
   */
  public static async loadFromFile(file: File): Promise<ImportedCarData> {
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
  private static parseGLBBuffer(buffer: ArrayBuffer, name: string): Promise<ImportedCarData> {
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
  private static parseGLTFText(text: string, name: string): Promise<ImportedCarData> {
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
  private static parseOBJText(text: string, name: string): Promise<ImportedCarData> {
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
  private static async parseZipArchive(buffer: ArrayBuffer, zipName: string): Promise<ImportedCarData> {
    const zip = await JSZip.loadAsync(buffer);
    const fileEntries = Object.keys(zip.files);

    // 1. Look for .glb inside the zip
    const glbFile = fileEntries.find((f) => f.toLowerCase().endsWith('.glb') && !f.startsWith('__MACOSX'));
    if (glbFile) {
      const glbBuffer = await zip.files[glbFile].async('arraybuffer');
      return this.parseGLBBuffer(glbBuffer, glbFile);
    }

    // 2. Look for .gltf inside the zip (with asset mapping)
    const gltfFile = fileEntries.find((f) => f.toLowerCase().endsWith('.gltf') && !f.startsWith('__MACOSX'));
    if (gltfFile) {
      const gltfText = await zip.files[gltfFile].async('string');
      const blobUrls: string[] = [];

      // Create a LoadingManager that serves files from the zip
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        // Strip relative paths
        const cleanName = url.split('/').pop()?.split('\\').pop() || url;
        const matchingKey = fileEntries.find(
          (k) => k.toLowerCase().endsWith(cleanName.toLowerCase()) || k.toLowerCase().includes(cleanName.toLowerCase())
        );
        if (matchingKey && zip.files[matchingKey]) {
          // Asynchronously creating blob url
          const fileObj = zip.files[matchingKey];
          // We handle synchronous lookup by pre-caching blobs below
          const cached = (manager as unknown as { _blobCache?: Record<string, string> })._blobCache?.[matchingKey];
          if (cached) return cached;
        }
        return url;
      });

      // Pre-extract all non-gltf files into Blob URLs
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
      (manager as unknown as { _blobCache?: Record<string, string> })._blobCache = blobCache;

      return new Promise<ImportedCarData>((resolve, reject) => {
        const loader = new GLTFLoader(manager);
        loader.parse(
          gltfText,
          '',
          (gltf: GLTF) => {
            const processed = this.normalizeAndPrepareModel(gltf.scene, gltfFile);
            resolve(processed);
          },
          (err) => {
            // Revoke blob URLs
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
            reject(new Error('Error al parsear el modelo GLTF extraído del ZIP: ' + err));
          }
        );
      });
    }

    // 3. Look for .obj inside the zip
    const objFile = fileEntries.find((f) => f.toLowerCase().endsWith('.obj') && !f.startsWith('__MACOSX'));
    if (objFile) {
      const objText = await zip.files[objFile].async('string');
      return this.parseOBJText(objText, objFile);
    }

    throw new Error('No se encontró ningún archivo .glb, .gltf o .obj dentro del archivo .ZIP subido.');
  }

  /**
   * Normalizes orientation, scales to ~4.8m Formula 1 length, centers pivot,
   * configures shadows, and attempts to detect individual wheels for steering.
   */
  private static normalizeAndPrepareModel(rawModel: THREE.Object3D, modelName: string): ImportedCarData {
    const root = new THREE.Group();
    root.name = 'CustomCarRoot_' + modelName;

    const modelContainer = new THREE.Group();
    modelContainer.add(rawModel);
    root.add(modelContainer);

    // Initial Bounding Box check
    rawModel.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(rawModel);
    let size = box.getSize(new THREE.Vector3());

    // 1. Detect and fix orientation (Ensure forward is along Z axis and up is along Y axis)
    // If width (X) is much greater than length (Z), car is rotated 90 degrees around Y
    if (size.x > size.z * 1.35) {
      rawModel.rotation.y += Math.PI / 2;
      rawModel.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(rawModel);
      size = box.getSize(new THREE.Vector3());
    }

    // If height (Y) is much greater than length (Z) and width (X), model might be Z-up exported as Y-up
    if (size.y > size.z * 1.4 && size.y > size.x) {
      rawModel.rotation.x -= Math.PI / 2;
      rawModel.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(rawModel);
      size = box.getSize(new THREE.Vector3());
    }

    // 2. Uniform Scaling to Formula 1 dimensions (Target length ~4.85m)
    const targetLength = 4.85;
    const maxHorizontalDim = Math.max(size.z, size.x);
    if (maxHorizontalDim > 0.001) {
      const scaleFactor = targetLength / maxHorizontalDim;
      rawModel.scale.setScalar(scaleFactor);
      rawModel.updateMatrixWorld(true);
    }

    // 3. Center the Model Pivot at ground contact and origin (X = 0, Z = 0)
    box = new THREE.Box3().setFromObject(rawModel);
    const center = box.getCenter(new THREE.Vector3());
    const minY = box.min.y;

    rawModel.position.x -= center.x;
    rawModel.position.z -= center.z;
    // Align bottom of wheels/tires flush with the track surface (cancelling out vehicle physics Y=0.35 offset)
    rawModel.position.y -= (minY + 0.34);

    // 4. Soft Ambient Contact Shadow under chassis & wheels for realistic ground adhesion
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 512;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      const grad = shadowCtx.createRadialGradient(128, 256, 40, 128, 256, 120);
      grad.addColorStop(0, 'rgba(0,0,0,0.88)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.85, 'rgba(0,0,0,0.20)');
      grad.addColorStop(1, 'rgba(0,0,0,0.0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 256, 512);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.35, 4.9);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    // Position 1cm above track road surface (car group sits at y=0.35, so -0.338 places it at y=0.012)
    contactShadow.position.set(0, -0.338, 0);
    root.add(contactShadow);

    // 5. Configure Materials and Shadows for all children
    const wheelCandidates: THREE.Object3D[] = [];
    rawModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            // Optimize and sharpen all textures for crystal-clear lettering and decals
            if ('map' in m && m.map) this.optimizeTexture(m.map as THREE.Texture, true);
            if ('emissiveMap' in m && m.emissiveMap) this.optimizeTexture(m.emissiveMap as THREE.Texture, true);
            if ('roughnessMap' in m && m.roughnessMap) this.optimizeTexture(m.roughnessMap as THREE.Texture, false);
            if ('metalnessMap' in m && m.metalnessMap) this.optimizeTexture(m.metalnessMap as THREE.Texture, false);
            if ('normalMap' in m && m.normalMap) this.optimizeTexture(m.normalMap as THREE.Texture, false);
            if ('aoMap' in m && m.aoMap) this.optimizeTexture(m.aoMap as THREE.Texture, false);

            if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
              m.envMapIntensity = 1.35;
              m.needsUpdate = true;
            }
          });
        }
      }

      // Check if child name indicates a wheel
      const n = child.name.toLowerCase();
      if (
        (n.includes('wheel') || n.includes('tire') || n.includes('tyre') || n.includes('rueda')) &&
        !n.includes('steering') &&
        !n.includes('interior')
      ) {
        wheelCandidates.push(child);
      }
    });

    const wheelMeshes: THREE.Object3D[] = [];
    const wheelPivotsFront: THREE.Object3D[] = [];

    // If wheel candidates were detected, organize them
    if (wheelCandidates.length >= 4) {
      wheelCandidates.forEach((w) => {
        wheelMeshes.push(w);
        const wWorldPos = new THREE.Vector3();
        w.getWorldPosition(wWorldPos);
        // If forward wheel (z > 0 in our coordinate space)
        if (wWorldPos.z > 0) {
          wheelPivotsFront.push(w);
        }
      });
    }

    return {
      rootGroup: root,
      wheelMeshes,
      wheelPivotsFront,
      name: modelName.replace(/\.[^/.]+$/, ''),
    };
  }

  /**
   * Applies 16x Anisotropic Filtering and sRGB color space to textures
   * to ensure crystal-clear decals, sponsor logos, and typography at glancing angles.
   */
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
