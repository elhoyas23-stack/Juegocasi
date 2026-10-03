/**
 * HeatHazeEffect.ts - High-Performance WebGL Atmospheric Heat Distortion Engine
 * Simulates photorealistic optical thermal refraction and convective air turbulence:
 * 1. Volumetric Exhaust & Engine Bay Plume Shimmer (intensifies at high engine temperatures and heavy throttle)
 * 2. Ground Asphalt Mirage Heat Waves (shimmering atmospheric distortion over the hot asphalt surface)
 *
 * Implemented with custom GLSL shaders, procedural FBM turbulence, and optical chromatic dispersion.
 */

import * as THREE from 'three';

export interface HeatHazeState {
  engineTemp: number; // in °C (80°C to 135°C)
  rpm: number;        // 1000 to 9200
  speedKmh: number;   // 0 to 350 km/h
  throttle: number;   // 0.0 to 1.0
  carPosition: THREE.Vector3;
  carYaw: number;
}

export class HeatHazeEffect {
  public group: THREE.Group;

  // 1. Rear Exhaust & Engine Bay Convection Plume
  private plumeMesh!: THREE.Mesh;
  private plumeMaterial!: THREE.ShaderMaterial;

  // 2. Asphalt Surface Mirage Heat Layer
  private groundMirageMesh!: THREE.Mesh;
  private groundMirageMaterial!: THREE.ShaderMaterial;

