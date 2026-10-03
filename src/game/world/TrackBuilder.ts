/**
 * TrackBuilder.ts - Professional FIA Grade-1 Racing Circuit World
 * Features realistic PBR materials, FIA catch fencing & debris barriers,
 * Tecpro high-impact runoff cushions, multi-tiered covered grandstands with VIP suites,
 * 2-story modern Pit Lane & Paddock Club building, 8 high-mast stadium floodlights,
 * realistic organic vegetation (pines, oaks, shrubs), Jumbotron video walls, and marshal posts.
 */

import * as THREE from 'three';
import asphaltImg from '../../assets/images/track_asphalt_detail_1790904767865.jpg';

export interface StaticObstacle {
  x: number;
  z: number;
  radius: number;
  isWallSegment?: boolean;
  p1?: { x: number; z: number };
  p2?: { x: number; z: number };
  type: 'tree' | 'pillar' | 'wall' | 'building' | 'tecpro';
}

export interface DynamicProp {
  id: number;
  type: 'sign' | 'cone' | 'tire_stack';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  radius: number;
  height: number;
  mass: number;
  isSleeping: boolean;
  baseY: number;
}

export class TrackBuilder {
  public group: THREE.Group;
  public staticObstacles: StaticObstacle[] = [];
  public dynamicProps: DynamicProp[] = [];

  // Track Dimensions
  public readonly halfSize = 130;  // 260m total square size
  public readonly cornerRadius = 38; // Radius of 4 rounded corner apexes
  public readonly trackWidth = 16;
  public readonly innerCornerCenter = 130 - 38; // 92

  // Pit Stop Area Bounds
  public readonly pitZone = {
    minX: -68,
    maxX: 50,
    minZ: -122.5,
    maxZ: -105.0,
  };

  // Shared High-Performance PBR Materials
  private asphaltMat!: THREE.MeshStandardMaterial;
  private kerbRedMat!: THREE.MeshStandardMaterial;
  private kerbWhiteMat!: THREE.MeshStandardMaterial;
  private concreteBarrierMat!: THREE.MeshStandardMaterial;
  private metalFenceMat!: THREE.MeshStandardMaterial;
  private tecproRedMat!: THREE.MeshStandardMaterial;
  private tecproWhiteMat!: THREE.MeshStandardMaterial;
  private grassMat!: THREE.MeshStandardMaterial;
  private gravelMat!: THREE.MeshStandardMaterial;
  private dirtShoulderMat!: THREE.MeshStandardMaterial;
  private treeBarkMat!: THREE.MeshStandardMaterial;
  private pineFoliageMat!: THREE.MeshStandardMaterial;
  private oakFoliageMat!: THREE.MeshStandardMaterial;
  private cypressFoliageMat!: THREE.MeshStandardMaterial;
  private bushFoliageMat!: THREE.MeshStandardMaterial;
  private grassTuftMat!: THREE.MeshStandardMaterial;
  private glassMat!: THREE.MeshPhysicalMaterial;
  private metalDarkMat!: THREE.MeshStandardMaterial;
  private metalSilverMat!: THREE.MeshStandardMaterial;
  private floodlightMat!: THREE.MeshStandardMaterial;
  private lightBeamsGroup = new THREE.Group();