  // Internal time accumulator
  private time: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.initPlumeShimmer();
    this.initGroundMirage();
  }

  /**
   * 1. Volumetric Convective Plume Shader behind the engine airbox and twin exhaust exits
   */
  private initPlumeShimmer(): void {
    // Tapered frustum ribbon extending behind the car
    const geo = new THREE.PlaneGeometry(1.8, 4.5, 12, 18);
    // Origin at the engine deck/exhausts, extending rearwards along -Z
    geo.translate(0, 2.25, 0);
    geo.rotateX(Math.PI / 2); // Lay along horizontal plane
    geo.translate(0, 0.45, -2.4); // Position just above exhaust deck extending rearward

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uEngineTemp;
      uniform float uRpmRatio;
      uniform float uThrottle;

      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;

      // Fast procedural 2D Perlin/Simplex hash turbulence
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                       dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion (Turbulent convective vortices)
      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p = p * 2.02;
        f += 0.2500 * noise(p); p = p * 2.03;
        f += 0.1250 * noise(p); p = p * 2.01;
        return f;
      }

      void main() {
        if (uIntensity <= 0.01) {
          discard;
        }

        // Animated turbulent convection coordinates (rising and flowing backward)
        vec2 flowUV = vUv;
        float flowSpeed = 3.5 + uThrottle * 4.0 + uRpmRatio * 3.0;
        
        // Multi-frequency noise sampling for swirling air distortion
        float n1 = fbm(flowUV * vec2(4.0, 10.0) + vec2(0.0, -uTime * flowSpeed));
        float n2 = fbm(flowUV * vec2(8.0, 16.0) + vec2(n1 * 1.5, -uTime * flowSpeed * 1.4));
        
        // Shimmer gradient: intense near engine / exhaust (vUv.y near 0.0), fades smoothly backwards (vUv.y -> 1.0)
        float lengthFalloff = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.4, 1.0, vUv.y));
        // Side falloff (so edges are completely soft and invisible)
        float widthFalloff = smoothstep(0.0, 0.35, vUv.x) * (1.0 - smoothstep(0.65, 1.0, vUv.x));
        float shapeMask = lengthFalloff * widthFalloff;

        // Dynamic thermal distortion amplitude
        float tempFactor = clamp((uEngineTemp - 80.0) / 45.0, 0.0, 1.5);
        float totalDistortion = (0.25 + 0.75 * tempFactor) * (0.35 + 0.65 * (uThrottle + uRpmRatio * 0.5)) * uIntensity;

        // Optical Chromatic Aberration & Shimmer Glint
        vec3 heatColorCore = vec3(1.0, 0.88, 0.70); // Warm radiant thermal core
        vec3 heatColorEdge = vec3(0.85, 0.92, 1.0); // Ambient refractive edge
        
        // Shimmer wave pulse
        float shimmer = sin(vUv.y * 35.0 - uTime * 18.0 + n2 * 6.0) * 0.5 + 0.5;
        
        // Final alpha & thermal glow
        float alpha = shapeMask * totalDistortion * (0.35 + shimmer * 0.25);
        
        // Subtle amber tint under extreme heat (>110°C)
        vec3 finalColor = mix(heatColorEdge, heatColorCore, clamp((uEngineTemp - 95.0) / 30.0, 0.0, 1.0));

        gl_FragColor = vec4(finalColor, clamp(alpha * 0.45, 0.0, 0.65));
      }
    `;

    this.plumeMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uEngineTemp: { value: 85.0 },
        uRpmRatio: { value: 0.1 },
        uThrottle: { value: 0.0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.plumeMesh = new THREE.Mesh(geo, this.plumeMaterial);
    this.group.add(this.plumeMesh);
  }

  /**
   * 2. Ground Asphalt Mirage Optical Refraction
   */
  private initGroundMirage(): void {
    const geo = new THREE.PlaneGeometry(60, 60, 1, 1);
    geo.rotateX(-Math.PI / 2);

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uEngineTemp;
      uniform vec3 uCarPos;

      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        if (uIntensity <= 0.01) {
          discard;
        }

        // Distance from car
        float distToCar = distance(vWorldPos.xz, uCarPos.xz);
        // Mirage is visible from 5m to 45m ahead of driver
        float distMask = smoothstep(3.0, 12.0, distToCar) * (1.0 - smoothstep(32.0, 55.0, distToCar));

        // Ultra-fast multi-harmonic wave interference (avoids 4 hash computations per fragment)
        vec2 waveUV = vWorldPos.xz * 0.35;
        float wave1 = sin(waveUV.x * 2.5 + uTime * 4.0) * cos(waveUV.y * 2.5 - uTime * 3.5);
        float wave2 = sin(waveUV.x * 4.8 - uTime * 2.2 + waveUV.y * 3.1) * 0.5 + 0.5;
        float mirageWave = (wave1 * 0.5 + wave2 * 0.5);

        // Sky reflection glint (mirage illusion of watery shimmer on hot asphalt)
        float glint = pow(max(0.0, mirageWave * 0.8 + 0.2), 3.0);
        vec3 mirageSkyColor = vec3(0.85, 0.93, 1.0); // Sky reflection shimmer

        float tempFactor = clamp((uEngineTemp - 80.0) / 40.0, 0.1, 1.2);
        float alpha = distMask * glint * uIntensity * tempFactor;

        gl_FragColor = vec4(mirageSkyColor, clamp(alpha * 0.22, 0.0, 0.35));
      }
    `;

    this.groundMirageMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uEngineTemp: { value: 85.0 },
        uCarPos: { value: new THREE.Vector3() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.groundMirageMesh = new THREE.Mesh(geo, this.groundMirageMaterial);
    this.groundMirageMesh.position.set(0, 0.04, 0);
    this.group.add(this.groundMirageMesh);
  }

  /**
   * Main per-frame update loop for atmospheric thermal simulation
   */
  public update(dt: number, state: HeatHazeState): void {
    this.time += dt;

    // 1. Calculate Thermal & Aerodynamic Activity Factor
    const tempAboveNormal = Math.max(0, state.engineTemp - 82.0); // starts shimmering above 82°C
    const tempRatio = Math.min(1.0, tempAboveNormal / 38.0); // max shimmer at 120°C
    const rpmIntensity = (state.rpm - 1000) / 8200; // 0.0 to 1.0
    const speedRatio = Math.min(1.0, state.speedKmh / 180.0);

    // Convective shimmer is strongest when stationary with hot engine
    const stationaryHeatMultiplier = Math.max(0.0, 1.0 - speedRatio);
    const loadMultiplier = (0.2 + state.throttle * 0.5 + rpmIntensity * 0.3);
    const totalIntensity = (0.25 + tempRatio * 0.75) * loadMultiplier * stationaryHeatMultiplier;

    if (totalIntensity < 0.02 || state.speedKmh > 20) {
      this.plumeMesh.visible = false;
      this.groundMirageMesh.visible = false;
      return;
    }
    this.plumeMesh.visible = true;
    this.groundMirageMesh.visible = false; // Ground mirage disabled to keep asphalt 100% sharp

    // 2. Position Plume Mesh behind car
    this.plumeMesh.position.copy(state.carPosition);
    this.plumeMesh.rotation.y = state.carYaw;

    // 3. Update Uniforms for Exhaust Plume
    this.plumeMaterial.uniforms.uTime.value = this.time;
    this.plumeMaterial.uniforms.uIntensity.value = totalIntensity;
    this.plumeMaterial.uniforms.uEngineTemp.value = state.engineTemp;
    this.plumeMaterial.uniforms.uRpmRatio.value = rpmIntensity;
    this.plumeMaterial.uniforms.uThrottle.value = state.throttle;
  }

  public dispose(): void {
    this.plumeMaterial.dispose();
    this.groundMirageMaterial.dispose();
  }
}