  constructor() {
    this.group = new THREE.Group();
    this.initMaterials();
    this.buildTerrainAndInfield();
    this.buildSquareCircuitTrack();
    this.buildKerbsAndStartingGrid();
    this.buildConcreteBarriersWithCatchFences();
    this.buildTecproRunoffZones();
    this.buildMarshalSafetyPosts();
    this.buildGrandstands();
    this.buildPaddockBuildingAndPitLane();
    this.buildPitEntryAndExitArchitecture();
    this.buildPaddockTransportersAndTrailers();
    this.buildServiceAndSafetyVehicles();
    this.buildSpeedTrapRadarAndSectorGantries();
    this.buildJumbotronAndTimingTowers();
    this.buildOverheadGantriesAndBridges();
    this.buildTVBroadcastTowersAndCranes();
    this.buildPitEquipment();
    this.buildHighMastFloodlights();
    this.buildOrganicVegetation();
    this.buildDynamicProps();

    // High-performance static scene graph optimization:
    // Disables per-frame world matrix recalculation on all purely static circuit elements.
    const dynamicMeshes = new Set(this.dynamicProps.map(p => p.mesh));
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (!dynamicMeshes.has(obj)) {
          obj.matrixAutoUpdate = false;
          obj.updateMatrix();
        }
      }
    });
  }

  private initMaterials(): void {
    const textureLoader = new THREE.TextureLoader();

    // High-Grip Racing Asphalt Texture with 16x Anisotropy & Crisp Proportional Mapping
    const asphaltTex = textureLoader.load(asphaltImg);
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.anisotropy = 16;
    asphaltTex.generateMipmaps = true;
    asphaltTex.minFilter = THREE.LinearMipmapLinearFilter;
    asphaltTex.magFilter = THREE.LinearFilter;
    asphaltTex.repeat.set(16, 16);

    this.asphaltMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      color: 0x24282f, // Deep FIA competition bitumen tarmac
      roughness: 0.68,
      metalness: 0.08,
    });

    // Photorealistic PBR Racing Turf (Organic multi-frequency fractal noise, Sobel normal map & roughness)
    const grassTextures = this.createRealisticGrassTextures();
    this.grassMat = new THREE.MeshStandardMaterial({
      map: grassTextures.albedo,
      normalMap: grassTextures.normal,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughnessMap: grassTextures.roughness,
      roughness: 0.84,
      metalness: 0.02,
    });

    // Runoff Gravel Trap Material
    this.gravelMat = new THREE.MeshStandardMaterial({
      color: 0xb59868,
      roughness: 0.95,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    // Compacted Dirt/Gravel Shoulder Transition along Kerbs and Track Limits
    this.dirtShoulderMat = new THREE.MeshStandardMaterial({
      color: 0x261a10,
      roughness: 0.96,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    // Curbs - Vibrant FIA red and clean high-contrast white with micro-specular sheen
    this.kerbRedMat = new THREE.MeshStandardMaterial({
      color: 0xc8102e,
      roughness: 0.38,
      metalness: 0.10,
    });
    this.kerbWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.38,
      metalness: 0.10,
    });

    // FIA Concrete Barriers (Weathered neutral racing concrete)
    this.concreteBarrierMat = new THREE.MeshStandardMaterial({
      color: 0x5a6370,
      roughness: 0.92,
      metalness: 0.02,
    });

    // Debris Catch Fence Steel (Dark weathered industrial steel, non-reflective)
    this.metalFenceMat = new THREE.MeshStandardMaterial({
      color: 0x1e2229,
      metalness: 0.40,
      roughness: 0.65,
      wireframe: false,
    });

    // Tecpro Impact Cushions
    this.tecproRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      metalness: 0.05,
    });
    this.tecproWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
    });

    // Architectural Metals
    this.metalDarkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.22,
    });
    this.metalSilverMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.90,
      roughness: 0.18,
    });

    // Architectural VIP Glass
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.75,
      transparent: true,
      opacity: 0.85,
    });

    // High-Fidelity Botanical & Foliage Materials
    this.treeBarkMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralBarkTexture(),
      roughness: 0.88,
      metalness: 0.04,
    });
    this.pineFoliageMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralFoliageTexture('#06180a', '#123616'),
      roughness: 0.92,
      metalness: 0.01,
      side: THREE.FrontSide,
    });
    this.oakFoliageMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralFoliageTexture('#0c2410', '#1c4920'),
      roughness: 0.90,
      metalness: 0.01,
      side: THREE.FrontSide,
    });
    this.cypressFoliageMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralFoliageTexture('#051408', '#0e2d12'),
      roughness: 0.94,
      metalness: 0.01,
      side: THREE.FrontSide,
    });
    this.bushFoliageMat = new THREE.MeshStandardMaterial({
      map: this.createProceduralFoliageTexture('#0e2612', '#225026'),
      roughness: 0.88,
      metalness: 0.01,
      side: THREE.FrontSide,
    });
    // Opaque Cutout Pass: alphaTest: 0.5 with depthWrite: true completely eliminates sorting flickering!
    this.grassTuftMat = new THREE.MeshStandardMaterial({
      map: this.createGrassTuftTexture(),
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      transparent: false,
      alphaTest: 0.5,
      depthWrite: true,
      depthTest: true,
      roughness: 0.60,
      metalness: 0.02,
    });

    // Stadium Floodlight Emissive Lens Material
    this.floodlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 3.5,
      roughness: 0.1,
    });
  }

  /**
   * Pre-generates photorealistic PBR turf textures (Albedo, Tangent-Space Normal Map, Roughness Map)
   * with organic multi-frequency fractal noise, sod clumping, and soil undertones (Zero rigid barcode stripes!).
   */
  private createRealisticGrassTextures(): {
    albedo: THREE.CanvasTexture;
    normal: THREE.CanvasTexture;
    roughness: THREE.CanvasTexture;
  } {
    const size = 1024;
    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = size;
    albedoCanvas.height = size;
    const aCtx = albedoCanvas.getContext('2d')!;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nCtx = normalCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;

    // Seamless value noise permutation table
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) {
      perm[i] = perm[i + 256] = Math.floor(Math.random() * 256);
    }
    const gradX = [-1, 1, 0, 0, 1, -1, 1, -1];
    const gradY = [0, 0, -1, 1, 1, 1, -1, -1];

    // Seamless periodic 2D noise (period is power of 2: 4, 8, 16, 32, 64)
    const periodicNoise = (x: number, y: number, period: number): number => {
      const px = Math.floor(x) % period;
      const py = Math.floor(y) % period;
      const px1 = (px + 1) % period;
      const py1 = (py + 1) % period;

      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = xf * xf * (3.0 - 2.0 * xf);
      const v = yf * yf * (3.0 - 2.0 * yf);

      const g00 = perm[px + perm[py]] % 8;
      const g10 = perm[px1 + perm[py]] % 8;
      const g01 = perm[px + perm[py1]] % 8;
      const g11 = perm[px1 + perm[py1]] % 8;

      const d00 = gradX[g00] * xf + gradY[g00] * yf;
      const d10 = gradX[g10] * (xf - 1) + gradY[g10] * yf;
      const d01 = gradX[g01] * xf + gradY[g01] * (yf - 1);
      const d11 = gradX[g11] * (xf - 1) + gradY[g11] * (yf - 1);

      const x1 = d00 * (1 - u) + d10 * u;
      const x2 = d01 * (1 - u) + d11 * u;
      return x1 * (1 - v) + x2 * v;
    };

    const heightField = new Float32Array(size * size);
    const albedoImg = aCtx.createImageData(size, size);
    const roughImg = rCtx.createImageData(size, size);
    const ad = albedoImg.data;
    const rd = roughImg.data;

    for (let y = 0; y < size; y++) {
      const ny = y / size;
      for (let x = 0; x < size; x++) {
        const nx = x / size;

        // Octave 1: Macro meadow undulation (Period = 4)
        const macro = periodicNoise(nx * 4, ny * 4, 4);

        // Octave 2: Turf sod clumps and moisture patches (Period = 16)
        const meso = periodicNoise(nx * 16, ny * 16, 16);

        // Octave 3: High-frequency blade and clover clusters (Period = 64)
        const micro = periodicNoise(nx * 64, ny * 64, 64);

        // Normalized height for normal mapping
        const h = macro * 0.40 + meso * 0.38 + micro * 0.22;
        heightField[y * size + x] = h;

        // Rich organic European turf color palette (No rigid horizontal stripes!)
        const normH = Math.min(1.0, Math.max(0.0, (h + 0.9) / 1.8));
        const macroFactor = Math.min(1.0, Math.max(0.0, (macro + 0.8) / 1.6));

        // Organic color blending:
        // Crevice root tone: rgb(22, 50, 24)
        // Mid rich blade green: rgb(38, 82, 36)
        // Sunlit blade tips: rgb(62, 126, 56)
        // Warm golden meadow highlights: rgb(82, 142, 62)
        let r = 22 + normH * 38 + macroFactor * 10;
        let g = 50 + normH * 72 + macroFactor * 16;
        let b = 24 + normH * 28;

        // Fine blade jitter and earthy soil flecks
        const jitter = (Math.random() - 0.5) * 14;
        const isGoldenTip = Math.random() > 0.92 ? 18 : 0;

        r = Math.min(255, Math.max(0, Math.floor(r + jitter + isGoldenTip * 0.75)));
        g = Math.min(255, Math.max(0, Math.floor(g + jitter + isGoldenTip * 1.15)));
        b = Math.min(255, Math.max(0, Math.floor(b + jitter * 0.5)));

        const idx = (y * size + x) * 4;
        ad[idx] = r;
        ad[idx + 1] = g;
        ad[idx + 2] = b;
        ad[idx + 3] = 255;

        // Roughness: 0.72 (velvety blade sheen) to 0.94 (matte earthy crevice)
        const roughVal = Math.floor((0.74 + (1.0 - normH) * 0.20 + (Math.random() - 0.5) * 0.04) * 255);
        rd[idx] = roughVal;
        rd[idx + 1] = roughVal;
        rd[idx + 2] = roughVal;
        rd[idx + 3] = 255;
      }
    }

    aCtx.putImageData(albedoImg, 0, 0);
    rCtx.putImageData(roughImg, 0, 0);

    // Compute Tangent-Space Normal Map via Sobel operator on heightField
    const normalImg = nCtx.createImageData(size, size);
    const nd = normalImg.data;
    const normalStrength = 4.0;

    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;

        const hL = heightField[y * size + xPrev];
        const hR = heightField[y * size + xNext];
        const hU = heightField[yPrev * size + x];
        const hD = heightField[yNext * size + x];

        const dx = (hR - hL) * normalStrength;
        const dy = (hD - hU) * normalStrength;
        const len = Math.sqrt(dx * dx + dy * dy + 1.0);

        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1.0 / len;

        const idx = (y * size + x) * 4;
        nd[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
        nd[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        nd[idx + 2] = Math.floor(nz * 255);
        nd[idx + 3] = 255;
      }
    }
    nCtx.putImageData(normalImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;
    albedoTex.repeat.set(32, 32);
    albedoTex.anisotropy = 16;
    albedoTex.generateMipmaps = true;
    albedoTex.minFilter = THREE.LinearMipmapLinearFilter;
    albedoTex.magFilter = THREE.LinearFilter;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;
    normalTex.repeat.set(32, 32);
    normalTex.anisotropy = 16;
    normalTex.generateMipmaps = true;

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(32, 32);
    roughTex.anisotropy = 16;
    roughTex.generateMipmaps = true;

    return { albedo: albedoTex, normal: normalTex, roughness: roughTex };
  }

  /**
   * Generates procedural tactile organic tree bark texture with vertical striations
   */
  private createProceduralBarkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#281710';
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 4) {
      const shade = 28 + Math.floor(Math.sin(x * 0.15) * 14 + Math.random() * 18);
      ctx.fillStyle = `rgb(${shade + 22}, ${shade + 10}, ${shade})`;
      ctx.fillRect(x, 0, 3 + (x % 3), 512);
    }

    for (let i = 0; i < 350; i++) {
      const fx = Math.random() * 512;
      const fy = Math.random() * 512;
      const flen = 25 + Math.random() * 70;
      ctx.fillStyle = Math.random() > 0.5 ? '#140b07' : '#452b1e';
      ctx.fillRect(fx, fy, 2 + Math.random() * 3, flen);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Generates procedural botanical leaf/needle cluster texture
   */
  private createProceduralFoliageTexture(baseColorHex: string, tipColorHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const rad = 2 + Math.random() * 6.0;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      const r = Math.random();
      ctx.fillStyle = r > 0.45 ? tipColorHex : (r > 0.12 ? baseColorHex : '#18421c');
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Generates rich, dense volumetric 3D grass clump cutout texture
   */
  private createGrassTuftTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    // Draw 36 broad, tapering organic blades radiating naturally from base
    const blades = 36;
    for (let b = 0; b < blades; b++) {
      const t = b / (blades - 1);
      const startX = 256 + (t - 0.5) * 110;
      const startY = 512;
      const bladeW = 12 + Math.random() * 14;

      // Natural curved arching
      const spreadX = (t - 0.5) * 400 + (Math.random() - 0.5) * 60;
      const tipX = 256 + spreadX;
      const tipY = 40 + Math.random() * 150;
      const ctrlX = (startX + tipX) * 0.5 + (t - 0.5) * 90 + (Math.random() - 0.5) * 35;
      const ctrlY = 220 + Math.random() * 80;

      ctx.beginPath();
      ctx.moveTo(startX - bladeW * 0.5, startY);
      ctx.quadraticCurveTo(ctrlX - bladeW * 0.3, ctrlY, tipX, tipY);
      ctx.quadraticCurveTo(ctrlX + bladeW * 0.3, ctrlY, startX + bladeW * 0.5, startY);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 512, 0, tipY);
      grad.addColorStop(0, '#153617'); // Dark mossy root
      grad.addColorStop(0.35, '#26612a'); // Lush foliage green
      grad.addColorStop(0.75, '#429440'); // Rich chlorophyll blade
      grad.addColorStop(1.0, '#7ac85e'); // Sunlit golden tip
      ctx.fillStyle = grad;
      ctx.fill();

      // Sharp central blade spine highlight (solid alpha to survive alphaTest)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.strokeStyle = '#8ee462';
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * High-performance 3D Grass Tufts rendered in 1 single draw call via InstancedMesh.
   * Features strict geometric clearance testing: ZERO grass penetrates grandstands,
   * concrete barrier walls, catch fencing, pit buildings, helipad or asphalt track.
   */
  private buildGrassTufts(parent: THREE.Group): void {
    const tuftCount = 22000;
    // 2 intersecting perpendicular planes (4 triangles) for lush volume with 33% less overdraw
    const p1 = new THREE.PlaneGeometry(1.20, 0.90);
    // Lower slightly so root base vertices are buried -0.05m underground (no edge floating or z-fighting!)
    p1.translate(0, 0.40, 0);
    const p2 = p1.clone();
    p2.rotateY(Math.PI / 2);

    // Merge p1 and p2 into a single buffer geometry
    const pos1 = p1.attributes.position.array as Float32Array;
    const uv1 = p1.attributes.uv.array as Float32Array;
    const idx1 = p1.index?.array as Uint16Array;

    const pos2 = p2.attributes.position.array as Float32Array;
    const uv2 = p2.attributes.uv.array as Float32Array;
    const idx2 = p2.index?.array as Uint16Array;

    const totalPosLen = pos1.length + pos2.length;
    const totalUvLen = uv1.length + uv2.length;
    const totalIdxLen = idx1.length + idx2.length;

    const combinedPos = new Float32Array(totalPosLen);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);

    // Flare top vertices slightly outward (+15%) for a lush organic fountain shape
    for (let i = 1; i < combinedPos.length; i += 3) {
      if (combinedPos[i] > 0.4) {
        combinedPos[i - 1] *= 1.15;
        combinedPos[i + 1] *= 1.15;
      }
    }

    const combinedUv = new Float32Array(totalUvLen);
    combinedUv.set(uv1, 0);
    combinedUv.set(uv2, uv1.length);

    const offset1 = pos1.length / 3;
    const combinedIdx = new Uint16Array(totalIdxLen);
    combinedIdx.set(idx1, 0);
    for (let i = 0; i < idx2.length; i++) combinedIdx[idx1.length + i] = idx2[i] + offset1;

    const tuftGeo = new THREE.BufferGeometry();
    tuftGeo.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    tuftGeo.setAttribute('uv', new THREE.BufferAttribute(combinedUv, 2));
    tuftGeo.setIndex(new THREE.BufferAttribute(combinedIdx, 1));
    tuftGeo.computeVertexNormals();

    const instancedTufts = new THREE.InstancedMesh(tuftGeo, this.grassTuftMat, tuftCount);
    // Crucial for 60 FPS: Grass tufts do not need shadow map lookups; ambient bounce + sun provide lush lighting!
    instancedTufts.receiveShadow = false;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;

    const c = this.innerCornerCenter; // 92
    const cornerCenters = [
      { cx: c, cz: -c },
      { cx: c, cz: c },
      { cx: -c, cz: c },
      { cx: -c, cz: -c },
    ];

    /**
     * Strict spatial validation: rejects any grass tuft that would touch or penetrate:
     * - Grandstands (South or North)
     * - Pit Lane, Paddock Club Garages, Team Transporters
     * - Helipad
     * - Concrete barriers (walls) and catch fences
     * - Asphalt track surface and kerbs
     * - Gravel runoff traps
     */
    const isGrassAllowed = (gx: number, gz: number): boolean => {
      // 1. South Main Grandstand Exclusion Zone (including canopy & VIP box)
      if (gx >= -68 && gx <= 68 && gz >= -168 && gz <= -139.2) return false;

      // 2. North Grandstand Exclusion Zone
      if (gx >= -48 && gx <= 48 && gz >= 139.2 && gz <= 164) return false;

      // 3. Pit Lane, Paddock Garages & Team Transporters
      if (gx >= -60 && gx <= 56 && gz >= -124 && gz <= -86) return false;

      // 4. Helipad (radius 18m around 30, 30)
      if ((gx - 30) ** 2 + (gz - 30) ** 2 < 18 * 18) return false;

      // 5. Track Asphalt Surface & Starting Grid (Straight sections)
      if (Math.abs(gx) <= 92 && gz >= -138.8 && gz <= -121.2) return false;
      if (Math.abs(gx) <= 92 && gz >= 121.2 && gz <= 138.8) return false;
      if (gx >= 121.2 && gx <= 138.8 && Math.abs(gz) <= 92) return false;
      if (gx >= -138.8 && gx <= -121.2 && Math.abs(gz) <= 92) return false;

      // 6. Corner Curved Roads, Kerbs & Gravel Traps (in the 4 corner apexes)
      for (const cc of cornerCenters) {
        const dx = gx - cc.cx;
        const dz = gz - cc.cz;
        const signX = Math.sign(cc.cx);
        const signZ = Math.sign(cc.cz);
        if (dx * signX >= -2 && dz * signZ >= -2) {
          const distSq = dx * dx + dz * dz;
          if (distSq >= 25.5 * 25.5 && distSq <= 63.0 * 63.0) {
            return false;
          }
        }
      }

      // 7. Concrete Barrier Walls (wall thickness 0.75m + grass radius 0.65m = clearance 1.05m)
      const wallClr = 1.05;
      if (Math.abs(gx) <= 92 && (Math.abs(gz - 140) < wallClr || Math.abs(gz + 140) < wallClr)) return false;
      if (Math.abs(gz) <= 92 && (Math.abs(gx - 140) < wallClr || Math.abs(gx + 140) < wallClr)) return false;
      if (Math.abs(gx) <= 92 && (Math.abs(gz - 120) < wallClr || Math.abs(gz + 120) < wallClr)) return false;
      if (Math.abs(gz) <= 92 && (Math.abs(gx - 120) < wallClr || Math.abs(gx + 120) < wallClr)) return false;

      // Corner outer and inner curved walls
      for (const cc of cornerCenters) {
        const dx = gx - cc.cx;
        const dz = gz - cc.cz;
        const signX = Math.sign(cc.cx);
        const signZ = Math.sign(cc.cz);
        if (dx * signX >= -2 && dz * signZ >= -2) {
          const dist = Math.hypot(dx, dz);
          if (Math.abs(dist - 48.0) < wallClr) return false;
          if (Math.abs(dist - 24.0) < wallClr) return false;
        }
      }

      return true;
    };

    const addTuft = (x: number, z: number, scale = 1.0, jitter = 0.25) => {
      if (idx >= tuftCount) return;
      const jx = (Math.random() - 0.5) * jitter;
      const jz = (Math.random() - 0.5) * jitter;
      const px = x + jx;
      const pz = z + jz;
      if (!isGrassAllowed(px, pz)) return;

      dummy.position.set(px, 0.002, pz);
      dummy.scale.setScalar(scale * (0.85 + Math.random() * 0.35));
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      instancedTufts.setMatrixAt(idx, dummy.matrix);
      color.setHSL(0.27 + Math.random() * 0.04, 0.65, 0.36 + Math.random() * 0.12);
      instancedTufts.setColorAt(idx++, color);
    };

    // =========================================================================
    // 1. 4 CORNER OUTER CURVES: DENSE RUNOFF MEADOWS & FOREST FLOOR (63.6m to 96m)
    // Placed first to guarantee 100% full lush grass coverage across all 4 corner curves!
    // =========================================================================
    cornerCenters.forEach(({ cx, cz }) => {
      const signX = Math.sign(cx);
      const signZ = Math.sign(cz);
      for (let r = 63.6; r <= 96.0; r += 1.8) {
        const step = 1.25 / r;
        for (let a = 0.04; a < Math.PI / 2 - 0.04; a += step) {
          const kx = cx + signX * Math.cos(a) * r;
          const kz = cz + signZ * Math.sin(a) * r;
          addTuft(kx, kz, 1.30, 0.45);
        }
      }
    });

    // =========================================================================
    // 2. 4 CORNER INNER APEX NATURAL GREENS (Inside corner apexes, 4.0m to 23.2m)
    // =========================================================================
    cornerCenters.forEach(({ cx, cz }) => {
      const signX = Math.sign(cx);
      const signZ = Math.sign(cz);
      for (let r = 4.0; r <= 23.2; r += 1.6) {
        const step = 1.1 / r;
        for (let a = 0.06; a < Math.PI / 2 - 0.06; a += step) {
          const kx = cx - signX * Math.cos(a) * r;
          const kz = cz - signZ * Math.sin(a) * r;
          addTuft(kx, kz, 1.25, 0.35);
        }
      }
    });

    // =========================================================================
    // 3. INFIELD PERIMETER CORRIDORS (Hugging inner barrier walls & tree lines)
    // =========================================================================
    // North Infield Corridor (z ≈ 111 to 118.5)
    for (let x = -85; x <= 85; x += 1.5) {
      for (let d = 111.5; d <= 118.0; d += 2.2) {
        addTuft(x, d, 1.2, 0.4);
      }
    }

    // East Infield Corridor (x ≈ 111 to 118.5)
    for (let z = -85; z <= 85; z += 1.5) {
      for (let d = 111.5; d <= 118.0; d += 2.2) {
        addTuft(d, z, 1.2, 0.4);
      }
    }

    // West Infield Corridor (x ≈ -111 to -118.5)
    for (let z = -85; z <= 85; z += 1.5) {
      for (let d = 111.5; d <= 118.0; d += 2.2) {
        addTuft(-d, z, 1.2, 0.4);
      }
    }

    // South Infield Corridor (Flanking pit & paddock wings)
    for (let x = -85; x <= 85; x += 1.5) {
      if (x < -60 || x > 56) {
        for (let d = 111.5; d <= 118.0; d += 2.2) {
          addTuft(x, -d, 1.2, 0.4);
        }
      }
    }

    // =========================================================================
    // 4. OUTFIELD PERIMETER MEADOWS (Outside outer barriers, hugging tree corridors)
    // =========================================================================
    // South Outfield Meadow (West and East wings clear of Grandstand)
    for (let x = -135; x <= 135; x += 1.5) {
      if (x < -68 || x > 68) {
        for (let d = 142.0; d <= 152.0; d += 2.5) {
          addTuft(x, -d, 1.25, 0.45);
        }
      }
    }

    // North Outfield Meadow (West and East wings clear of North Stand)
    for (let x = -135; x <= 135; x += 1.5) {
      if (x < -48 || x > 48) {
        for (let d = 142.0; d <= 152.0; d += 2.5) {
          addTuft(x, d, 1.25, 0.45);
        }
      }
    }

    // East Outfield Meadow
    for (let z = -125; z <= 125; z += 1.5) {
      for (let d = 142.0; d <= 152.0; d += 2.5) {
        addTuft(d, z, 1.25, 0.45);
      }
    }

    // West Outfield Meadow
    for (let z = -125; z <= 125; z += 1.5) {
      for (let d = 142.0; d <= 152.0; d += 2.5) {
        addTuft(-d, z, 1.25, 0.45);
      }
    }

    // Shrink active draw count to only successfully placed instances (GPU performance boost!)
    instancedTufts.count = idx;
    instancedTufts.instanceMatrix.needsUpdate = true;
    if (instancedTufts.instanceColor) instancedTufts.instanceColor.needsUpdate = true;

    parent.add(instancedTufts);
  }

  /**
   * Terrain, Infield Landscaping, Gravel Traps and Service Perimeter Roads
   */
  private buildTerrainAndInfield(): void {
    const terrainGroup = new THREE.Group();

    // 1. Massive Ground Plane
    const groundGeo = new THREE.PlaneGeometry(750, 750, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.receiveShadow = true;
    terrainGroup.add(ground);

    // 2. Corner Gravel Runoff Traps (Behind corner apexes for realistic FIA safety)
    const corners = [
      { x: 128, z: -128, rot: 0 },
      { x: 128, z: 128, rot: Math.PI / 2 },
      { x: -128, z: 128, rot: Math.PI },
      { x: -128, z: -128, rot: -Math.PI / 2 },
    ];

    corners.forEach((c) => {
      const gravelGeo = new THREE.RingGeometry(this.cornerRadius + this.trackWidth / 2 + 1.2, this.cornerRadius + this.trackWidth / 2 + 16, 24, 1, 0, Math.PI / 2);
      gravelGeo.rotateX(-Math.PI / 2);
      const gravel = new THREE.Mesh(gravelGeo, this.gravelMat);
      const cx = c.x > 0 ? this.innerCornerCenter : -this.innerCornerCenter;
      const cz = c.z > 0 ? this.innerCornerCenter : -this.innerCornerCenter;
      gravel.position.set(cx, 0.008, cz);
      gravel.rotation.y = c.rot;
      gravel.receiveShadow = true;
      terrainGroup.add(gravel);
    });

    // 3. Infield Asphalt Service Road & Helipad
    const heliGeo = new THREE.CircleGeometry(16, 32);
    heliGeo.rotateX(-Math.PI / 2);
    const heliCanvas = document.createElement('canvas');
    heliCanvas.width = 256;
    heliCanvas.height = 256;
    const hCtx = heliCanvas.getContext('2d')!;
    hCtx.fillStyle = '#1e293b';
    hCtx.fillRect(0, 0, 256, 256);
    hCtx.lineWidth = 14;
    hCtx.strokeStyle = '#facc15';
    hCtx.beginPath();
    hCtx.arc(128, 128, 105, 0, Math.PI * 2);
    hCtx.stroke();
    hCtx.fillStyle = '#facc15';
    hCtx.font = 'bold 120px sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('H', 128, 128);
    const heliTex = new THREE.CanvasTexture(heliCanvas);
    const heliMat = new THREE.MeshStandardMaterial({ map: heliTex, roughness: 0.8 });
    const helipad = new THREE.Mesh(heliGeo, heliMat);
    helipad.position.set(30, 0.012, 30);
    helipad.receiveShadow = true;
    terrainGroup.add(helipad);

    // 4. Compacted Dirt/Soil Shoulder Transition Strips along Kerbs and Track Limits
    const c = this.innerCornerCenter; // 92
    const half = this.halfSize; // 130
    const w = this.trackWidth; // 16
    const shoulderWidth = 2.2;

    // Straight Outer Dirt Shoulders
    const straightShoulderGeoX = new THREE.PlaneGeometry(c * 2 + 16, shoulderWidth);
    straightShoulderGeoX.rotateX(-Math.PI / 2);

    const sSouth = new THREE.Mesh(straightShoulderGeoX, this.dirtShoulderMat);
    sSouth.position.set(0, 0.007, -half - w / 2 - shoulderWidth / 2 - 0.1);
    sSouth.receiveShadow = true;
    terrainGroup.add(sSouth);

    const sNorth = new THREE.Mesh(straightShoulderGeoX, this.dirtShoulderMat);
    sNorth.position.set(0, 0.007, half + w / 2 + shoulderWidth / 2 + 0.1);
    sNorth.receiveShadow = true;
    terrainGroup.add(sNorth);

    const straightShoulderGeoZ = new THREE.PlaneGeometry(shoulderWidth, c * 2 + 16);
    straightShoulderGeoZ.rotateX(-Math.PI / 2);

    const sEast = new THREE.Mesh(straightShoulderGeoZ, this.dirtShoulderMat);
    sEast.position.set(half + w / 2 + shoulderWidth / 2 + 0.1, 0.007, 0);
    sEast.receiveShadow = true;
    terrainGroup.add(sEast);

    const sWest = new THREE.Mesh(straightShoulderGeoZ, this.dirtShoulderMat);
    sWest.position.set(-half - w / 2 - shoulderWidth / 2 - 0.1, 0.007, 0);
    sWest.receiveShadow = true;
    terrainGroup.add(sWest);

    // Straight Inner Dirt Shoulders (North, East, West)
    const sNorthIn = new THREE.Mesh(straightShoulderGeoX, this.dirtShoulderMat);
    sNorthIn.position.set(0, 0.007, half - w / 2 - shoulderWidth / 2 - 0.1);
    sNorthIn.receiveShadow = true;
    terrainGroup.add(sNorthIn);

    const sEastIn = new THREE.Mesh(straightShoulderGeoZ, this.dirtShoulderMat);
    sEastIn.position.set(half - w / 2 - shoulderWidth / 2 - 0.1, 0.007, 0);
    sEastIn.receiveShadow = true;
    terrainGroup.add(sEastIn);

    const sWestIn = new THREE.Mesh(straightShoulderGeoZ, this.dirtShoulderMat);
    sWestIn.position.set(-half + w / 2 + shoulderWidth / 2 + 0.1, 0.007, 0);
    sWestIn.receiveShadow = true;
    terrainGroup.add(sWestIn);

    // 4 Corner Apex Inner Dirt Arcs
    corners.forEach((cr) => {
      const cx = cr.x > 0 ? this.innerCornerCenter : -this.innerCornerCenter;
      const cz = cr.z > 0 ? this.innerCornerCenter : -this.innerCornerCenter;
      const arcGeo = new THREE.RingGeometry(this.cornerRadius - this.trackWidth / 2 - shoulderWidth - 0.1, this.cornerRadius - this.trackWidth / 2 - 0.1, 24, 1, 0, Math.PI / 2);
      arcGeo.rotateX(-Math.PI / 2);
      const arc = new THREE.Mesh(arcGeo, this.dirtShoulderMat);
      arc.position.set(cx, 0.007, cz);
      arc.rotation.y = cr.rot + Math.PI;
      arc.receiveShadow = true;
      terrainGroup.add(arc);
    });

    // 5. Volumetric 3D Grass Tufts concentrated 100% along the track corridors
    this.buildGrassTufts(terrainGroup);

    this.group.add(terrainGroup);
  }

  /**
   * Continuous Asphalt Racing Surface with Pit Lane Integration
   */
  private buildSquareCircuitTrack(): void {
    const trackGroup = new THREE.Group();
    const half = this.halfSize;
    const w = this.trackWidth;
    const c = this.innerCornerCenter;
    const straightLen = c * 2;

    // 4 Straight Sections (Subdivided to 32 segments to match corner mesh resolution and eliminate T-junctions)
    const hGeo = new THREE.PlaneGeometry(straightLen, w, 32, 2);
    hGeo.rotateX(-Math.PI / 2);

    const vGeo = new THREE.PlaneGeometry(w, straightLen, 2, 32);
    vGeo.rotateX(-Math.PI / 2);

    // South Straight (Main straight)
    const southTrack = new THREE.Mesh(hGeo, this.asphaltMat);
    southTrack.position.set(0, 0.005, -half);
    southTrack.receiveShadow = true;
    trackGroup.add(southTrack);

    // North Straight
    const northTrack = new THREE.Mesh(hGeo, this.asphaltMat);
    northTrack.position.set(0, 0.005, half);
    northTrack.receiveShadow = true;
    trackGroup.add(northTrack);

    // East Straight
    const eastTrack = new THREE.Mesh(vGeo, this.asphaltMat);
    eastTrack.position.set(half, 0.005, 0);
    eastTrack.receiveShadow = true;
    trackGroup.add(eastTrack);

    // West Straight
    const westTrack = new THREE.Mesh(vGeo, this.asphaltMat);
    westTrack.position.set(-half, 0.005, 0);
    westTrack.receiveShadow = true;
    trackGroup.add(westTrack);

    // 4 Rounded Corner Sections
    const innerR = this.cornerRadius - w / 2;
    const outerR = this.cornerRadius + w / 2;

    // Corner 1: South-East (Turn 1)
    trackGroup.add(this.createCornerRoadMesh(c, -c, innerR, outerR, -Math.PI / 2, 0));
    // Corner 2: North-East (Turn 2)
    trackGroup.add(this.createCornerRoadMesh(c, c, innerR, outerR, 0, Math.PI / 2));
    // Corner 3: North-West (Turn 3)
    trackGroup.add(this.createCornerRoadMesh(-c, c, innerR, outerR, Math.PI / 2, Math.PI));
    // Corner 4: South-West (Turn 4)
    trackGroup.add(this.createCornerRoadMesh(-c, -c, innerR, outerR, Math.PI, Math.PI * 1.5));

    // Pit Lane Seamless Asphalt Apron
    // Flush meeting with South Straight at z = -122.0 (inner edge of South Track is -130 + 8 = -122.0).
    // Pit Apron width = 16.5, center z = -113.75 -> spans from -122.0 to -105.5 reaching all garages and mechanics.
    const pitApronGeo = new THREE.PlaneGeometry(160, 16.5, 32, 2);
    pitApronGeo.rotateX(-Math.PI / 2);
    const pitApron = new THREE.Mesh(pitApronGeo, this.asphaltMat);
    pitApron.position.set(0, 0.005, -113.75);
    pitApron.receiveShadow = true;
    trackGroup.add(pitApron);

    // Paint FIA White Road Markings & Boundary Lines
    this.buildTrackAndPitRoadLines(trackGroup);

    this.group.add(trackGroup);
  }

  /**
   * Crisp FIA Official Road Lines, High-Speed Optical Flow Markings & Racing Rubber Line
   */
  private buildTrackAndPitRoadLines(trackGroup: THREE.Group): void {
    const linesGroup = new THREE.Group();
    const whiteLineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0,
    });
    const yellowLineMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x080a0d,
      roughness: 0.30,
      metalness: 0.16,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    const half = this.halfSize;
    const w = this.trackWidth;
    const c = this.innerCornerCenter;
    const straightLen = c * 2; // 184m

    // --- A. CONTINUOUS FIA TRACK LIMIT BOUNDARY LINES (Inner & Outer edges on all 4 straights) ---
    const hLineGeo = new THREE.PlaneGeometry(straightLen, 0.25);
    hLineGeo.rotateX(-Math.PI / 2);
    const vLineGeo = new THREE.PlaneGeometry(0.25, straightLen);
    vLineGeo.rotateX(-Math.PI / 2);

    // South Straight Outer Line (z = -half - w/2 + 0.25)
    const southOuter = new THREE.Mesh(hLineGeo, whiteLineMat);
    southOuter.position.set(0, 0.009, -half - w / 2 + 0.25);
    linesGroup.add(southOuter);

    // North Straight Inner & Outer Lines
    const northOuter = new THREE.Mesh(hLineGeo, whiteLineMat);
    northOuter.position.set(0, 0.009, half + w / 2 - 0.25);
    linesGroup.add(northOuter);
    const northInner = new THREE.Mesh(hLineGeo, whiteLineMat);
    northInner.position.set(0, 0.009, half - w / 2 + 0.25);
    linesGroup.add(northInner);

    // East Straight Inner & Outer Lines
    const eastOuter = new THREE.Mesh(vLineGeo, whiteLineMat);
    eastOuter.position.set(half + w / 2 - 0.25, 0.009, 0);
    linesGroup.add(eastOuter);
    const eastInner = new THREE.Mesh(vLineGeo, whiteLineMat);
    eastInner.position.set(half - w / 2 + 0.25, 0.009, 0);
    linesGroup.add(eastInner);

    // West Straight Inner & Outer Lines
    const westOuter = new THREE.Mesh(vLineGeo, whiteLineMat);
    westOuter.position.set(-half - w / 2 + 0.25, 0.009, 0);
    linesGroup.add(westOuter);
    const westInner = new THREE.Mesh(vLineGeo, whiteLineMat);
    westInner.position.set(-half + w / 2 - 0.25, 0.009, 0);
    linesGroup.add(westInner);

    // --- B. 100% UNBROKEN RACING DASHED CENTERLINES (STRAIGHTS + ALL 4 CURVES) ---
    // 3.2m dash length, 4.8m gap (8.0m continuous cycle). Seamlessly loops around the entire circuit!
    const dashHGeo = new THREE.PlaneGeometry(3.2, 0.25);
    dashHGeo.rotateX(-Math.PI / 2);
    const dashVGeo = new THREE.PlaneGeometry(0.25, 3.2);
    dashVGeo.rotateX(-Math.PI / 2);

    // 1. South Straight (z = -half = -130, full 184m)
    for (let x = -c + 4; x <= c - 4; x += 8) {
      const dash = new THREE.Mesh(dashHGeo, whiteLineMat);
      dash.position.set(x, 0.010, -half);
      linesGroup.add(dash);
    }

    // 2. East Straight (x = half = 130, full 184m)
    for (let z = -c + 4; z <= c - 4; z += 8) {
      const dash = new THREE.Mesh(dashVGeo, whiteLineMat);
      dash.position.set(half, 0.010, z);
      linesGroup.add(dash);
    }

    // 3. North Straight (z = half = 130, full 184m)
    for (let x = -c + 4; x <= c - 4; x += 8) {
      const dash = new THREE.Mesh(dashHGeo, whiteLineMat);
      dash.position.set(x, 0.010, half);
      linesGroup.add(dash);
    }

    // 4. West Straight (x = -half = -130, full 184m)
    for (let z = -c + 4; z <= c - 4; z += 8) {
      const dash = new THREE.Mesh(dashVGeo, whiteLineMat);
      dash.position.set(-half, 0.010, z);
      linesGroup.add(dash);
    }

    // 5. Four Rounded Corners (Turn 1, Turn 2, Turn 3, Turn 4)
    // Continuous dashed line along the corner center apex arc (R = 38m)
    const cornerConfigs = [
      { cx: c, cz: -c, startA: -Math.PI / 2 }, // Turn 1: South-East
      { cx: c, cz: c, startA: 0 },             // Turn 2: North-East
      { cx: -c, cz: c, startA: Math.PI / 2 },  // Turn 3: North-West
      { cx: -c, cz: -c, startA: Math.PI },     // Turn 4: South-West
    ];

    cornerConfigs.forEach((cfg) => {
      // 7 curved dashes per corner matching the 8.0m cycle exactly
      for (let k = 0; k < 7; k++) {
        const t = (k + 0.5) / 7;
        const angle = cfg.startA + t * (Math.PI / 2);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const dash = new THREE.Mesh(dashHGeo, whiteLineMat);
        dash.position.set(cfg.cx + cosA * this.cornerRadius, 0.010, cfg.cz + sinA * this.cornerRadius);
        dash.rotation.y = -angle - Math.PI / 2;
        linesGroup.add(dash);
      }

      // Continuous Inner & Outer White Border Lines in this corner
      const innerR = this.cornerRadius - w / 2;
      const outerR = this.cornerRadius + w / 2;
      const innerLine = this.createCornerRoadMesh(
        cfg.cx,
        cfg.cz,
        innerR + 0.05,
        innerR + 0.30,
        cfg.startA,
        cfg.startA + Math.PI / 2,
        24,
        whiteLineMat,
        0.009
      );
      linesGroup.add(innerLine);

      const outerLine = this.createCornerRoadMesh(
        cfg.cx,
        cfg.cz,
        outerR - 0.30,
        outerR - 0.05,
        cfg.startA,
        cfg.startA + Math.PI / 2,
        24,
        whiteLineMat,
        0.009
      );
      linesGroup.add(outerLine);

      // Continuous Racing Rubber Line through this corner
      const cornerRubber = this.createCornerRoadMesh(
        cfg.cx,
        cfg.cz,
        this.cornerRadius - 2.5,
        this.cornerRadius + 2.5,
        cfg.startA,
        cfg.startA + Math.PI / 2,
        24,
        rubberMat,
        0.007
      );
      linesGroup.add(cornerRubber);
    });

    // --- C. DARK GLOSSY RACING RUBBER LINE (Trazada de caucho pulido de F1) ---
    const rubberHGeo = new THREE.PlaneGeometry(straightLen, 5.0);
    rubberHGeo.rotateX(-Math.PI / 2);
    const rubberVGeo = new THREE.PlaneGeometry(5.0, straightLen);
    rubberVGeo.rotateX(-Math.PI / 2);

    const northRubber = new THREE.Mesh(rubberHGeo, rubberMat);
    northRubber.position.set(0, 0.007, half - 1.2);
    linesGroup.add(northRubber);

    const eastRubber = new THREE.Mesh(rubberVGeo, rubberMat);
    eastRubber.position.set(half - 1.2, 0.007, 0);
    linesGroup.add(eastRubber);

    const westRubber = new THREE.Mesh(rubberVGeo, rubberMat);
    westRubber.position.set(-half + 1.2, 0.007, 0);
    linesGroup.add(westRubber);

    const southRubber = new THREE.Mesh(rubberHGeo, rubberMat);
    southRubber.position.set(0, 0.007, -half + 1.2);
    linesGroup.add(southRubber);

    // --- D. PIT LANE & PIT ENTRY MARKINGS ---
    // 1. South Straight Inner Track Limit Solid White Line (z = -122)
    const lineWestGeo = new THREE.PlaneGeometry(24, 0.3);
    lineWestGeo.rotateX(-Math.PI / 2);
    const lineWest = new THREE.Mesh(lineWestGeo, whiteLineMat);
    lineWest.position.set(-80, 0.010, -122);
    linesGroup.add(lineWest);

    const lineEastGeo = new THREE.PlaneGeometry(88, 0.3);
    lineEastGeo.rotateX(-Math.PI / 2);
    const lineEast = new THREE.Mesh(lineEastGeo, whiteLineMat);
    lineEast.position.set(4, 0.010, -122);
    linesGroup.add(lineEast);

    // 2. Pit Entry Deceleration Solid White Boundary Line (Curving into pit lane)
    const pitEntryLinePoints = [];
    for (let p = 0; p <= 20; p++) {
      const t = p / 20;
      const lx = -72 + t * 24;
      const lz = -122 + (1 - Math.cos(t * Math.PI)) * 0.5 * 5.8;
      pitEntryLinePoints.push(new THREE.Vector3(lx, 0.012, lz));
    }
    for (let p = 0; p < pitEntryLinePoints.length - 1; p++) {
      const p1 = pitEntryLinePoints[p];
      const p2 = pitEntryLinePoints[p + 1];
      const segLen = p1.distanceTo(p2);
      const segGeo = new THREE.PlaneGeometry(segLen, 0.3);
      segGeo.rotateX(-Math.PI / 2);
      const segMesh = new THREE.Mesh(segGeo, whiteLineMat);
      segMesh.position.set((p1.x + p2.x) / 2, 0.012, (p1.z + p2.z) / 2);
      segMesh.rotation.y = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
      linesGroup.add(segMesh);
    }

    // 3. Pit Entry Dashed Commitment Line along Main Straight
    for (let d = 0; d < 8; d++) {
      const dashGeo = new THREE.PlaneGeometry(1.5, 0.3);
      dashGeo.rotateX(-Math.PI / 2);
      const dash = new THREE.Mesh(dashGeo, whiteLineMat);
      dash.position.set(-70 + d * 3.0, 0.010, -122);
      linesGroup.add(dash);
    }

    // 4. Pit Lane Fast Lane Solid White Boundary Lines
    const pitInnerLineGeo = new THREE.PlaneGeometry(96, 0.25);
    pitInnerLineGeo.rotateX(-Math.PI / 2);
    const pitInnerLine = new THREE.Mesh(pitInnerLineGeo, whiteLineMat);
    pitInnerLine.position.set(0, 0.010, -113.2);
    linesGroup.add(pitInnerLine);

    const pitOuterLineGeo = new THREE.PlaneGeometry(96, 0.25);
    pitOuterLineGeo.rotateX(-Math.PI / 2);
    const pitOuterLine = new THREE.Mesh(pitOuterLineGeo, whiteLineMat);
    pitOuterLine.position.set(0, 0.010, -120.4);
    linesGroup.add(pitOuterLine);

    // 5. Pit Lane Center Dashed Guidance Line
    for (let pd = 0; pd < 24; pd++) {
      const pDashGeo = new THREE.PlaneGeometry(2.0, 0.2);
      pDashGeo.rotateX(-Math.PI / 2);
      const pDash = new THREE.Mesh(pDashGeo, yellowLineMat);
      pDash.position.set(-44 + pd * 4.0, 0.010, -116.8);
      linesGroup.add(pDash);
    }

    trackGroup.add(linesGroup);
  }

  /**
   * Realistic Curbs with 3D Ribbed Profile and Checkered Starting Grid
   */
  private buildKerbsAndStartingGrid(): void {
    const kerbGroup = new THREE.Group();
    const c = this.innerCornerCenter;
    const w = this.trackWidth;
    const innerR = this.cornerRadius - w / 2;
    const outerR = this.cornerRadius + w / 2;
    const kerbWidth = 1.6;

    const corners = [
      { cx: c, cz: -c, startAngle: -Math.PI / 2 },
      { cx: c, cz: c, startAngle: 0 },
      { cx: -c, cz: c, startAngle: Math.PI / 2 },
      { cx: -c, cz: -c, startAngle: Math.PI },
    ];

    corners.forEach((corner) => {
      const stepAngle = (Math.PI / 2) / 18;
      for (let i = 0; i < 18; i++) {
        const mat = i % 2 === 0 ? this.kerbRedMat : this.kerbWhiteMat;
        const angle = corner.startAngle + (i + 0.5) * stepAngle;

        // Inner Apex Curb
        const kGeo = new THREE.BoxGeometry(kerbWidth, 0.10, (innerR * stepAngle) * 1.05);
        const kMesh = new THREE.Mesh(kGeo, mat);
        const kx = corner.cx + Math.cos(angle) * (innerR - kerbWidth / 2);
        const kz = corner.cz + Math.sin(angle) * (innerR - kerbWidth / 2);
        kMesh.position.set(kx, 0.05, kz);
        kMesh.rotation.y = -angle;
        kMesh.castShadow = true;
        kerbGroup.add(kMesh);

        // Outer Exit Curb (Exit phase of corner)
        if (i > 8) {
          const okGeo = new THREE.BoxGeometry(kerbWidth, 0.10, (outerR * stepAngle) * 1.05);
          const okMesh = new THREE.Mesh(okGeo, mat);
          const okx = corner.cx + Math.cos(angle) * (outerR + kerbWidth / 2);
          const okz = corner.cz + Math.sin(angle) * (outerR + kerbWidth / 2);
          okMesh.position.set(okx, 0.05, okz);
          okMesh.rotation.y = -angle;
          okMesh.castShadow = true;
          kerbGroup.add(okMesh);
        }
      }
    });

    // Checkered Start / Finish Line
    const sfGeo = new THREE.PlaneGeometry(16, 2.5);
    sfGeo.rotateX(-Math.PI / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#09090b';
    for (let x = 0; x < 128; x += 16) {
      for (let y = 0; y < 32; y += 16) {
        if ((x / 16 + y / 16) % 2 === 0) {
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }
    const sfTex = new THREE.CanvasTexture(canvas);
    const sfMat = new THREE.MeshStandardMaterial({
      map: sfTex,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0,
    });
    const sfMesh = new THREE.Mesh(sfGeo, sfMat);
    sfMesh.position.set(0, 0.012, -this.halfSize);
    sfMesh.renderOrder = 2;
    kerbGroup.add(sfMesh);

    // Starting Grid Boxes (8 grid slots)
    for (let g = 0; g < 4; g++) {
      [-2.4, 2.4].forEach((offsetZ, sideIdx) => {
        const boxGeo = new THREE.PlaneGeometry(4.8, 2.2);
        boxGeo.rotateX(-Math.PI / 2);
        const boxMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          wireframe: true,
          polygonOffset: true,
          polygonOffsetFactor: -2.0,
          polygonOffsetUnits: -4.0,
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.set(-15 - g * 12 + sideIdx * 5, 0.015, -this.halfSize + offsetZ);
        boxMesh.renderOrder = 2;
        kerbGroup.add(boxMesh);
      });
    }

    this.group.add(kerbGroup);
  }

  /**
   * FIA Concrete Safety Barriers with Overhead Curved Steel Debris Catch Fencing
   */
  private buildConcreteBarriersWithCatchFences(): void {
    const wallHeight = 1.20;
    const wallThick = 0.75;
    const fenceHeight = 2.40;
    const half = this.halfSize;
    const w = this.trackWidth;
    const c = this.innerCornerCenter;

    const outerHalf = half + w / 2 + 2.0;
    const innerHalf = half - w / 2 - 2.0;

    // Shared material & geometry to eliminate hundreds of redundant WebGL shader and buffer switches
    const sharedRailMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 });
    const sharedPostGeo = new THREE.CylinderGeometry(0.06, 0.07, fenceHeight, 6);

    const makeWallWithFence = (x1: number, z1: number, x2: number, z2: number, hasFence: boolean = true) => {
      const length = Math.hypot(x2 - x1, z2 - z1);
      const angle = Math.atan2(x2 - x1, z2 - z1);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      // Concrete Base Block
      const wallGeo = new THREE.BoxGeometry(wallThick, wallHeight, length);
      const wall = new THREE.Mesh(wallGeo, this.concreteBarrierMat);
      wall.position.set(midX, wallHeight / 2, midZ);
      wall.rotation.y = angle;
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      // Red Top Guardrail
      const railGeo = new THREE.BoxGeometry(0.14, 0.16, length);
      const rail = new THREE.Mesh(railGeo, sharedRailMat);
      rail.position.set(midX, wallHeight + 0.08, midZ);
      rail.rotation.y = angle;
      this.group.add(rail);

      // FIA Catch Fencing (Curved Steel Posts + Wire Cables)
      if (hasFence && length > 6) {
        const postCount = Math.max(2, Math.floor(length / 5));
        for (let p = 0; p <= postCount; p++) {
          const t = p / postCount;
          const px = x1 + (x2 - x1) * t;
          const pz = z1 + (z2 - z1) * t;

          const post = new THREE.Mesh(sharedPostGeo, this.metalFenceMat);
          post.position.set(px, wallHeight + fenceHeight / 2, pz);
          this.group.add(post);
        }

        // Horizontal security cables
        for (let c = 0; c < 3; c++) {
          const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
          cableGeo.rotateX(Math.PI / 2);
          const cable = new THREE.Mesh(cableGeo, this.metalFenceMat);
          cable.position.set(midX, wallHeight + 0.6 + c * 0.7, midZ);
          cable.rotation.y = angle;
          this.group.add(cable);
        }
      }

      this.staticObstacles.push({
        x: midX,
        z: midZ,
        radius: length / 2,
        isWallSegment: true,
        p1: { x: x1, z: z1 },
        p2: { x: x2, z: z2 },
        type: 'wall',
      });
    };

    // Straight Outer Walls with Catch Fencing
    makeWallWithFence(-c, -outerHalf, c, -outerHalf, true);
    makeWallWithFence(-c, outerHalf, c, outerHalf, true);
    makeWallWithFence(outerHalf, -c, outerHalf, c, true);
    makeWallWithFence(-outerHalf, -c, -outerHalf, c, true);

    // Pit Wall separating main track and pit lane on South straight
    makeWallWithFence(-48, -122.0, 44, -122.0, false);

    // Infield Back Wall behind Pit Garages
    makeWallWithFence(-c, -105.8, c, -105.8, false);

    // 3 Straight Inner Walls (North, East, West)
    makeWallWithFence(-c, innerHalf, c, innerHalf, true);
    makeWallWithFence(innerHalf, -c, innerHalf, c, true);
    makeWallWithFence(-innerHalf, -c, -innerHalf, c, true);

    // Rounded Corner Outer Barrier Walls
    const corners = [
      { cx: c, cz: -c, start: -Math.PI / 2 },
      { cx: c, cz: c, start: 0 },
      { cx: -c, cz: c, start: Math.PI / 2 },
      { cx: -c, cz: -c, start: Math.PI },
    ];

    const outerR = this.cornerRadius + w / 2 + 2.0;
    corners.forEach((corn) => {
      const segs = 6;
      const step = (Math.PI / 2) / segs;
      for (let s = 0; s < segs; s++) {
        const a1 = corn.start + s * step;
        const a2 = corn.start + (s + 1) * step;
        const x1 = corn.cx + Math.cos(a1) * outerR;
        const z1 = corn.cz + Math.sin(a1) * outerR;
        const x2 = corn.cx + Math.cos(a2) * outerR;
        const z2 = corn.cz + Math.sin(a2) * outerR;
        makeWallWithFence(x1, z1, x2, z2, true);
      }
    });
  }

  /**
   * Realistic High-Impact Tecpro Energy Absorbing Barrier Blocks in Runoff Zones
   */
  private buildTecproRunoffZones(): void {
    const tecproGroup = new THREE.Group();
    const c = this.innerCornerCenter;
    const w = this.trackWidth;
    const outerR = this.cornerRadius + w / 2 + 1.2;

    const corners = [
      { cx: c, cz: -c, start: -Math.PI / 2 },
      { cx: c, cz: c, start: 0 },
      { cx: -c, cz: c, start: Math.PI / 2 },
      { cx: -c, cz: -c, start: Math.PI },
    ];

    corners.forEach((corn) => {
      // 8 Tecpro blocks lining the high-impact zone of each corner runoff
      for (let b = 0; b < 8; b++) {
        const angle = corn.start + (b + 0.5) * ((Math.PI / 2) / 8);
        const bx = corn.cx + Math.cos(angle) * (outerR + 0.8);
        const bz = corn.cz + Math.sin(angle) * (outerR + 0.8);

        const blockGeo = new THREE.BoxGeometry(0.85, 1.1, 1.8);
        const mat = b % 2 === 0 ? this.tecproRedMat : this.tecproWhiteMat;
        const block = new THREE.Mesh(blockGeo, mat);
        block.position.set(bx, 0.55, bz);
        block.rotation.y = -angle;
        block.receiveShadow = true;
        tecproGroup.add(block);
      }
    });

    this.group.add(tecproGroup);
  }

  /**
   * FIA Marshal Posts with Elevated Viewing Platforms, Flags, and Digital LED Signal Boards
   */
  private buildMarshalSafetyPosts(): void {
    const marshalGroup = new THREE.Group();
    const postLocations = [
      { x: 92, z: -145, rot: 0, sector: 'S1' },
      { x: 145, z: 92, rot: Math.PI / 2, sector: 'S2' },
      { x: -92, z: 145, rot: Math.PI, sector: 'S3' },
      { x: -145, z: -92, rot: -Math.PI / 2, sector: 'S4' },
    ];

    postLocations.forEach((loc) => {
      const singlePost = new THREE.Group();
      singlePost.position.set(loc.x, 0, loc.z);
      singlePost.rotation.y = loc.rot;

      // Elevated Steel Scaffold Platform
      const scaffoldGeo = new THREE.BoxGeometry(3.5, 3.2, 2.5);
      const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const scaffold = new THREE.Mesh(scaffoldGeo, scaffoldMat);
      scaffold.position.y = 1.6;
      singlePost.add(scaffold);

      // Cabin / Roof
      const roofGeo = new THREE.BoxGeometry(4.0, 0.3, 3.0);
      const roof = new THREE.Mesh(roofGeo, this.metalSilverMat);
      roof.position.y = 4.8;
      singlePost.add(roof);

      // Digital FIA LED Signal Board (Green/Yellow Racing Matrix)
      const ledGeo = new THREE.BoxGeometry(1.4, 0.9, 0.2);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x22c55e, // Radiant green flag LED
        emissiveIntensity: 3.2,
      });
      const ledBoard = new THREE.Mesh(ledGeo, ledMat);
      ledBoard.position.set(0, 3.8, 1.35);
      singlePost.add(ledBoard);

      marshalGroup.add(singlePost);
    });

    this.group.add(marshalGroup);
  }

  /**
   * Massive Covered Multi-Tiered Grandstand with VIP Corporate Suites and Real Sponsors
   */
  private buildGrandstands(): void {
    const standsGroup = new THREE.Group();

    // 1. South Main Grandstand (120m long, covered cantilevered canopy)
    const standLength = 120;
    const standDepth = 18;
    const standHeight = 14;

    // Concrete Base
    const baseGeo = new THREE.BoxGeometry(standLength, 2.5, standDepth);
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
    baseMesh.position.set(0, 1.25, -154);
    baseMesh.castShadow = true;
    standsGroup.add(baseMesh);

    // 8 Tiered Seating Rows with Alternating FIA Red and Sapphire Blue Seats
    const tiers = 8;
    for (let t = 0; t < tiers; t++) {
      const tierGeo = new THREE.BoxGeometry(standLength, 1.2, standDepth / tiers);
      const seatMat = new THREE.MeshStandardMaterial({
        color: t % 2 === 0 ? 0xdc2626 : 0x1d4ed8,
        roughness: 0.45,
        metalness: 0.1,
      });
      const tierMesh = new THREE.Mesh(tierGeo, seatMat);
      tierMesh.position.set(0, 2.5 + t * 1.15, -154 + (t - tiers / 2) * (standDepth / tiers));
      tierMesh.castShadow = true;
      standsGroup.add(tierMesh);
    }

    // Upper VIP Glass Corporate Suites
    const vipGeo = new THREE.BoxGeometry(standLength - 8, 3.5, 4.5);
    const vipBuilding = new THREE.Mesh(vipGeo, this.metalDarkMat);
    vipBuilding.position.set(0, standHeight + 0.5, -160);
    standsGroup.add(vipBuilding);

    const glassFrontGeo = new THREE.BoxGeometry(standLength - 10, 2.6, 0.2);
    const glassFront = new THREE.Mesh(glassFrontGeo, this.glassMat);
    glassFront.position.set(0, standHeight + 0.5, -157.6);
    standsGroup.add(glassFront);

    // Cantilevered Aerodynamic Steel Roof Canopy
    const roofGeo = new THREE.BoxGeometry(standLength + 6, 0.6, standDepth + 8);
    roofGeo.rotateX(0.14);
    const roof = new THREE.Mesh(roofGeo, this.metalSilverMat);
    roof.position.set(0, standHeight + 3.2, -151);
    roof.castShadow = true;
    standsGroup.add(roof);

    // High-Resolution Trackside Sponsor Hoardings
    const sponsorGeo = new THREE.BoxGeometry(standLength, 2.4, 0.2);
    const sponsorCanvas = document.createElement('canvas');
    sponsorCanvas.width = 1024;
    sponsorCanvas.height = 128;
    const sCtx = sponsorCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 1024, 128);
    sCtx.fillStyle = '#ef4444';
    sCtx.fillRect(0, 116, 1024, 12);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = 'bold 52px sans-serif';
    sCtx.fillText('APEX GRAND PRIX  ·  PIRELLI  ·  BREMBO  ·  SHELL  ·  ROLEX', 24, 82);
    const sponsorTex = new THREE.CanvasTexture(sponsorCanvas);
    const sponsorMat = new THREE.MeshBasicMaterial({ map: sponsorTex });
    const sponsorMesh = new THREE.Mesh(sponsorGeo, sponsorMat);
    sponsorMesh.position.set(0, 2.8, -144.2);
    standsGroup.add(sponsorMesh);

    // 2. North Bank Open Grandstand (80m long)
    const northLength = 80;
    const northBaseGeo = new THREE.BoxGeometry(northLength, 1.8, 14);
    const northBase = new THREE.Mesh(northBaseGeo, concreteMat);
    northBase.position.set(0, 0.9, 152);
    northBase.castShadow = true;
    standsGroup.add(northBase);

    for (let nt = 0; nt < 5; nt++) {
      const nTierGeo = new THREE.BoxGeometry(northLength, 1.0, 14 / 5);
      const nSeatMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 });
      const nTier = new THREE.Mesh(nTierGeo, nSeatMat);
      nTier.position.set(0, 1.8 + nt * 0.9, 152 + (nt - 2.5) * (14 / 5));
      nTier.castShadow = true;
      standsGroup.add(nTier);
    }

    this.group.add(standsGroup);
  }

  /**
   * Two-Story Modern Paddock Club & Pit Garages with Workshop Lighting
   */
  private buildPaddockBuildingAndPitLane(): void {
    const paddockGroup = new THREE.Group();

    // 1. Two-Story Paddock Club Building (90m length x 14m depth x 8.5m height, front facade at Z = -106.0)
    const buildingLength = 90;
    const buildingGeo = new THREE.BoxGeometry(buildingLength, 8.5, 14);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.4,
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(-2.5, 4.25, -99.0);
    building.castShadow = true;
    paddockGroup.add(building);

    // Architectural White/Silver Cladding Overhang
    const canopyGeo = new THREE.BoxGeometry(buildingLength + 2, 0.4, 15.5);
    const canopyMesh = new THREE.Mesh(canopyGeo, this.metalSilverMat);
    canopyMesh.position.set(-2.5, 8.6, -99.0);
    paddockGroup.add(canopyMesh);

    // West Facade facing Pit Entry (x = -47.5): Architectural Sponsor Logo & Glass
    const westSignGeo = new THREE.PlaneGeometry(12, 5.5);
    westSignGeo.rotateY(-Math.PI / 2);
    const wsCanvas = document.createElement('canvas');
    wsCanvas.width = 512;
    wsCanvas.height = 256;
    const wsCtx = wsCanvas.getContext('2d')!;
    wsCtx.fillStyle = '#0f172a';
    wsCtx.fillRect(0, 0, 512, 256);
    wsCtx.fillStyle = '#ef4444';
    wsCtx.fillRect(0, 0, 512, 12);
    wsCtx.fillStyle = '#ffffff';
    wsCtx.font = 'black 46px sans-serif';
    wsCtx.textAlign = 'center';
    wsCtx.fillText('PADDOCK CLUB', 256, 110);
    wsCtx.fillStyle = '#f59e0b';
    wsCtx.font = 'bold 32px monospace';
    wsCtx.fillText('VIP PIT HOSPITALITY', 256, 175);
    const wsTex = new THREE.CanvasTexture(wsCanvas);
    const wsMat = new THREE.MeshStandardMaterial({ map: wsTex, roughness: 0.3 });
    const westSign = new THREE.Mesh(westSignGeo, wsMat);
    westSign.position.set(-47.55, 4.5, -99.0);
    paddockGroup.add(westSign);

    // Upper VIP Glass Facade
    const vipGlassGeo = new THREE.PlaneGeometry(buildingLength - 4, 3.2);
    const vipGlass = new THREE.Mesh(vipGlassGeo, this.glassMat);
    vipGlass.position.set(-2.5, 6.4, -106.1);
    paddockGroup.add(vipGlass);

    // 5 Official F1 Team Paddock Garages (Aligned side-by-side in true F1 pit lane order)
    const garageConfigs = [
      { id: 'scuderia', name: 'SCUDERIA CORSA', num: '#16 LEC', color: 0xdc2626, accent: 0xfacc15, x: -24.0, textCol: '#ffffff' },
      { id: 'silver_arrow', name: 'SILVER ARROW F1', num: '#63 RUS', color: 0x475569, accent: 0x06b6d4, x: -12.0, textCol: '#06b6d4' },
      { id: 'player', name: 'APEX RACING GP', num: '#1 YOU', color: 0x1d4ed8, accent: 0xfacc15, x: 0.0, textCol: '#facc15' },
      { id: 'papaya', name: 'PAPAYA RACING', num: '#4 NOR', color: 0xea580c, accent: 0x0284c7, x: 12.0, textCol: '#ffffff' },
      { id: 'emerald', name: 'EMERALD GRAND PRIX', num: '#14 ALO', color: 0x065f46, accent: 0x84cc16, x: 24.0, textCol: '#84cc16' },
    ];

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.35,
    });
    const doorGeo = new THREE.PlaneGeometry(10.8, 3.8);

    garageConfigs.forEach((team) => {
      const doorX = team.x;

      // 1. Roll-Up Garage Door (Z = -106.1)
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(doorX, 1.9, -106.1);
      paddockGroup.add(door);

      // 2. High-Resolution Team Header Fascia Banner
      const headerCanvas = document.createElement('canvas');
      headerCanvas.width = 512;
      headerCanvas.height = 128;
      const hCtx = headerCanvas.getContext('2d')!;
      
      // Base livery gradient
      const grad = hCtx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.35, `#${team.color.toString(16).padStart(6, '0')}`);
      grad.addColorStop(1, '#0f172a');
      hCtx.fillStyle = grad;
      hCtx.fillRect(0, 0, 512, 128);

      // Accent border
      hCtx.fillStyle = `#${team.accent.toString(16).padStart(6, '0')}`;
      hCtx.fillRect(0, 118, 512, 10);
      hCtx.fillRect(0, 0, 512, 6);

      // Team Branding & Driver Number
      hCtx.fillStyle = team.textCol;
      hCtx.font = '900 38px sans-serif';
      hCtx.textAlign = 'center';
      hCtx.fillText(team.name, 256, 62);
      hCtx.font = 'bold 26px monospace';
      hCtx.fillStyle = '#ffffff';
      hCtx.fillText(team.num, 256, 100);

      const headerTex = new THREE.CanvasTexture(headerCanvas);
      const headerMat = new THREE.MeshBasicMaterial({ map: headerTex });
      const headerGeo = new THREE.PlaneGeometry(10.8, 0.95);
      const header = new THREE.Mesh(headerGeo, headerMat);
      header.position.set(doorX, 4.25, -106.05);
      paddockGroup.add(header);

      // 3. FIA Pit Box Markings on Asphalt (Centered in Working Apron at Z = -110.5)
      const stallBoxGeo = new THREE.PlaneGeometry(4.8, 8.5);
      stallBoxGeo.rotateX(-Math.PI / 2);
      const stallCanvas = document.createElement('canvas');
      stallCanvas.width = 256;
      stallCanvas.height = 512;
      const sCtx = stallCanvas.getContext('2d')!;
      sCtx.clearRect(0, 0, 256, 512);

      // White perimeter box
      sCtx.strokeStyle = '#ffffff';
      sCtx.lineWidth = 14;
      sCtx.strokeRect(10, 10, 236, 492);

      // Yellow wheel gun target markings
      sCtx.fillStyle = '#facc15';
      sCtx.fillRect(16, 80, 48, 48);
      sCtx.fillRect(192, 80, 48, 48);
      sCtx.fillRect(16, 380, 48, 48);
      sCtx.fillRect(192, 380, 48, 48);

      // Center stop crossbar
      sCtx.fillStyle = '#ef4444';
      sCtx.fillRect(40, 240, 176, 28);

      // Team acronym stencil
      sCtx.font = 'bold 36px monospace';
      sCtx.fillStyle = '#ffffff';
      sCtx.textAlign = 'center';
      sCtx.fillText(team.num.split(' ')[1] || 'BOX', 128, 200);

      const stallTex = new THREE.CanvasTexture(stallCanvas);
      const stallMat = new THREE.MeshStandardMaterial({
        map: stallTex,
        transparent: true,
        roughness: 0.6,
      });
      const stallMesh = new THREE.Mesh(stallBoxGeo, stallMat);
      stallMesh.position.set(doorX, 0.015, -110.5);
      paddockGroup.add(stallMesh);

      // 4. Pit Wall Telemetry Gantry
      const standGantryGeo = new THREE.BoxGeometry(3.2, 2.2, 0.8);
      const standGantry = new THREE.Mesh(standGantryGeo, this.metalDarkMat);
      standGantry.position.set(doorX, 2.1, -122.6);
      paddockGroup.add(standGantry);

      // Glowing Timing Screens with Team Colors
      const monitorGeo = new THREE.PlaneGeometry(1.4, 0.8);
      const monitorMat = new THREE.MeshBasicMaterial({ color: team.accent });
      const monitor = new THREE.Mesh(monitorGeo, monitorMat);
      monitor.position.set(doorX, 2.2, -122.15);
      paddockGroup.add(monitor);
    });

    this.group.add(paddockGroup);
  }

  /**
   * FIA Grade-1 High-Fidelity Pit Lane Entry & Exit Architecture
   * Includes Impact Attenuator Crash Cushion, Pit Limiter Speed & Timing Gantry,
   * Chevron Deceleration Road Markings, Fluorescent Apex Bollards, and Marshal Safety Station.
   */
  private buildPitEntryAndExitArchitecture(): void {
    const pitEntryGroup = new THREE.Group();

    // =========================================================================
    // 1. FIA HIGH-SPEED IMPACT ATTENUATOR / CRASH CUSHION (Pit Wall Entry Nose)
    // =========================================================================
    const noseX = -48;
    const noseZ = -122.0;

    // A. Main Crash Cushion Wedge
    const cushionGeo = new THREE.BoxGeometry(2.4, 1.35, 1.2);
    const cushionCanvas = document.createElement('canvas');
    cushionCanvas.width = 256;
    cushionCanvas.height = 128;
    const cCtx = cushionCanvas.getContext('2d')!;
    cCtx.fillStyle = '#facc15'; // High-visibility safety yellow
    cCtx.fillRect(0, 0, 256, 128);
    // Black chevron hazard diagonal stripes
    cCtx.fillStyle = '#09090b';
    cCtx.lineWidth = 28;
    for (let x = -100; x < 350; x += 55) {
      cCtx.beginPath();
      cCtx.moveTo(x, 128);
      cCtx.lineTo(x + 50, 0);
      cCtx.lineTo(x + 75, 0);
      cCtx.lineTo(x + 25, 128);
      cCtx.fill();
    }
    const cushionTex = new THREE.CanvasTexture(cushionCanvas);
    const cushionMat = new THREE.MeshStandardMaterial({
      map: cushionTex,
      roughness: 0.5,
      metalness: 0.2,
    });
    const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
    cushionMesh.position.set(noseX - 1.2, 0.68, noseZ);
    cushionMesh.castShadow = true;
    pitEntryGroup.add(cushionMesh);

    // B. Stepped Energy-Absorbing Steel Deceleration Cylinders (QuadGuard style)
    for (let cyl = 0; cyl < 4; cyl++) {
      const cylGeo = new THREE.CylinderGeometry(0.48 - cyl * 0.04, 0.48 - cyl * 0.04, 1.2, 16);
      const cylMat = new THREE.MeshStandardMaterial({ color: cyl % 2 === 0 ? 0xfacc15 : 0x1e293b, roughness: 0.4 });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      cylMesh.position.set(noseX - 2.8 - cyl * 0.85, 0.6, noseZ);
      cylMesh.castShadow = true;
      pitEntryGroup.add(cylMesh);
    }

    // C. High-Intensity Flashing Amber LED Warning Beacon on Nose
    const beaconBaseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 12);
    const beaconBase = new THREE.Mesh(beaconBaseGeo, this.metalDarkMat);
    beaconBase.position.set(noseX - 0.8, 1.5, noseZ);
    pitEntryGroup.add(beaconBase);

    const beaconLightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 12);
    const beaconLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf59e0b,
      emissiveIntensity: 6.0,
      roughness: 0.1,
    });
    const beaconLight = new THREE.Mesh(beaconLightGeo, beaconLightMat);
    beaconLight.position.set(noseX - 0.8, 1.75, noseZ);
    pitEntryGroup.add(beaconLight);

    // =========================================================================
    // 2. LUXURY FORMULA 1 PIT ENTRY SPEED & STATUS GANTRY (x = -54, aligned to pit wall)
    // =========================================================================
    const gantryX = -54;
    const gantryH = 5.8;
    const pitWallZ = -122.0;  // Left column aligns EXACTLY with the pit wall
    const paddockWallZ = -106.0; // Right column aligns with paddock side (16.0m wide open entrance)
    const gantryCenterZ = (pitWallZ + paddockWallZ) / 2; // -114.0
    const gantrySpan = Math.abs(pitWallZ - paddockWallZ); // 16.0m

    // Heavy-duty Brushed Titanium Columns (Pit Wall side and Paddock side)
    const colGeo = new THREE.BoxGeometry(0.65, gantryH, 0.65);
    const colLeft = new THREE.Mesh(colGeo, this.metalDarkMat);
    colLeft.position.set(gantryX, gantryH / 2, pitWallZ);
    colLeft.castShadow = true;
    pitEntryGroup.add(colLeft);

    const colRight = new THREE.Mesh(colGeo, this.metalDarkMat);
    colRight.position.set(gantryX, gantryH / 2, paddockWallZ);
    colRight.castShadow = true;
    pitEntryGroup.add(colRight);

    // Crossbar Gantry Truss with Carbon-Titanium Casing (Only spans the pit lane)
    const crossGeo = new THREE.BoxGeometry(0.85, 1.25, gantrySpan + 0.65);
    const crossMesh = new THREE.Mesh(crossGeo, this.metalDarkMat);
    crossMesh.position.set(gantryX, gantryH - 0.55, gantryCenterZ);
    crossMesh.castShadow = true;
    pitEntryGroup.add(crossMesh);

    // Luxury FIA High-Definition Digital Sign Display
    const gantrySignCanvas = document.createElement('canvas');
    gantrySignCanvas.width = 1024;
    gantrySignCanvas.height = 256;
    const gCtx = gantrySignCanvas.getContext('2d')!;

    // Deep Obsidian / Carbon Matrix Backing
    gCtx.fillStyle = '#0a0d14';
    gCtx.fillRect(0, 0, 1024, 256);

    // Subtle Carbon-Fiber Pattern
    gCtx.fillStyle = '#111827';
    for (let y = 0; y < 256; y += 8) {
      for (let x = (y % 16 === 0 ? 0 : 8); x < 1024; x += 16) {
        gCtx.fillRect(x, y, 8, 8);
      }
    }

    // Elegant Brushed Gold and Crimson Accent Trim
    gCtx.fillStyle = '#f59e0b'; // Luxury Gold Trim
    gCtx.fillRect(0, 0, 1024, 8);
    gCtx.fillStyle = '#ef4444'; // FIA Racing Red
    gCtx.fillRect(0, 248, 1024, 8);

    // Top Header: Swiss Clean Typography
    gCtx.fillStyle = '#94a3b8';
    gCtx.font = 'bold 26px sans-serif';
    gCtx.textAlign = 'left';
    gCtx.fillText('FIA PIT ENTRY CONTROL', 48, 48);

    // Status Pill: [● PIT OPEN ●] with elegant emerald LED
    gCtx.fillStyle = '#064e3b';
    gCtx.fillRect(720, 22, 250, 36);
    gCtx.strokeStyle = '#10b981';
    gCtx.lineWidth = 2;
    gCtx.strokeRect(720, 22, 250, 36);
    gCtx.fillStyle = '#34d399';
    gCtx.font = 'bold 22px monospace';
    gCtx.textAlign = 'center';
    gCtx.fillText('● PIT OPEN ●', 845, 48);

    // Center Roundel: International FIA Speed Limit 60 Badge (Red Circle + Pure White Inside + Black '60')
    const badgeX = 220;
    const badgeY = 145;
    const badgeR = 64;

    // Red Outer Warning Ring
    gCtx.fillStyle = '#dc2626';
    gCtx.beginPath();
    gCtx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    gCtx.fill();

    // White Core Disc
    gCtx.fillStyle = '#ffffff';
    gCtx.beginPath();
    gCtx.arc(badgeX, badgeY, badgeR * 0.76, 0, Math.PI * 2);
    gCtx.fill();

    // Bold Speed Number '60'
    gCtx.fillStyle = '#09090b';
    gCtx.font = '900 64px sans-serif';
    gCtx.textAlign = 'center';
    gCtx.textBaseline = 'middle';
    gCtx.fillText('60', badgeX, badgeY + 3);

    // Right Main Text: Crisp Luxury High-Resolution Typography
    gCtx.textAlign = 'left';
    gCtx.textBaseline = 'alphabetic';
    gCtx.fillStyle = '#ffffff';
    gCtx.font = '900 58px sans-serif';
    gCtx.fillText('PIT SPEED LIMIT', 320, 135);

    gCtx.fillStyle = '#f59e0b';
    gCtx.font = 'bold 30px monospace';
    gCtx.fillText('MAX 60 KM/H · ENGAGE LIMITER', 320, 185);

    const gantrySignTex = new THREE.CanvasTexture(gantrySignCanvas);
    const gantrySignMat = new THREE.MeshStandardMaterial({
      map: gantrySignTex,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: gantrySignTex,
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.4,
    });
    const gantrySignGeo = new THREE.PlaneGeometry(6.8, 1.8);
    gantrySignGeo.rotateY(-Math.PI / 2); // Facing incoming cars from West
    const gantrySign = new THREE.Mesh(gantrySignGeo, gantrySignMat);
    gantrySign.position.set(gantryX - 0.45, gantryH - 0.55, gantryCenterZ);
    pitEntryGroup.add(gantrySign);

    // FIA CCTV Telemetry Cameras on Gantry
    for (let cam = 0; cam < 2; cam++) {
      const camHousingGeo = new THREE.BoxGeometry(0.35, 0.25, 0.45);
      const camHousing = new THREE.Mesh(camHousingGeo, this.metalSilverMat);
      camHousing.position.set(gantryX - 0.5, gantryH - 1.1, gantryCenterZ - 2.0 + cam * 4.0);
      pitEntryGroup.add(camHousing);

      const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
      lensGeo.rotateX(Math.PI / 2);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(gantryX - 0.7, gantryH - 1.1, gantryCenterZ - 2.0 + cam * 4.0);
      pitEntryGroup.add(lens);
    }

    // =========================================================================
    // 3. ROAD MARKINGS: FIA CHEVRON DECELERATION HATCHING & LIMITER LINE
    // =========================================================================
    // A. Triangular Chevron Island between Main Track and Pit Lane (x: -74 to -48)
    const chevronGeo = new THREE.PlaneGeometry(28, 7.5);
    chevronGeo.rotateX(-Math.PI / 2);
    chevronGeo.rotateY(0.28);
    const chevronCanvas = document.createElement('canvas');
    chevronCanvas.width = 512;
    chevronCanvas.height = 256;
    const chCtx = chevronCanvas.getContext('2d')!;
    chCtx.fillStyle = 'rgba(20, 20, 25, 0.0)'; // Transparent base
    chCtx.fillRect(0, 0, 512, 256);

    // Solid Perimeter White Line
    chCtx.strokeStyle = '#ffffff';
    chCtx.lineWidth = 14;
    chCtx.beginPath();
    chCtx.moveTo(20, 230);
    chCtx.lineTo(490, 128);
    chCtx.lineTo(20, 26);
    chCtx.closePath();
    chCtx.stroke();

    // Diagonal White Chevron Stripes (FIA Safety Standard)
    chCtx.lineWidth = 16;
    for (let px = 60; px < 460; px += 42) {
      chCtx.beginPath();
      chCtx.moveTo(px, 220);
      chCtx.lineTo(px + 45, 128);
      chCtx.lineTo(px, 36);
      chCtx.stroke();
    }

    const chevronTex = new THREE.CanvasTexture(chevronCanvas);
    const chevronMat = new THREE.MeshBasicMaterial({
      map: chevronTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0,
    });
    const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
    chevronMesh.position.set(-61, 0.012, -124.8);
    chevronMesh.renderOrder = 2;
    pitEntryGroup.add(chevronMesh);

    // B. Transverse Pit Limiter Ground Road Line (at x = -54, spanning exactly the wide pit lane)
    const limiterLineGeo = new THREE.PlaneGeometry(1.6, 15.5);
    limiterLineGeo.rotateX(-Math.PI / 2);
    const limiterCanvas = document.createElement('canvas');
    limiterCanvas.width = 128;
    limiterCanvas.height = 512;
    const lCtx = limiterCanvas.getContext('2d')!;
    // Red & White chequered safety band
    for (let y = 0; y < 512; y += 32) {
      lCtx.fillStyle = (y / 32) % 2 === 0 ? '#ef4444' : '#ffffff';
      lCtx.fillRect(0, y, 128, 32);
    }
    const limiterTex = new THREE.CanvasTexture(limiterCanvas);
    const limiterMat = new THREE.MeshBasicMaterial({
      map: limiterTex,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -4.0,
    });
    const limiterLine = new THREE.Mesh(limiterLineGeo, limiterMat);
    limiterLine.position.set(gantryX, 0.014, gantryCenterZ);
    limiterLine.renderOrder = 2;
    pitEntryGroup.add(limiterLine);

    // C. Heavy Tire Skid / Deceleration Rubber Marks on Pit Entry Tarmac
    const skidGeo = new THREE.PlaneGeometry(36, 6.0);
    skidGeo.rotateX(-Math.PI / 2);
    skidGeo.rotateY(0.42);
    const skidCanvas = document.createElement('canvas');
    skidCanvas.width = 512;
    skidCanvas.height = 128;
    const skCtx = skidCanvas.getContext('2d')!;
    skCtx.fillStyle = 'rgba(0,0,0,0)';
    skCtx.fillRect(0, 0, 512, 128);
    // Dark dual tire rubber trails
    const drawTireRubber = (offsetY: number) => {
      const grad = skCtx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0.0, 'rgba(10, 10, 12, 0.0)');
      grad.addColorStop(0.3, 'rgba(10, 10, 12, 0.65)');
      grad.addColorStop(0.8, 'rgba(10, 10, 12, 0.85)');
      grad.addColorStop(1.0, 'rgba(10, 10, 12, 0.35)');
      skCtx.fillStyle = grad;
      skCtx.fillRect(0, offsetY, 512, 14);
    };
    drawTireRubber(32);
    drawTireRubber(82);
    const skidTex = new THREE.CanvasTexture(skidCanvas);
    const skidMat = new THREE.MeshBasicMaterial({
      map: skidTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });
    const skidMesh = new THREE.Mesh(skidGeo, skidMat);
    skidMesh.position.set(-66, 0.011, -121.8);
    skidMesh.renderOrder = 1;
    pitEntryGroup.add(skidMesh);

    // =========================================================================
    // 4. FLUORESCENT BOLLARDS (Strictly on the dividing island, NOT invading track)
    // =========================================================================
    for (let b = 0; b < 6; b++) {
      const bt = b / 5;
      // Positioned strictly along the dividing island leading safely to the crash cushion
      const bx = -56 + bt * 7.5;
      const bz = -123.2 + bt * 2.0;

      const bollardGroup = new THREE.Group();
      bollardGroup.position.set(bx, 0, bz);

      // Flexible Orange Polyurethane Post (0.75m tall)
      const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.75, 12);
      const postMat = new THREE.MeshStandardMaterial({
        color: 0xf97316, // Fluorescent safety orange
        roughness: 0.3,
        metalness: 0.1,
      });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.375;
      bollardGroup.add(post);

      // 3M Retroreflective White Bands
      for (let r = 0; r < 2; r++) {
        const ringGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.10, 12);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.48 + r * 0.16;
        bollardGroup.add(ring);
      }

      pitEntryGroup.add(bollardGroup);
    }

    // =========================================================================
    // 5. ENTRY MARSHAL SAFETY POST & FIRE STATION (Integrated into Pit Wall)
    // =========================================================================
    const marshalX = -44;
    const marshalZ = -123.8; // Aligned directly on top of the pit wall

    // Platform Base
    const mBaseGeo = new THREE.BoxGeometry(2.4, 1.8, 0.9);
    const mBase = new THREE.Mesh(mBaseGeo, this.metalDarkMat);
    mBase.position.set(marshalX, 1.9, marshalZ);
    mBase.castShadow = true;
    pitEntryGroup.add(mBase);

    // Platform Canopy Roof
    const mRoofGeo = new THREE.BoxGeometry(2.8, 0.15, 1.2);
    const mRoof = new THREE.Mesh(mRoofGeo, this.metalSilverMat);
    mRoof.position.set(marshalX, 3.4, marshalZ);
    pitEntryGroup.add(mRoof);

    // Electronic Flag LED Matrix Display (Green / Yellow / SC)
    const eFlagGeo = new THREE.BoxGeometry(1.0, 0.65, 0.15);
    const eFlagMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x22c55e, // Glowing Green Light
      emissiveIntensity: 4.5,
    });
    const eFlag = new THREE.Mesh(eFlagGeo, eFlagMat);
    eFlag.position.set(marshalX - 0.6, 2.6, marshalZ + 0.45);
    pitEntryGroup.add(eFlag);

    // Fire Extinguishers (Red steel cylinders with chrome nozzles)
    for (let fe = 0; fe < 2; fe++) {
      const feGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 12);
      const feMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.2 });
      const feMesh = new THREE.Mesh(feGeo, feMat);
      feMesh.position.set(marshalX + 0.4 + fe * 0.35, 2.1, marshalZ);
      pitEntryGroup.add(feMesh);
    }

    // =========================================================================
    // 6. MOTORSPORT SPONSOR BANNERS ALONG PIT WALL (Rolex, Pirelli, Brembo, Apex GT)
    // =========================================================================
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext('2d')!;
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 1024, 128);
    bCtx.fillStyle = '#ef4444';
    bCtx.fillRect(0, 0, 1024, 8);
    bCtx.fillStyle = '#f59e0b';
    bCtx.fillRect(0, 120, 1024, 8);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = 'black 44px sans-serif';
    bCtx.fillText('APEX GT PIT LANE  ·  ROLEX  ·  PIRELLI  ·  BREMBO  ·  SHELL', 28, 78);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4 });
    const bannerGeo = new THREE.BoxGeometry(32, 1.1, 0.15);
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(-32, 1.4, -123.8);
    pitEntryGroup.add(bannerMesh);

    this.group.add(pitEntryGroup);
  }

  /**
   * 18m Jumbotron LED Video Wall & Circuit Tower
   */
  private buildJumbotronAndTimingTowers(): void {
    const towerGroup = new THREE.Group();

    // Tower located near Turn 1 (x = 65, z = -148)
    const towerX = 65;
    const towerZ = -148;

    // Steel Lattice Support
    const mastGeo = new THREE.BoxGeometry(2.2, 18, 2.2);
    const mast = new THREE.Mesh(mastGeo, this.metalDarkMat);
    mast.position.set(towerX, 9, towerZ);
    mast.castShadow = true;
    towerGroup.add(mast);

    // Massive Jumbotron Screen (12m x 7m)
    const screenGeo = new THREE.BoxGeometry(12, 7, 0.6);
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 256;
    const sCtx = sCanvas.getContext('2d')!;
    sCtx.fillStyle = '#09090b';
    sCtx.fillRect(0, 0, 512, 256);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = 'bold 36px monospace';
    sCtx.fillText('APEX GP LIVE TIMING', 40, 55);
    sCtx.fillStyle = '#22c55e';
    sCtx.font = '28px monospace';
    sCtx.fillText('P1  VER  1:14.281', 40, 110);
    sCtx.fillText('P2  LEC  +0.142', 40, 155);
    sCtx.fillText('P3  NOR  +0.298', 40, 200);
    const screenTex = new THREE.CanvasTexture(sCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(towerX, 15, towerZ + 1.2);
    screenMesh.rotation.y = -0.2;
    towerGroup.add(screenMesh);

    this.group.add(towerGroup);
  }

  /**
   * Start / Finish Overhead Gantry with FIA Start Lights & West High-Tech Bridge
   */
  private buildOverheadGantriesAndBridges(): void {
    const structGroup = new THREE.Group();

    // 1. Start Gantry across Main Straight and Pit Lane
    const gantryHeight = 7.8;
    const pylonZ1 = -143;
    const pylonZ2 = -106;

    [pylonZ1, pylonZ2].forEach((zPos) => {
      const pylonGeo = new THREE.BoxGeometry(1.4, gantryHeight, 1.4);
      const pylon = new THREE.Mesh(pylonGeo, this.metalDarkMat);
      pylon.position.set(0, gantryHeight / 2, zPos);
      pylon.castShadow = true;
      structGroup.add(pylon);
    });

    // Overhead Truss Beam (castShadow disabled on overhead span to prevent GPU fillrate drops when driving underneath)
    const spanLengthZ = Math.abs(pylonZ2 - pylonZ1) + 1.4;
    const spanCenterZ = (pylonZ1 + pylonZ2) / 2;
    const spanGeo = new THREE.BoxGeometry(1.6, 1.6, spanLengthZ);
    const span = new THREE.Mesh(spanGeo, this.metalDarkMat);
    span.position.set(0, gantryHeight + 0.8, spanCenterZ);
    span.castShadow = false;
    span.receiveShadow = true;
    structGroup.add(span);

    // Realistic Integrated Ground Contact Shadow for Start Gantry (With FIA Start Pod & Warren Truss Lattice Silhouettes)
    const startShadow = this.createOverheadSoftShadow(4.2, spanLengthZ + 2.0, 'gantry', 0.62);
    startShadow.position.set(-4.5, 0.015, spanCenterZ + 3.8);
    structGroup.add(startShadow);

    // 5 Red Starting Light Pods
    for (let l = 0; l < 5; l++) {
      const lightGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.20, 14);
      lightGeo.rotateZ(Math.PI / 2);
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0xef4444,
        emissiveIntensity: 3.5,
      });
      const lightMesh = new THREE.Mesh(lightGeo, lightMat);
      lightMesh.position.set(-0.85, gantryHeight + 0.3, -this.halfSize - 4 + l * 2);
      structGroup.add(lightMesh);
    }

    // 2. West High-Tech Sponsor Arch Bridge (38m span across West Straight)
    const archSpan = 38;
    const archH = 8.8;
    const archMeshGeo = new THREE.BoxGeometry(archSpan, 2.4, 4.8);
    const archMesh = new THREE.Mesh(archMeshGeo, this.metalDarkMat);
    archMesh.position.set(-this.halfSize, archH, 0);
    archMesh.castShadow = false;
    archMesh.receiveShadow = true;
    structGroup.add(archMesh);

    // Realistic Integrated Ground Contact Shadow for West Arch Bridge (With Billboard & Truss Stiffener Silhouettes)
    const archShadow = this.createOverheadSoftShadow(archSpan + 2.0, 8.4, 'arch', 0.65);
    archShadow.position.set(-this.halfSize - 4.5, 0.015, 3.8);
    structGroup.add(archShadow);

    // Arch Support Pillars
    [-this.halfSize - archSpan / 2 + 0.8, -this.halfSize + archSpan / 2 - 0.8].forEach((xPos) => {
      const pillarGeo = new THREE.CylinderGeometry(1.3, 1.5, archH, 12);
      const pillar = new THREE.Mesh(pillarGeo, this.metalDarkMat);
      pillar.position.set(xPos, archH / 2, 0);
      pillar.castShadow = true;
      structGroup.add(pillar);

      this.staticObstacles.push({
        x: xPos,
        z: 0,
        radius: 1.6,
        type: 'pillar',
      });
    });

    this.group.add(structGroup);
  }

  /**
   * 24 High-Mast Stadium Floodlight Towers Surrounding the Entire Circuit
   * Every single tower is analyzed and rotated so the light head and spotlight bulbs
   * pitch downward at a 35 degree angle pointing directly at the racing track surface!
   */
  private buildHighMastFloodlights(): void {
    const towerGroup = new THREE.Group();

    // 24 Strategic Floodlight Tower positions with exact track target focal points
    const floodlightConfigs = [
      // South Straight (Main Straight & Pit Lane) - Aiming North onto the track
      { x: -75, z: -156, tx: -75, tz: -130 },
      { x: -40, z: -156, tx: -40, tz: -130 },
      { x: 0, z: -156, tx: 0, tz: -130 },
      { x: 40, z: -156, tx: 40, tz: -130 },
      { x: 75, z: -156, tx: 75, tz: -130 },
      // South Infield Pit Tower - Aiming South onto Pit Lane & Track
      { x: -10, z: -92, tx: -10, tz: -116 },

      // Turn 1 Corner Outer Towers (South-East) - Aiming at Turn 1 apex & exit
      { x: 125, z: -156, tx: 110, tz: -125 },
      { x: 156, z: -125, tx: 125, tz: -110 },
      { x: 156, z: -80, tx: 130, tz: -80 },

      // East Straight - Aiming West onto the track
      { x: 156, z: -40, tx: 130, tz: -40 },
      { x: 156, z: 0, tx: 130, tz: 0 },
      { x: 156, z: 40, tx: 130, tz: 40 },

      // Turn 2 Corner Outer Towers (North-East) - Aiming at Turn 2 apex & exit
      { x: 156, z: 80, tx: 130, tz: 80 },
      { x: 156, z: 125, tx: 125, tz: 110 },
      { x: 125, z: 156, tx: 110, tz: 125 },

      // North Straight - Aiming South onto the track
      { x: 75, z: 156, tx: 75, tz: 130 },
      { x: 40, z: 156, tx: 40, tz: 130 },
      { x: 0, z: 156, tx: 0, tz: 130 },
      { x: -40, z: 156, tx: -40, tz: 130 },
      { x: -75, z: 156, tx: -75, tz: 130 },

      // Turn 3 Corner Outer Towers (North-West) - Aiming at Turn 3 apex & exit
      { x: -125, z: 156, tx: -110, tz: 125 },
      { x: -156, z: 125, tx: -125, tz: 110 },
      { x: -156, z: 80, tx: -130, tz: 80 },

      // West Straight - Aiming East onto the track
      { x: -156, z: 40, tx: -130, tz: 40 },
      { x: -156, z: 0, tx: -130, tz: 0 },
      { x: -156, z: -40, tx: -130, tz: -40 },

      // Turn 4 Corner Outer Towers (South-West) - Aiming at Turn 4 apex & entry
      { x: -156, z: -80, tx: -130, tz: -80 },
      { x: -156, z: -125, tx: -125, tz: -110 },
      { x: -125, z: -156, tx: -110, tz: -125 },
    ];

    floodlightConfigs.forEach((cfg) => {
      const singleTower = new THREE.Group();
      singleTower.position.set(cfg.x, 0, cfg.z);

      // Analyze angle from tower position to its intended target on the track!
      const yawAngle = Math.atan2(cfg.tx - cfg.x, cfg.tz - cfg.z);
      singleTower.rotation.y = yawAngle;

      // Steel Lattice Mast (24m high)
      const mastH = 24;
      const mastGeo = new THREE.CylinderGeometry(0.55, 1.1, mastH, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x22262e, metalness: 0.40, roughness: 0.65 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = mastH / 2;
      mast.castShadow = true;
      singleTower.add(mast);

      // Angled Light Head Assembly (pitched 35 degrees forward towards the track!)
      const headAssembly = new THREE.Group();
      headAssembly.position.set(0, mastH, 0);
      headAssembly.rotation.x = 0.62; // 35.5 degrees pitch down directly aimed at the asphalt

      // Cantilever Arm Bar
      const armGeo = new THREE.BoxGeometry(0.8, 0.8, 2.2);
      const arm = new THREE.Mesh(armGeo, mastMat);
      arm.position.set(0, 0, 1.1);
      headAssembly.add(arm);

      // Hexagonal Crossbar Head
      const headGeo = new THREE.BoxGeometry(5.4, 1.4, 0.8);
      const head = new THREE.Mesh(headGeo, mastMat);
      head.position.set(0, 0, 2.2);
      headAssembly.add(head);

      // 6 High-Power Stadium Spotlights angled directly at the circuit
      for (let s = 0; s < 6; s++) {
        // Spotlight Casing
        const spotHousingGeo = new THREE.BoxGeometry(0.75, 0.75, 0.4);
        const spotHousing = new THREE.Mesh(spotHousingGeo, mastMat);
        spotHousing.position.set(-2.1 + s * 0.84, 0, 2.45);
        headAssembly.add(spotHousing);

        // Glowing Emissive Lens
        const lensGeo = new THREE.PlaneGeometry(0.65, 0.65);
        const lens = new THREE.Mesh(lensGeo, this.floodlightMat);
        lens.position.set(-2.1 + s * 0.84, 0, 2.66);
        headAssembly.add(lens);
      }

      singleTower.add(headAssembly);
      towerGroup.add(singleTower);
    });

    this.group.add(towerGroup);
  }

  /**
   * Helper to recompute spherical normals from a center point for lush, volumetric foliage lighting
   */
  /**
   * Applies procedural organic 3D needle/leaf displacement to eliminate cartoon spherical symmetry
   */
  private displaceFoliageGeometry(geo: THREE.BufferGeometry, noiseScale = 0.28): void {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z) || 0.001;
      // Multi-octave organic perturbation
      const j1 = Math.sin(x * 5.2 + y * 3.4) * Math.cos(z * 4.8);
      const j2 = Math.sin(y * 8.0 + (x + z) * 3.0) * 0.5;
      const displace = (j1 + j2) * noiseScale;
      pos.setX(i, x + (x / dist) * displace);
      pos.setY(i, y + displace * 0.7);
      pos.setZ(i, z + (z / dist) * displace);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  /**
   * High-performance BufferGeometry merger for building composite foliage prototypes
   */
  private mergeBufferGeometries(geos: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }>): THREE.BufferGeometry {
    let totalVerts = 0;
    let totalIndices = 0;

    for (const item of geos) {
      totalVerts += item.geo.attributes.position.count;
      if (item.geo.index) totalIndices += item.geo.index.count;
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = new Uint16Array(totalIndices);

    let vertOffset = 0;
    let indexOffset = 0;

    const normalMatrix = new THREE.Matrix3();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (const item of geos) {
      const g = item.geo;
      const pos = g.attributes.position;
      const norm = g.attributes.normal;
      const uv = g.attributes.uv;
      const idx = g.index;

      const mat = item.matrix || new THREE.Matrix4();
      normalMatrix.getNormalMatrix(mat);

      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mat);
        positions[(vertOffset + i) * 3] = v.x;
        positions[(vertOffset + i) * 3 + 1] = v.y;
        positions[(vertOffset + i) * 3 + 2] = v.z;

        if (norm) {
          n.fromBufferAttribute(norm, i).applyMatrix3(normalMatrix).normalize();
          normals[(vertOffset + i) * 3] = n.x;
          normals[(vertOffset + i) * 3 + 1] = n.y;
          normals[(vertOffset + i) * 3 + 2] = n.z;
        }

        if (uv) {
          uvs[(vertOffset + i) * 2] = uv.getX(i);
          uvs[(vertOffset + i) * 2 + 1] = uv.getY(i);
        }
      }

      if (idx) {
        for (let i = 0; i < idx.count; i++) {
          indices[indexOffset + i] = idx.getX(i) + vertOffset;
        }
        indexOffset += idx.count;
      }

      vertOffset += pos.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (totalIndices > 0) {
      merged.setIndex(new THREE.BufferAttribute(indices, 1));
    }
    return merged;
  }

  /**
   * Pre-generates merged prototype geometries for Mediterranean Racing Pine
   */
  private createPineGeometries(): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } {
    const trunkH = 7.8;
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.58, trunkH, 8, 2);
    trunkGeo.translate(0, trunkH / 2 - 0.15, 0);

    const foliageParts: Array<{ geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }> = [];
    // Coniferous tiered umbrella canopies with jagged needle contour
    const tiers = [
      { y: trunkH * 0.65 - 0.15, r: 3.6, sy: 0.55 },
      { y: trunkH * 0.85 - 0.15, r: 2.9, sy: 0.60 },
      { y: trunkH * 1.02 - 0.15, r: 2.1, sy: 0.65 },
    ];

    tiers.forEach((t) => {
      const geo = new THREE.CylinderGeometry(0.4, t.r, 1.4, 12, 3);
      this.displaceFoliageGeometry(geo, 0.35);
      const mat = new THREE.Matrix4()
        .makeTranslation(0, t.y, 0)
        .multiply(new THREE.Matrix4().makeScale(1.0, t.sy, 1.0));
      foliageParts.push({ geo, matrix: mat });
    });

    const mergedFoliage = this.mergeBufferGeometries(foliageParts);
    mergedFoliage.computeVertexNormals();

    return { trunk: trunkGeo, foliage: mergedFoliage };
  }

  /**
   * Pre-generates merged prototype geometries for Broadleaf European Oak
   */
  private createOakGeometries(): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } {
    const trunkH = 5.6;
    const trunkGeo = new THREE.CylinderGeometry(0.42, 0.82, trunkH, 8, 2);
    trunkGeo.translate(0, trunkH / 2 - 0.15, 0);

    const trunkParts: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }> = [
      { geo: trunkGeo }
    ];

    for (let b = 0; b < 3; b++) {
      const ang = (b / 3) * Math.PI * 2 + 0.3;
      const boughGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.4, 6);
      const bMat = new THREE.Matrix4()
        .makeTranslation(Math.cos(ang) * 0.4, trunkH * 0.82 - 0.15, Math.sin(ang) * 0.4)
        .multiply(new THREE.Matrix4().makeRotationY(ang))
        .multiply(new THREE.Matrix4().makeRotationZ(0.55));
      trunkParts.push({ geo: boughGeo, matrix: bMat });
    }
    const mergedTrunk = this.mergeBufferGeometries(trunkParts);

    const clusterPositions = [
      { x: 0, y: trunkH * 0.95 - 0.15, z: 0, r: 2.6 },
      { x: 1.4, y: trunkH * 1.1 - 0.15, z: 0.8, r: 2.2 },
      { x: -1.3, y: trunkH * 1.15 - 0.15, z: 0.9, r: 2.1 },
      { x: 0.2, y: trunkH * 1.18 - 0.15, z: -1.5, r: 2.3 },
      { x: -1.1, y: trunkH * 1.25 - 0.15, z: -0.9, r: 2.0 },
      { x: 1.2, y: trunkH * 1.28 - 0.15, z: -0.7, r: 1.9 },
      { x: 0, y: trunkH * 1.45 - 0.15, z: 0, r: 2.1 },
    ];

    const foliageParts: Array<{ geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }> = [];
    clusterPositions.forEach((cl) => {
      const geo = new THREE.DodecahedronGeometry(cl.r, 1);
      this.displaceFoliageGeometry(geo, 0.38);
      const mat = new THREE.Matrix4().makeTranslation(cl.x, cl.y, cl.z);
      foliageParts.push({ geo, matrix: mat });
    });

    const mergedFoliage = this.mergeBufferGeometries(foliageParts);
    mergedFoliage.computeVertexNormals();

    return { trunk: mergedTrunk, foliage: mergedFoliage };
  }

  /**
   * Pre-generates merged prototype geometries for Slender Italian Cypress
   */
  private createCypressGeometries(): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } {
    const trunkH = 1.6;
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, trunkH, 8);
    trunkGeo.translate(0, trunkH / 2 - 0.1, 0);

    const foliageH = 9.2;
    const tiers = 5;
    const foliageParts: Array<{ geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }> = [];

    for (let t = 0; t < tiers; t++) {
      const ty = trunkH * 0.8 + t * (foliageH / tiers) * 0.85 - 0.1;
      const tr = 1.35 - t * 0.22;
      const geo = new THREE.ConeGeometry(tr, (foliageH / tiers) * 1.35, 9, 2);
      this.displaceFoliageGeometry(geo, 0.22);
      const mat = new THREE.Matrix4().makeTranslation(0, ty, 0);
      foliageParts.push({ geo, matrix: mat });
    }

    const mergedFoliage = this.mergeBufferGeometries(foliageParts);
    mergedFoliage.computeVertexNormals();

    return { trunk: trunkGeo, foliage: mergedFoliage };
  }

  /**
   * Pre-generates merged prototype geometry for Organic Bush Cluster
   */
  private createBushGeometry(): THREE.BufferGeometry {
    const count = 4;
    const parts: Array<{ geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }> = [];

    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const dist = 0.45;
      const r = 0.85;
      const geo = new THREE.DodecahedronGeometry(r, 1);
      this.displaceFoliageGeometry(geo, 0.28);
      const mat = new THREE.Matrix4()
        .makeTranslation(Math.cos(ang) * dist, r * 0.72 - 0.05, Math.sin(ang) * dist)
        .multiply(new THREE.Matrix4().makeScale(1.1, 0.8, 1.1));
      parts.push({ geo, matrix: mat });
    }

    const merged = this.mergeBufferGeometries(parts);
    merged.computeVertexNormals();
    return merged;
  }

  /**
   * Photorealistic Dual-Corridor Tree System rendered via Hardware InstancedMesh.
   * Reduces draw calls from ~7,200 down to exactly 7 Draw Calls (99.9% reduction!).
   * Concentrates 100% of vegetation directly along BOTH sides of the circuit walls,
   * forming an immersive, tree-lined Grand Prix forest corridor at 60 FPS rock-solid.
   */
  private buildOrganicVegetation(): void {
    const vegGroup = new THREE.Group();
    const c = this.innerCornerCenter; // 92
    const cornerCenters = [
      { cx: c, cz: -c },
      { cx: c, cz: c },
      { cx: -c, cz: c },
      { cx: -c, cz: -c },
    ];

    interface TreeInst {
      x: number;
      z: number;
      scale: number;
      rotY: number;
    }

    const pineList: TreeInst[] = [];
    const oakList: TreeInst[] = [];
    const cypressList: TreeInst[] = [];
    const bushList: TreeInst[] = [];

    const placedTrees: Array<{ x: number; z: number; r: number }> = [];

    /**
     * Strict spatial validation ensuring no tree canopy or trunk intersects:
     * - Grandstands (South or North)
     * - Pit Lane, Paddock Club Garages, Team Transporters
     * - Helipad
     * - Concrete barriers (walls) and catch fences
     * - Asphalt track surface and kerbs
     * - Gravel runoff traps
     */
    const isTreeSafe = (x: number, z: number, canopyR: number): boolean => {
      // 1. South Main Grandstand Exclusion Zone (including canopy & VIP box)
      if (x >= -72 - canopyR && x <= 72 + canopyR && z >= -170 - canopyR && z <= -138.0 + canopyR) {
        return false;
      }

      // 2. North Grandstand Exclusion Zone
      if (x >= -50 - canopyR && x <= 50 + canopyR && z >= 139.0 - canopyR && z <= 165 + canopyR) {
        return false;
      }

      // 3. Pit Lane & Paddock Building
      if (x >= -60 - canopyR && x <= 54 + canopyR && z >= -124 - canopyR && z <= -93 + canopyR) {
        return false;
      }

      // 4. Team Transporters & Awnings
      if (x >= -50 - canopyR && x <= 44 + canopyR && z >= -96 - canopyR && z <= -84 + canopyR) {
        return false;
      }

      // 5. Helipad (radius 18m around 30, 30)
      if (Math.hypot(x - 30, z - 30) < 18 + canopyR) {
        return false;
      }

      // 6. Track Surface, Kerbs & Starting Grid
      // Straight Tracks (120 to 140 from center line)
      if (Math.abs(x) <= 92 && z >= -140.0 - canopyR && z <= -120.0 + canopyR) return false;
      if (Math.abs(x) <= 92 && z >= 120.0 - canopyR && z <= 140.0 + canopyR) return false;
      if (x >= 120.0 - canopyR && x <= 140.0 + canopyR && Math.abs(z) <= 92) return false;
      if (x >= -140.0 - canopyR && x <= -120.0 + canopyR && Math.abs(z) <= 92) return false;

      // Corner curved track & gravel traps
      for (const cc of cornerCenters) {
        const dx = x - cc.cx;
        const dz = z - cc.cz;
        const signX = Math.sign(cc.cx);
        const signZ = Math.sign(cc.cz);
        if (dx * signX >= -2 && dz * signZ >= -2) {
          const dist = Math.hypot(dx, dz);
          // Curved track + inner wall + gravel trap forbidden band (23.5m to 64.5m)
          if (dist >= 23.5 && dist <= 64.5) {
            return false;
          }
          // Inner apex tree canopy cannot extend past inner wall at 24.0m
          if (dist < 23.5 && dist + canopyR * 0.35 > 23.8) {
            return false;
          }
          // Outer curve tree canopy cannot extend into gravel runoff trap
          if (dist > 64.5 && dist - canopyR * 0.35 < 64.0) {
            return false;
          }
        }
      }

      // 7. Concrete Barrier Walls (wall thickness 0.75m + tree canopy radius + 0.45m clearance)
      const wallClr = canopyR + 0.45;
      if (Math.abs(x) <= 92) {
        if (Math.abs(z - 140) < wallClr || Math.abs(z + 140) < wallClr) return false;
        if (Math.abs(z - 120) < wallClr || Math.abs(z + 120) < wallClr) return false;
      }
      if (Math.abs(z) <= 92) {
        if (Math.abs(x - 140) < wallClr || Math.abs(x + 140) < wallClr) return false;
        if (Math.abs(x - 120) < wallClr || Math.abs(x + 120) < wallClr) return false;
      }

      for (const cc of cornerCenters) {
        const dx = x - cc.cx;
        const dz = z - cc.cz;
        const signX = Math.sign(cc.cx);
        const signZ = Math.sign(cc.cz);
        if (dx * signX >= -2 && dz * signZ >= -2) {
          const dist = Math.hypot(dx, dz);
          if (Math.abs(dist - 48.0) < wallClr) return false;
          if (Math.abs(dist - 24.0) < wallClr) return false;
        }
      }

      // 8. Tree-to-tree crown overlap prevention (allows lush, organic canopy clustering)
      for (const pt of placedTrees) {
        if (Math.hypot(x - pt.x, z - pt.z) < (canopyR + pt.r) * 0.38) {
          return false;
        }
      }

      return true;
    };

    const tryAddTree = (x: number, z: number, type: 'pine' | 'oak' | 'cypress', scale = 1.35) => {
      const canopyR = type === 'cypress' ? 1.4 * scale : (type === 'pine' ? 2.8 * scale : 3.4 * scale);
      if (!isTreeSafe(x, z, canopyR)) return;

      const rotY = (Math.abs(x * 13 + z * 17) % 628) / 100;
      if (type === 'pine') pineList.push({ x, z, scale, rotY });
      else if (type === 'oak') oakList.push({ x, z, scale, rotY });
      else cypressList.push({ x, z, scale, rotY });

      placedTrees.push({ x, z, r: canopyR });

      // Physics optimization: only check collisions for trees in the accessible infield (not behind outer walls)
      if (Math.abs(x) < 120 && Math.abs(z) < 120) {
        this.staticObstacles.push({
          x,
          z,
          radius: 0.8 * scale,
          type: 'tree',
        });
      }
    };

    // =========================================================================
    // CORRIDOR 1: OUTFIELD WALL TREE CORRIDOR (Hugging outer barriers & fences)
    // =========================================================================

    // 1. South Outer Wall Corridor (Safely flanking the South Grandstand)
    // West wing of South straight (x = -135 to -74, z = -148 to -162)
    for (let x = -135; x <= -74; x += 11.0) {
      const type = Math.abs(x) % 2 === 0 ? 'pine' : 'oak';
      tryAddTree(x, -150 - (Math.abs(x * 5) % 6), type, 1.4);
    }
    // East wing of South straight (x = 74 to 135, z = -148 to -162)
    for (let x = 74; x <= 135; x += 11.0) {
      const type = Math.abs(x) % 2 === 0 ? 'oak' : 'pine';
      tryAddTree(x, -150 - (Math.abs(x * 5) % 6), type, 1.4);
    }
    // Forest backdrop behind South Grandstand (z = -174 to -188, completely clear of canopy)
    for (let x = -65; x <= 65; x += 13.0) {
      tryAddTree(x, -178 - (Math.abs(x * 7) % 8), 'pine', 1.6);
    }

    // 2. North Outer Wall Corridor (Safely flanking the North Grandstand)
    // West wing of North straight (x = -135 to -52, z = 149 to 162)
    for (let x = -135; x <= -52; x += 11.0) {
      const type = Math.abs(x) % 2 === 0 ? 'oak' : 'pine';
      tryAddTree(x, 151 + (Math.abs(x * 5) % 6), type, 1.4);
    }
    // East wing of North straight (x = 52 to 135, z = 149 to 162)
    for (let x = 52; x <= 135; x += 11.0) {
      const type = Math.abs(x) % 2 === 0 ? 'pine' : 'oak';
      tryAddTree(x, 151 + (Math.abs(x * 5) % 6), type, 1.4);
    }
    // Forest backdrop behind North Grandstand (z = 170 to 184)
    for (let x = -44; x <= 44; x += 13.0) {
      tryAddTree(x, 172 + (Math.abs(x * 7) % 8), 'oak', 1.55);
    }

    // 3. East Outer Wall Corridor (x ≈ 150 to 164, z = -120 to 120)
    for (let z = -125; z <= 125; z += 11.5) {
      const type = Math.abs(z) % 2 === 0 ? 'pine' : 'oak';
      tryAddTree(152 + (Math.abs(z * 5) % 8), z, type, 1.4);
    }

    // 4. West Outer Wall Corridor (x ≈ -150 to -164, z = -120 to 120)
    for (let z = -125; z <= 125; z += 11.5) {
      const type = Math.abs(z) % 2 === 0 ? 'oak' : 'pine';
      tryAddTree(-152 - (Math.abs(z * 5) % 8), z, type, 1.4);
    }

    // 5. 4 CORNER OUTER FOREST AMPHITHEATERS
    // Dense 4-tier majestic forest amphitheater encircling all 4 corners behind gravel runoff traps!
    const cornerAngles = [
      { cx: c, cz: -c, startAng: -Math.PI / 2 },
      { cx: c, cz: c, startAng: 0 },
      { cx: -c, cz: c, startAng: Math.PI / 2 },
      { cx: -c, cz: -c, startAng: Math.PI },
    ];

    cornerAngles.forEach(({ cx, cz, startAng }) => {
      // Tier 1: Near forest edge (r = 66.5 to 73m, flanking the runoff barrier)
      for (let a = 0.05; a < Math.PI / 2 - 0.05; a += 0.075) {
        const ang = startAng + a;
        const dist = 67.5 + ((a * 7) % 4.5);
        const type = Math.floor(a * 10) % 2 === 0 ? 'pine' : 'oak';
        tryAddTree(cx + Math.cos(ang) * dist, cz + Math.sin(ang) * dist, type, 1.4);
      }

      // Tier 2: Mid forest canopy (r = 75 to 84m)
      for (let a = 0.04; a < Math.PI / 2 - 0.04; a += 0.065) {
        const ang = startAng + a;
        const dist = 77.5 + ((a * 9) % 5.0);
        const type = Math.floor(a * 10) % 3 === 0 ? 'pine' : 'oak';
        tryAddTree(cx + Math.cos(ang) * dist, cz + Math.sin(ang) * dist, type, 1.5);
      }

      // Tier 3: Deep perimeter forest backdrop (r = 86 to 96m)
      for (let a = 0.035; a < Math.PI / 2 - 0.035; a += 0.055) {
        const ang = startAng + a;
        const dist = 89.0 + ((a * 11) % 6.0);
        const type = Math.floor(a * 10) % 2 === 0 ? 'pine' : 'oak';
        tryAddTree(cx + Math.cos(ang) * dist, cz + Math.sin(ang) * dist, type, 1.55);
      }

      // Tier 4: Dense outer perimeter boundary ridge (r = 98 to 110m)
      for (let a = 0.03; a < Math.PI / 2 - 0.03; a += 0.050) {
        const ang = startAng + a;
        const dist = 101.0 + ((a * 13) % 7.0);
        const type = Math.floor(a * 10) % 3 === 0 ? 'oak' : 'pine';
        tryAddTree(cx + Math.cos(ang) * dist, cz + Math.sin(ang) * dist, type, 1.65);
      }
    });

    // =========================================================================
    // CORRIDOR 2: INFIELD WALL TREE CORRIDOR (Hugging inner circuit barriers)
    // =========================================================================

    // 1. North Inner Barrier Corridor (z ≈ 110 to 113, facing the track)
    for (let x = -80; x <= 80; x += 12.0) {
      const mod = Math.abs(x) % 3;
      const type = mod === 0 ? 'cypress' : (mod === 1 ? 'oak' : 'pine');
      tryAddTree(x, 111.5 - (Math.abs(x * 3) % 2), type, 1.25);
    }

    // 2. East Inner Barrier Corridor (x ≈ 110 to 113, facing the track)
    for (let z = -80; z <= 80; z += 12.0) {
      const mod = Math.abs(z) % 3;
      const type = mod === 0 ? 'cypress' : (mod === 1 ? 'pine' : 'oak');
      tryAddTree(111.5 - (Math.abs(z * 3) % 2), z, type, 1.25);
    }

    // 3. West Inner Barrier Corridor (x ≈ -110 to -113, facing the track)
    for (let z = -80; z <= 80; z += 12.0) {
      const mod = Math.abs(z) % 3;
      const type = mod === 0 ? 'cypress' : (mod === 1 ? 'oak' : 'pine');
      tryAddTree(-111.5 + (Math.abs(z * 3) % 2), z, type, 1.25);
    }

    // 4. South Infield: Safely flanking the Paddock and VIP Hospitality
    // West wing of Paddock
    for (let x = -82; x <= -58; x += 10.0) {
      tryAddTree(x, -112, 'cypress', 1.3);
    }
    // East wing of Paddock
    for (let x = 54; x <= 82; x += 10.0) {
      tryAddTree(x, -112, 'cypress', 1.3);
    }
    // VIP Cypress Boulevard behind Team Paddock yard (z = -80)
    for (let x = -50; x <= 50; x += 9.5) {
      tryAddTree(x, -80, 'cypress', 1.35);
    }

    // 5. 4 CORNER INNER APEX BOTANICAL GROVES (Inside apex curves at r = 8 to 19m)
    cornerAngles.forEach(({ cx, cz }) => {
      const signX = Math.sign(cx);
      const signZ = Math.sign(cz);

      // Apex Row 1 (Core inner park: r = 8 to 13m)
      for (let a = 0.08; a < Math.PI / 2 - 0.08; a += 0.11) {
        const dist = 9.5 + ((a * 5) % 2.5);
        const kx = cx - signX * Math.cos(a) * dist;
        const kz = cz - signZ * Math.sin(a) * dist;
        const type = Math.floor(a * 10) % 2 === 0 ? 'cypress' : 'oak';
        tryAddTree(kx, kz, type, 1.25);
      }

      // Apex Row 2 (Mid apex park: r = 14 to 19m)
      for (let a = 0.10; a < Math.PI / 2 - 0.10; a += 0.10) {
        const dist = 15.5 + ((a * 6) % 2.5);
        const kx = cx - signX * Math.cos(a) * dist;
        const kz = cz - signZ * Math.sin(a) * dist;
        const type = Math.floor(a * 10) % 2 === 0 ? 'pine' : 'cypress';
        tryAddTree(kx, kz, type, 1.3);
      }
    });

    // =========================================================================
    // TRACKSIDE SHRUB HEDGES (Strictly clear of walls and grandstands)
    // =========================================================================
    const barrierBushPositions: Array<[number, number, number]> = [];

    // Along North inner barrier meadow (z ≈ 114)
    for (let x = -75; x <= 75; x += 8.0) barrierBushPositions.push([x, 114.5, 1.05]);
    // Along East inner barrier meadow (x ≈ 114)
    for (let z = -75; z <= 75; z += 8.0) barrierBushPositions.push([114.5, z, 1.05]);
    // Along West inner barrier meadow (x ≈ -114)
    for (let z = -75; z <= 75; z += 8.0) barrierBushPositions.push([-114.5, z, 1.05]);
    // Along South outer barrier meadow (only west and east of grandstand)
    for (let x = -125; x <= -76; x += 8.5) barrierBushPositions.push([x, -145.5, 1.1]);
    for (let x = 76; x <= 125; x += 8.5) barrierBushPositions.push([x, -145.5, 1.1]);

    // Outer corner shrub hedges (r = 65.2m, nestled right behind corner gravel traps)
    cornerAngles.forEach(({ cx, cz, startAng }) => {
      for (let a = 0.05; a < Math.PI / 2 - 0.05; a += 0.08) {
        const ang = startAng + a;
        barrierBushPositions.push([cx + Math.cos(ang) * 65.2, cz + Math.sin(ang) * 65.2, 1.15]);
      }
    });

    // Inner corner apex shrub hedges (r = 20.5m, along inner apex grass margins)
    cornerAngles.forEach(({ cx, cz }) => {
      const signX = Math.sign(cx);
      const signZ = Math.sign(cz);
      for (let a = 0.10; a < Math.PI / 2 - 0.10; a += 0.10) {
        barrierBushPositions.push([cx - signX * Math.cos(a) * 20.5, cz - signZ * Math.sin(a) * 20.5, 1.1]);
      }
    });

    barrierBushPositions.forEach(([bx, bz, scale]) => {
      const bushR = 1.2 * scale;
      if (isTreeSafe(bx, bz, bushR)) {
        const rotY = (Math.abs(bx * 19 + bz * 23) % 628) / 100;
        bushList.push({ x: bx, z: bz, scale, rotY });
        placedTrees.push({ x: bx, z: bz, r: bushR });
      }
    });

    // =========================================================================
    // HARDWARE INSTANCING COMPILATION (7 Draw Calls Total for the entire forest!)
    // =========================================================================
    const dummy = new THREE.Object3D();

    // 1. Pines (Trunks + Foliage)
    if (pineList.length > 0) {
      const pineGeos = this.createPineGeometries();
      const pineTrunks = new THREE.InstancedMesh(pineGeos.trunk, this.treeBarkMat, pineList.length);
      const pineFoliage = new THREE.InstancedMesh(pineGeos.foliage, this.pineFoliageMat, pineList.length);

      pineList.forEach((p, i) => {
        dummy.position.set(p.x, 0, p.z);
        dummy.scale.setScalar(p.scale);
        dummy.rotation.y = p.rotY;
        dummy.updateMatrix();
        pineTrunks.setMatrixAt(i, dummy.matrix);
        pineFoliage.setMatrixAt(i, dummy.matrix);
      });

      pineTrunks.castShadow = true;
      pineTrunks.receiveShadow = false;
      pineFoliage.castShadow = false; // Excluded from shadow depth pass for huge 60 FPS GPU boost
      pineFoliage.receiveShadow = false;
      pineTrunks.instanceMatrix.needsUpdate = true;
      pineFoliage.instanceMatrix.needsUpdate = true;

      vegGroup.add(pineTrunks);
      vegGroup.add(pineFoliage);
    }

    // 2. Oaks (Trunks + Foliage)
    if (oakList.length > 0) {
      const oakGeos = this.createOakGeometries();
      const oakTrunks = new THREE.InstancedMesh(oakGeos.trunk, this.treeBarkMat, oakList.length);
      const oakFoliage = new THREE.InstancedMesh(oakGeos.foliage, this.oakFoliageMat, oakList.length);

      oakList.forEach((o, i) => {
        dummy.position.set(o.x, 0, o.z);
        dummy.scale.setScalar(o.scale);
        dummy.rotation.y = o.rotY;
        dummy.updateMatrix();
        oakTrunks.setMatrixAt(i, dummy.matrix);
        oakFoliage.setMatrixAt(i, dummy.matrix);
      });

      oakTrunks.castShadow = true;
      oakTrunks.receiveShadow = false;
      oakFoliage.castShadow = false; // Excluded from shadow depth pass
      oakFoliage.receiveShadow = false;
      oakTrunks.instanceMatrix.needsUpdate = true;
      oakFoliage.instanceMatrix.needsUpdate = true;

      vegGroup.add(oakTrunks);
      vegGroup.add(oakFoliage);
    }

    // 3. Cypresses (Trunks + Foliage)
    if (cypressList.length > 0) {
      const cypGeos = this.createCypressGeometries();
      const cypTrunks = new THREE.InstancedMesh(cypGeos.trunk, this.treeBarkMat, cypressList.length);
      const cypFoliage = new THREE.InstancedMesh(cypGeos.foliage, this.cypressFoliageMat, cypressList.length);

      cypressList.forEach((c, i) => {
        dummy.position.set(c.x, 0, c.z);
        dummy.scale.setScalar(c.scale);
        dummy.rotation.y = c.rotY;
        dummy.updateMatrix();
        cypTrunks.setMatrixAt(i, dummy.matrix);
        cypFoliage.setMatrixAt(i, dummy.matrix);
      });

      cypTrunks.castShadow = true;
      cypTrunks.receiveShadow = false;
      cypFoliage.castShadow = false; // Excluded from shadow depth pass
      cypFoliage.receiveShadow = false;
      cypTrunks.instanceMatrix.needsUpdate = true;
      cypFoliage.instanceMatrix.needsUpdate = true;

      vegGroup.add(cypTrunks);
      vegGroup.add(cypFoliage);
    }

    // 4. Bushes
    if (bushList.length > 0) {
      const bushGeo = this.createBushGeometry();
      const bushMesh = new THREE.InstancedMesh(bushGeo, this.bushFoliageMat, bushList.length);

      bushList.forEach((b, i) => {
        dummy.position.set(b.x, 0, b.z);
        dummy.scale.setScalar(b.scale);
        dummy.rotation.y = b.rotY;
        dummy.updateMatrix();
        bushMesh.setMatrixAt(i, dummy.matrix);
      });

      bushMesh.castShadow = false;
      bushMesh.receiveShadow = false;
      bushMesh.instanceMatrix.needsUpdate = true;

      vegGroup.add(bushMesh);
    }

    this.group.add(vegGroup);
  }

  /**
   * Team Hospitality Transporter Semitrucks Parked in Paddock Area
   */
  private buildPaddockTransportersAndTrailers(): void {
    const paddockTruckGroup = new THREE.Group();
    const teamColors = [0xdc2626, 0x2563eb, 0x059669, 0xd97706, 0x7c3aed, 0xdb2777];

    for (let i = 0; i < 6; i++) {
      const truckX = -42 + i * 15;
      const truckZ = -92;

      const singleTruck = new THREE.Group();
      singleTruck.position.set(truckX, 0, truckZ);

      // Main Trailer Box (13.6m length x 2.6m width x 4m height)
      const trailerGeo = new THREE.BoxGeometry(12.5, 3.8, 2.6);
      const trailerMat = new THREE.MeshStandardMaterial({
        color: teamColors[i],
        metalness: 0.85,
        roughness: 0.25,
      });
      const trailer = new THREE.Mesh(trailerGeo, trailerMat);
      trailer.position.y = 2.4;
      trailer.castShadow = true;
      singleTruck.add(trailer);

      // Chrome Trim / Livery Stripe
      const stripeGeo = new THREE.BoxGeometry(12.55, 0.4, 2.62);
      const stripe = new THREE.Mesh(stripeGeo, this.metalSilverMat);
      stripe.position.y = 2.4;
      singleTruck.add(stripe);

      // Wheels
      [-4, -2.5, 4].forEach((wx) => {
        [-1.35, 1.35].forEach((wz) => {
          const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12);
          wheelGeo.rotateX(Math.PI / 2);
          const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.position.set(wx, 0.5, wz);
          wheel.castShadow = true;
          singleTruck.add(wheel);
        });
      });

      // Paddock Team Hospitality Awning / Canopy Roof
      const awningGeo = new THREE.BoxGeometry(12.0, 0.15, 3.5);
      const awningMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const awning = new THREE.Mesh(awningGeo, awningMat);
      awning.position.set(0, 3.8, 2.8);
      awning.castShadow = true;
      singleTruck.add(awning);

      paddockTruckGroup.add(singleTruck);
    }

    this.group.add(paddockTruckGroup);
  }

  /**
   * Official FIA Safety Car, Medical Car & Circuit Recovery Cranes
   */
  private buildServiceAndSafetyVehicles(): void {
    const serviceGroup = new THREE.Group();

    // 1. Official FIA Safety Car parked at Pit Exit bay (x = 42, z = -121.5)
    const scGroup = new THREE.Group();
    scGroup.position.set(42, 0, -121.5);
    scGroup.rotation.y = Math.PI / 2;

    const carBodyGeo = new THREE.BoxGeometry(1.9, 0.75, 4.4);
    const scMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.85, roughness: 0.2 });
    const scBody = new THREE.Mesh(carBodyGeo, scMat);
    scBody.position.y = 0.55;
    scBody.castShadow = true;
    scGroup.add(scBody);

    // Green/Amber Roof Beacon Light Bar
    const lightBarGeo = new THREE.BoxGeometry(1.2, 0.18, 0.3);
    const lightBarMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.2,
    });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.position.y = 1.35;
    scGroup.add(lightBar);

    serviceGroup.add(scGroup);

    // 2. Heavy-Duty Circuit Recovery Cranes with Telescopic Booms (Corners 2 & 4)
    const cranePositions = [
      { x: 148, z: 148, rot: -Math.PI / 4 },
      { x: -148, z: -148, rot: (3 * Math.PI) / 4 },
    ];

    cranePositions.forEach((cp) => {
      const crane = new THREE.Group();
      crane.position.set(cp.x, 0, cp.z);
      crane.rotation.y = cp.rot;

      // Heavy Truck Chassis (Yellow)
      const chassisGeo = new THREE.BoxGeometry(3.2, 1.8, 8.5);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.4 });
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 1.4;
      chassis.castShadow = true;
      crane.add(chassis);

      // Crane Boom (Extending 12m upward at 45 degree angle)
      const boomGeo = new THREE.CylinderGeometry(0.3, 0.45, 12, 8);
      boomGeo.rotateX(Math.PI / 4);
      const boomMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.3 });
      const boom = new THREE.Mesh(boomGeo, boomMat);
      boom.position.set(0, 6.5, 2.5);
      boom.castShadow = true;
      crane.add(boom);

      // Amber Flashing Beacon
      const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf97316,
        emissiveIntensity: 3.5,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 3.2, -2.5);
      crane.add(beacon);

      serviceGroup.add(crane);
    });

    this.group.add(serviceGroup);
  }

  /**
   * FIA Speed Trap Radar Overpass Gantries (North Straight)
   * Spans cleanly across Z axis from z = 114 to z = 146 (safely behind barriers).
   */
  private buildSpeedTrapRadarAndSectorGantries(): void {
    const radarGroup = new THREE.Group();

    // 1. North Straight High-Speed Gantry (x = 0, z = 130)
    const northGantry = new THREE.Group();
    northGantry.position.set(0, 0, this.halfSize);

    const spanZ = 32;
    const gantryH = 7.8;
    // Beam spans along Z axis across the full track width!
    const beamGeo = new THREE.BoxGeometry(1.4, 1.4, spanZ);
    const beam = new THREE.Mesh(beamGeo, this.metalDarkMat);
    beam.position.y = gantryH;
    beam.castShadow = false;
    beam.receiveShadow = true;
    northGantry.add(beam);

    // Support Pillars safely behind barrier walls (infield and outfield)
    [-spanZ / 2 + 0.8, spanZ / 2 - 0.8].forEach((pz) => {
      const pGeo = new THREE.BoxGeometry(1.2, gantryH, 1.2);
      const pMesh = new THREE.Mesh(pGeo, this.metalDarkMat);
      pMesh.position.set(0, gantryH / 2, pz);
      pMesh.castShadow = true;
      northGantry.add(pMesh);
    });

    // Digital Speed Trap Radar Display
    const radarCanvas = document.createElement('canvas');
    radarCanvas.width = 256;
    radarCanvas.height = 64;
    const rCtx = radarCanvas.getContext('2d')!;
    rCtx.fillStyle = '#09090b';
    rCtx.fillRect(0, 0, 256, 64);
    rCtx.fillStyle = '#38bdf8';
    rCtx.font = 'bold 32px monospace';
    rCtx.fillText('SPEED TRAP: 328 KM/H', 10, 44);
    const radarTex = new THREE.CanvasTexture(radarCanvas);
    const radarMat = new THREE.MeshBasicMaterial({ map: radarTex });
    const radarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 8), radarMat);
    radarMesh.position.set(0.75, gantryH, 0);
    northGantry.add(radarMesh);

    // Realistic Integrated Ground Contact Shadow for North Speed Trap Gantry (With Radar Housing & Warren Truss Silhouettes)
    const northShadow = this.createOverheadSoftShadow(3.8, spanZ + 2.0, 'speed_trap', 0.60);
    northShadow.position.set(-4.5, 0.015, 0);
    northGantry.add(northShadow);

    radarGroup.add(northGantry);
    this.group.add(radarGroup);
  }

  /**
   * Elevated Television Camera Scaffold Towers along High-Speed Corners (Safely in Infield & Outer Verge)
   */
  private buildTVBroadcastTowersAndCranes(): void {
    const tvGroup = new THREE.Group();
    const towerCoords = [
      { x: 55, z: -55, rot: -Math.PI / 4 },
      { x: -55, z: 55, rot: (3 * Math.PI) / 4 },
      { x: 0, z: -146, rot: 0 },
    ];

    towerCoords.forEach((tc) => {
      const tvTower = new THREE.Group();
      tvTower.position.set(tc.x, 0, tc.z);
      tvTower.rotation.y = tc.rot;

      // Scaffolding Mast (7m height)
      const mastGeo = new THREE.BoxGeometry(1.8, 7.0, 1.8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 3.5;
      mast.castShadow = true;
      tvTower.add(mast);

      // Broadcast TV Camera Box + Lens
      const camBodyGeo = new THREE.BoxGeometry(0.45, 0.45, 1.2);
      const camLensGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12);
      camLensGeo.rotateX(Math.PI / 2);
      const camMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
      const camBody = new THREE.Mesh(camBodyGeo, camMat);
      camBody.position.set(0, 7.35, 0);
      tvTower.add(camBody);

      const camLens = new THREE.Mesh(camLensGeo, camMat);
      camLens.position.set(0, 7.35, 0.7);
      tvTower.add(camLens);

      tvGroup.add(tvTower);
    });

    this.group.add(tvGroup);
  }

  /**
   * Pit Lane Overhead Air Booms, Pneumatic Rigs, and Fueling Lines
   */
  private buildPitEquipment(): void {
    const pitEquipGroup = new THREE.Group();

    // 6 Overhead Swiveling Air Booms extending over pit stops
    for (let b = 0; b < 6; b++) {
      const boomX = -38 + b * 15;
      const boom = new THREE.Group();
      boom.position.set(boomX, 4.2, -110.5);

      // Horizontal Arm extending 4.5m forward across pit bay
      const armGeo = new THREE.BoxGeometry(0.15, 0.15, 4.5);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.3 });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(0, 0, -2.25);
      boom.add(arm);

      // Hanging Pneumatic Hose Coils (Yellow/Red)
      const hoseGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
      const hoseMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
      const hose = new THREE.Mesh(hoseGeo, hoseMat);
      hose.position.set(0, -1.1, -4.2);
      boom.add(hose);

      pitEquipGroup.add(boom);
    }

    this.group.add(pitEquipGroup);
  }

  /**
   * Dynamic Props: Brake Marker Boards (150m, 100m, 50m) on all 4 Straights,
   * Turn Number Signs (T1, T2, T3, T4), Apex Cones, and Tire Stacks.
   */
  private buildDynamicProps(): void {
    let propId = 0;

    // 1. Distance Brake Marker Boards on All 4 Straights
    const signConfigs = [
      // South Straight (Approach to T1)
      { text: '150m', x: 35, z: -this.halfSize - 10.2 },
      { text: '100m', x: 55, z: -this.halfSize - 10.2 },
      { text: '50m', x: 75, z: -this.halfSize - 10.2 },
      // East Straight (Approach to T2)
      { text: '150m', x: this.halfSize + 10.2, z: 35 },
      { text: '100m', x: this.halfSize + 10.2, z: 55 },
      { text: '50m', x: this.halfSize + 10.2, z: 75 },
      // North Straight (Approach to T3)
      { text: '150m', x: 30, z: this.halfSize + 10.2 },
      { text: '100m', x: -10, z: this.halfSize + 10.2 },
      { text: '50m', x: -50, z: this.halfSize + 10.2 },
      // West Straight (Approach to T4)
      { text: '150m', x: -this.halfSize - 10.2, z: -35 },
      { text: '100m', x: -this.halfSize - 10.2, z: -55 },
      { text: '50m', x: -this.halfSize - 10.2, z: -75 },
    ];

    signConfigs.forEach((cfg) => {
      const signGroup = new THREE.Group();
      signGroup.position.set(cfg.x, 0, cfg.z);

      const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.7;
      signGroup.add(pole);

      const boardGeo = new THREE.BoxGeometry(1.2, 0.75, 0.05);
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 128;
      bCanvas.height = 80;
      const bCtx = bCanvas.getContext('2d')!;
      bCtx.fillStyle = '#09090b';
      bCtx.fillRect(0, 0, 128, 80);
      bCtx.fillStyle = '#f8fafc';
      bCtx.font = 'bold 36px monospace';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(cfg.text, 64, 40);
      const bTex = new THREE.CanvasTexture(bCanvas);
      const bMat = new THREE.MeshBasicMaterial({ map: bTex });
      const board = new THREE.Mesh(boardGeo, bMat);
      board.position.y = 1.15;
      board.castShadow = true;
      signGroup.add(board);

      this.group.add(signGroup);

      this.dynamicProps.push({
        id: propId++,
        type: 'sign',
        mesh: signGroup,
        position: new THREE.Vector3(cfg.x, 0, cfg.z),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        radius: 0.7,
        height: 1.4,
        mass: 12,
        isSleeping: true,
        baseY: 0,
      });
    });

    // 2. Official Turn Number Signs (T1, T2, T3, T4)
    const turnSigns = [
      { text: 'TURN 1', x: 88, z: -145 },
      { text: 'TURN 2', x: 145, z: 88 },
      { text: 'TURN 3', x: -88, z: 145 },
      { text: 'TURN 4', x: -145, z: -88 },
    ];

    turnSigns.forEach((ts) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(ts.x, 0, ts.z);

      const boardGeo = new THREE.BoxGeometry(2.2, 1.1, 0.08);
      const tCanvas = document.createElement('canvas');
      tCanvas.width = 256;
      tCanvas.height = 128;
      const tCtx = tCanvas.getContext('2d')!;
      tCtx.fillStyle = '#1e3a8a';
      tCtx.fillRect(0, 0, 256, 128);
      tCtx.fillStyle = '#ffffff';
      tCtx.font = 'bold 44px sans-serif';
      tCtx.textAlign = 'center';
      tCtx.textBaseline = 'middle';
      tCtx.fillText(ts.text, 128, 64);
      const tTex = new THREE.CanvasTexture(tCanvas);
      const tMat = new THREE.MeshBasicMaterial({ map: tTex });
      const board = new THREE.Mesh(boardGeo, tMat);
      board.position.y = 1.8;
      board.castShadow = true;
      tGroup.add(board);

      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), this.metalDarkMat);
      leg1.position.set(-0.8, 0.9, 0);
      tGroup.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), this.metalDarkMat);
      leg2.position.set(0.8, 0.9, 0);
      tGroup.add(leg2);

      this.group.add(tGroup);
    });

    // 3. Corner Apex Slalom Cones (Fluorescent Orange)
    const conePositions = [
      { x: 92, z: -84 },
      { x: 84, z: 92 },
      { x: -92, z: 84 },
      { x: -84, z: -92 },
    ];

    conePositions.forEach((pos) => {
      const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 10);
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.35,
        metalness: 0.1,
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.set(pos.x, 0.325, pos.z);
      coneMesh.castShadow = true;
      this.group.add(coneMesh);

      this.dynamicProps.push({
        id: propId++,
        type: 'cone',
        mesh: coneMesh,
        position: new THREE.Vector3(pos.x, 0, pos.z),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        angularVelocity: new THREE.Vector3(0, 0, 0),
        radius: 0.35,
        height: 0.65,
        mass: 3.5,
        isSleeping: true,
        baseY: 0.325,
      });
    });

    // 4. High-Frequency FIA Distance Brake Marker Boards (200m, 150m, 100m, 50m)
    // Enhances peripheral optical flow parallax before all 4 corner entries
    const distanceMarkers = ['200', '150', '100', '50'];
    const markerConfigs = [
      // Approach to Turn 1 (South Straight, facing West)
      { startX: 5, stepX: 22, z: -138.8, rotY: 0 },
      // Approach to Turn 2 (East Straight, facing South)
      { startZ: 5, stepZ: 22, x: 138.8, rotY: -Math.PI / 2 },
      // Approach to Turn 3 (North Straight, facing East)
      { startX: -5, stepX: -22, z: 138.8, rotY: Math.PI },
      // Approach to Turn 4 (West Straight, facing North)
      { startZ: -5, stepZ: -22, x: -138.8, rotY: Math.PI / 2 },
    ];

    const distBoardGeo = new THREE.BoxGeometry(1.6, 1.1, 0.08);

    markerConfigs.forEach((cfg) => {
      distanceMarkers.forEach((distText, dIdx) => {
        const posX = cfg.startX !== undefined ? cfg.startX + dIdx * cfg.stepX! : cfg.x!;
        const posZ = cfg.startZ !== undefined ? cfg.startZ + dIdx * cfg.stepZ! : cfg.z!;

        const dCanvas = document.createElement('canvas');
        dCanvas.width = 256;
        dCanvas.height = 160;
        const dCtx = dCanvas.getContext('2d')!;

        // Pure black high-contrast background with fluorescent safety yellow border
        dCtx.fillStyle = '#09090b';
        dCtx.fillRect(0, 0, 256, 160);
        dCtx.lineWidth = 12;
        dCtx.strokeStyle = '#facc15';
        dCtx.strokeRect(6, 6, 244, 148);

        dCtx.fillStyle = '#ffffff';
        dCtx.font = '900 82px "Arial Black", sans-serif';
        dCtx.textAlign = 'center';
        dCtx.textBaseline = 'middle';
        dCtx.fillText(distText, 128, 80);

        const dTex = new THREE.CanvasTexture(dCanvas);
        const dMat = new THREE.MeshStandardMaterial({
          map: dTex,
          roughness: 0.35,
          metalness: 0.15,
        });

        const mGroup = new THREE.Group();
        mGroup.position.set(posX, 0, posZ);
        mGroup.rotation.y = cfg.rotY;

        const board = new THREE.Mesh(distBoardGeo, dMat);
        board.position.y = 1.35;
        board.castShadow = true;
        mGroup.add(board);

        // Ground anchor post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 8), this.metalDarkMat);
        post.position.y = 0.675;
        mGroup.add(post);

        this.group.add(mGroup);
      });
    });
  }

  /**
   * Helper to build a seamless curved road quad mesh in the XZ plane
   */
  private createCornerRoadMesh(
    cx: number,
    cz: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
    segments: number = 32,
    mat: THREE.Material = this.asphaltMat,
    yPos: number = 0.005
  ): THREE.Mesh {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * (endAngle - startAngle);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      positions.push(cx + cosA * innerR, yPos, cz + sinA * innerR);
      uvs.push(0, t * 6);

      positions.push(cx + cosA * outerR, yPos, cz + sinA * outerR);
      uvs.push(1, t * 6);
    }

    for (let i = 0; i < segments; i++) {
      const p1 = i * 2;
      const p2 = p1 + 1;
      const p3 = (i + 1) * 2;
      const p4 = p3 + 1;

      indices.push(p1, p3, p2);
      indices.push(p2, p3, p4);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Dynamic Prop Physics Simulation (Knockdowns, roll, bounce & friction)
   */
  public updateDynamicProps(dt: number): void {
    const gravity = 19.6;
    const airDrag = 0.985;
    const groundFriction = 0.88;

    for (let i = 0; i < this.dynamicProps.length; i++) {
      const prop = this.dynamicProps[i];
      if (prop.isSleeping) continue;

      // Integrate Velocity
      prop.position.x += prop.velocity.x * dt;
      prop.position.z += prop.velocity.z * dt;
      prop.position.y += prop.velocity.y * dt;

      // Apply Gravity
      if (prop.position.y > prop.baseY) {
        prop.velocity.y -= gravity * dt;
      } else {
        prop.position.y = prop.baseY;
        prop.velocity.y = Math.max(0, -prop.velocity.y * 0.35);
        prop.velocity.x *= groundFriction;
        prop.velocity.z *= groundFriction;
        prop.angularVelocity.x *= 0.90;
        prop.angularVelocity.z *= 0.90;
      }

      prop.velocity.x *= airDrag;
      prop.velocity.z *= airDrag;

      // Integrate Rotation
      prop.rotation.x += prop.angularVelocity.x * dt;
      prop.rotation.y += prop.angularVelocity.y * dt;
      prop.rotation.z += prop.angularVelocity.z * dt;

      // Sync Mesh Transform
      prop.mesh.position.copy(prop.position);
      prop.mesh.rotation.set(prop.rotation.x, prop.rotation.y, prop.rotation.z);

      // Sleep Threshold check
      const speedSq = prop.velocity.lengthSq();
      const angSpeedSq = prop.angularVelocity.lengthSq();
      if (speedSq < 0.04 && angSpeedSq < 0.04 && prop.position.y <= prop.baseY + 0.05) {
        prop.isSleeping = true;
        prop.velocity.set(0, 0, 0);
        prop.angularVelocity.set(0, 0, 0);
      }
    }
  }

  /**
   * Imparts crash momentum to a breakaway prop
   */
  public impartImpulseToProp(
    prop: DynamicProp,
    carVelocity: THREE.Vector3,
    contactNormal: THREE.Vector3
  ): void {
    prop.isSleeping = false;
    const impactSpeed = carVelocity.length();
    const impulseStrength = Math.min(28, Math.max(4, impactSpeed * 1.35));

    prop.velocity.x = contactNormal.x * impulseStrength + carVelocity.x * 0.45;
    prop.velocity.z = contactNormal.z * impulseStrength + carVelocity.z * 0.45;
    prop.velocity.y = Math.min(10, impulseStrength * 0.4 + Math.random() * 2);

    prop.angularVelocity.x = (Math.random() - 0.5) * impulseStrength * 1.8;
    prop.angularVelocity.y = (Math.random() - 0.5) * impulseStrength * 2.2;
    prop.angularVelocity.z = (Math.random() - 0.5) * impulseStrength * 1.8;
  }

  /**
   * Helper to create photorealistic fixed contact shadows with authentic
   * structural steel truss/lattice silhouettes, FIA equipment pods, and optical penumbra falloff.
   * Renders at 0.00ms runtime GPU overhead with zero Z-fighting or fillrate drop.
   */
  private createOverheadSoftShadow(
    width: number,
    length: number,
    type: 'gantry' | 'arch' | 'speed_trap',
    opacity = 0.65
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Base Ambient Penumbra Wash (Soft diffused solar atmospheric shadow)
    const radGrad = ctx.createRadialGradient(256, 256, 60, 256, 256, 250);
    radGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.40)');
    radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
    radGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.08)');
    radGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Realistic Structural Steel Lattice & Frame Silhouettes
    if (type === 'gantry' || type === 'speed_trap') {
      // Main parallel longitudinal steel girders
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      // Primary chord A
      ctx.fillRect(160, 32, 40, 448);
      // Primary chord B
      ctx.fillRect(312, 32, 40, 448);

      // Steel Cross-Struts and Triangular Lattice (Warren Truss pattern)
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let y = 48; y <= 464; y += 42) {
        // Horizontal connecting ties
        ctx.moveTo(160, y);
        ctx.lineTo(352, y);
        // Diagonal bracing trusses
        ctx.moveTo(160, y);
        ctx.lineTo(352, y + 42);
      }
      ctx.stroke();

      if (type === 'gantry') {
        // 5 FIA Red Start Light Pod Silhouettes hanging below the bridge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        for (let l = 0; l < 5; l++) {
          const podY = 175 + l * 38;
          ctx.beginPath();
          ctx.arc(128, podY, 15, 0, Math.PI * 2);
          ctx.fill();
          // Small bracket
          ctx.fillRect(128, podY - 5, 40, 10);
        }
      } else {
        // Digital Speed Trap Radar Box & Transponder Antenna Silhouettes
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(118, 190, 52, 132);
        ctx.fillRect(342, 220, 28, 72);
      }
    } else if (type === 'arch') {
      // Massive 38m Sponsor Arch Bridge: Solid Aerodynamic Cantilever Body & Framing
      // Core solid box shadow with soft penumbra core
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(36, 120, 440, 272);

      // Sponsor Billboard Header & Trim
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(24, 150, 464, 212);

      // Secondary structural stiffeners on the trailing edge
      ctx.lineWidth = 16;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.beginPath();
      for (let x = 64; x <= 448; x += 48) {
        ctx.moveTo(x, 100);
        ctx.lineTo(x, 412);
      }
      ctx.stroke();
    }

    // 3. Optical Penumbra Softening Mask (Solar Angular Diameter blur filter)
    ctx.globalCompositeOperation = 'destination-in';
    const edgeGradX = ctx.createLinearGradient(0, 0, 512, 0);
    edgeGradX.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    edgeGradX.addColorStop(0.10, 'rgba(0, 0, 0, 0.85)');
    edgeGradX.addColorStop(0.5, 'rgba(0, 0, 0, 1.0)');
    edgeGradX.addColorStop(0.90, 'rgba(0, 0, 0, 0.85)');
    edgeGradX.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = edgeGradX;
    ctx.fillRect(0, 0, 512, 512);

    const edgeGradY = ctx.createLinearGradient(0, 0, 0, 512);
    edgeGradY.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    edgeGradY.addColorStop(0.08, 'rgba(0, 0, 0, 0.90)');
    edgeGradY.addColorStop(0.5, 'rgba(0, 0, 0, 1.0)');
    edgeGradY.addColorStop(0.92, 'rgba(0, 0, 0, 0.90)');
    edgeGradY.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = edgeGradY;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(width, length);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.018; // Sits flush above asphalt and kerbs
    mesh.renderOrder = 3;
    return mesh;
  }
}
