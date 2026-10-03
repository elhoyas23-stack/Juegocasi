/**
 * CarModel.ts - Hyper-Realistic Formula / Le Mans Prototype Racing Car
 * Features:
 * - Four-Layer PBR Automotive Paint Shader: Clearcoat gloss, metallic pearlescent base,
 *   woven 2x2 twill carbon fiber, and procedural 2K racing livery canvas map.
 * - Procedural 2K Racing Livery: Bold racing dorsal #01, motorsport technical sponsors
 *   (Pirelli, Brembo, Shell V-Power, Apex Racing, Tag Heuer, BBS), speed chevrons,
 *   gold pinstriping, and official FIA safety markings (extinguisher & high-voltage switches).
 * - Sculpted Organic Aerodynamic Bodywork:
 *   * Curved sidepods (pontones) with shark-nose overbite intake, extreme lower undercut
 *     channeling air over the carbon floor, and downwash waterfall slides.
 *   * Coke-bottle waistline narrowing tightly around the gearbox.
 *   * Overhead Airbox intake hoop and continuous carbon dorsal shark fin.
 *   * Full 3-point titanium F1 safety Halo with top vortex deflector.
 *   * Multi-element cascaded F1 front wing with outwash footplate tunnels & double canards.
 *   * Dual Inconel / Titanium exhaust pipes with burnt rainbow discoloration & glowing core.
 *   * Detailed race cockpit: carbon bucket seat, 6-point harness, and F1 LCD steering wheel.
 */

import * as THREE from 'three';
import { DamageState } from '../physics/VehiclePhysics';
import { CarModelImporter } from '../loaders/CarModelImporter';
import { TireCompoundType, TIRE_COMPOUNDS } from '../physics/TireCompound';
import { TeamLiveryConfig, RACE_TEAMS } from '../career/CareerTypes';

export class CarModel {
  public group: THREE.Group;
  public liveryConfig: TeamLiveryConfig;

  // Custom User-Uploaded 3D Model State
  public currentModelName: string = 'F1 Turbo GP';
  public isCustomModel: boolean = false;
  private customModelGroup: THREE.Group = new THREE.Group();
  private proceduralBodyGroup: THREE.Group = new THREE.Group();
  private customWheelMeshes: THREE.Object3D[] = [];
  private customWheelPivotsFront: THREE.Object3D[] = [];

  // Wheel meshes for steering and rotation
  private wheelMeshes: THREE.Group[] = [];
  private wheelPivots: THREE.Group[] = [];
  private wheelPivotsFront: THREE.Group[] = [];
  private brakeDiscs: THREE.Mesh[] = [];
  private tireStripeMaterials: THREE.MeshStandardMaterial[] = [];
  private tireMeshList: THREE.Mesh[] = [];

  // Aerodynamic Wing and Deformable Mesh Elements
  private wingGroup!: THREE.Group;
  private noseMesh!: THREE.Mesh;
  private pristineNosePositions!: Float32Array;
  private lastAppliedCrumple: number = -1;

  // Redesigned Inconel / Titanium Exhaust System & High-Performance Flame Shader
  private exhaustTips: THREE.Group[] = [];
  private exhaustFlameMaterials: THREE.ShaderMaterial[] = [];
  private exhaustFlameMeshes: THREE.Mesh[] = [];
  private exhaustGlowMat!: THREE.MeshStandardMaterial;
  private exhaustPointLight!: THREE.PointLight;
  private backfireState = { active: false, phaseTime: 0, totalDuration: 0.17, isHighRpm: false };
  private flameGlobalTime = 0;

  // Dynamic Lighting
  private headlightGlowMat!: THREE.MeshStandardMaterial;
  private taillightMaterial!: THREE.MeshStandardMaterial;
  private brakeDiscMaterial!: THREE.MeshStandardMaterial;
  private fiaRainLight!: THREE.MeshStandardMaterial;
  private headlightsLeft!: THREE.SpotLight;
  private headlightsRight!: THREE.SpotLight;

  // Animated Racing Cockpit & Steering System
  private steeringWheelPivot!: THREE.Group;
  private steeringWheel!: THREE.Group;
  private driverHelmet!: THREE.Group;
  private revLedMeshes: THREE.Mesh[] = [];
  private currentSteerAnim: number = 0;

  // Shared Performance Materials
  private bodyMaterial!: THREE.MeshPhysicalMaterial;
  private carbonMaterial!: THREE.MeshStandardMaterial;
  private goldMetalMat!: THREE.MeshStandardMaterial;
  private haloMaterial!: THREE.MeshStandardMaterial;

  // Procedural 2K Livery Texture
  private liveryTexture!: THREE.CanvasTexture;

  constructor(livery?: TeamLiveryConfig) {
    this.liveryConfig = livery || RACE_TEAMS[0];
    this.group = new THREE.Group();
    this.createLiveryTexture();
    this.initMaterials();
    this.buildCarBody();
    this.buildWheels();
    this.buildLights();
    this.buildExhausts();
    this.buildUnderbodyContactShadow();
  }

  /**
   * Procedural 2K High-Definition Racing Livery & Decals Generator
   * Generates a 2048x2048 competition skin with bold dorsal, motorsport sponsors,
   * speed chevrons, gold pinstripes, and official FIA safety markings.
   */
  private createLiveryTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;
    const cfg = this.liveryConfig;

    // 1. Base Layer: Primary Team Color
    ctx.fillStyle = cfg.primaryColor;
    ctx.fillRect(0, 0, 2048, 2048);

    // Subtle dark gradient shading towards flanks & underbody
    const flankGrad = ctx.createLinearGradient(0, 0, 2048, 0);
    flankGrad.addColorStop(0.0, 'rgba(0,0,0,0.45)');
    flankGrad.addColorStop(0.25, 'rgba(0,0,0,0.05)');
    flankGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    flankGrad.addColorStop(0.75, 'rgba(0,0,0,0.05)');
    flankGrad.addColorStop(1.0, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = flankGrad;
    ctx.fillRect(0, 0, 2048, 2048);

    // 2. SECONDARY COLOR ENGINE COVER, AIRBOX & POD SWEEPS
    ctx.fillStyle = cfg.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(1024, 620);
    ctx.lineTo(1380, 1150);
    ctx.lineTo(1280, 1680);
    ctx.lineTo(768, 1680);
    ctx.lineTo(668, 1150);
    ctx.closePath();
    ctx.fill();

    // Accent Stripe on Airbox Spine
    ctx.fillStyle = cfg.accentColor;
    ctx.fillRect(1008, 600, 32, 1080);

    // 3. Lower Carbon Side Skirts & Undercut Floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 1640, 2048, 408);
    ctx.fillRect(0, 0, 2048, 180);

    // 4. Competition Racing Number
    // Nose Cone Number Plaque
    ctx.save();
    ctx.translate(1024, 430);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-120, -95, 240, 190, 20);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = cfg.primaryColor;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 900 140px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cfg.driverNumber, 0, 6);
    ctx.restore();

    // Side Dorsals on Engine Cover
    [410, 1638].forEach((sideX) => {
      ctx.save();
      ctx.translate(sideX, 1220);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-100, -80, 200, 160, 16);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = cfg.primaryColor;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 900 110px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.driverNumber, 0, 5);
      ctx.restore();
    });

    // 5. OFFICIAL MOTORSPORT SPONSORS & TEAM BADGES
    // Main Sponsor on Airbox & Engine Cover
    ctx.save();
    ctx.translate(1024, 980);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.sponsorName, 0, 0);
    ctx.restore();

    // SHELL / TEAM BADGE (Sidepods & Nose)
    [360, 1688].forEach((sideX) => {
      ctx.save();
      ctx.translate(sideX, 860);
      ctx.fillStyle = cfg.accentColor;
      ctx.beginPath();
      ctx.arc(0, -32, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = cfg.primaryColor;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.driverCode, 0, 16);
      ctx.restore();
    });

    // UPS (Sidepod Forward Flanks)
    [440, 1608].forEach((upsX) => {
      ctx.save();
      ctx.translate(upsX, 720);
      ctx.fillStyle = '#b45309'; // Bronze UPS shield
      ctx.beginPath();
      ctx.roundRect(-45, -24, 90, 48, 8);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ups', 0, 2);
      ctx.restore();
    });

    // PIRELLI (Front Nose Cone & Wing)
    ctx.save();
    ctx.translate(1024, 250);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(-160, -28, 320, 56, 12);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.font = 'italic 900 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PIRELLI', 0, 3);
    ctx.restore();

    // RAY-BAN & HUBLOT (Cockpit Surround)
    ctx.save();
    ctx.translate(1024, 760);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'italic bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ray-Ban  ·  HUBLOT', 0, 0);
    ctx.restore();

    // Team Title Inscription
    ctx.save();
    ctx.translate(1024, 1420);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.teamName.toUpperCase(), 0, 0);
    ctx.fillStyle = cfg.accentColor;
    ctx.font = 'bold 22px monospace';
    ctx.fillText('1.6L TURBO HYBRID V6', 0, 34);
    ctx.restore();

    // 6. FIA Regulatory Safety Markings
    [780, 1268].forEach((markerX) => {
      ctx.save();
      ctx.translate(markerX, 790);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', 0, 1);
      ctx.restore();
    });

    // High Voltage Hybrid Cut-Off (Blue triangle with lightning bolt)
    [780, 1268].forEach((markerX) => {
      ctx.save();
      ctx.translate(markerX, 840);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(18, 16);
      ctx.lineTo(-18, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Yellow lightning bolt
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(-6, 2);
      ctx.lineTo(2, 2);
      ctx.lineTo(-2, 12);
      ctx.lineTo(6, 0);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    this.liveryTexture = new THREE.CanvasTexture(canvas);
    this.liveryTexture.wrapS = THREE.RepeatWrapping;
    this.liveryTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.liveryTexture.generateMipmaps = true;
    this.liveryTexture.anisotropy = 16;
  }

  private initMaterials(): void {
    const cfg = this.liveryConfig;

    // Four-Layer PBR Automotive Paint Material with Clearcoat Gloss
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.primaryColor),
      roughness: 0.16,
      metalness: 0.04, // Non-metallic automotive clearcoat prevents cyan sky reflection!
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 1.0,
      ior: 1.54,
    });

    // 2x2 Twill Matte Carbon Fiber Material (True composite: dark, non-metallic, satin sheen)
    this.carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x141517,
      roughness: 0.62,
      metalness: 0.04, // Eliminates mirror-like sky reflections on wings and diffuser!
    });

    // Anodized Accent for wing adjusters & hardware
    this.goldMetalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.accentColor),
      metalness: 0.94,
      roughness: 0.16,
    });

    // Titanium Material for F1 Safety Halo with Team Halo Color
    this.haloMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.haloColor),
      metalness: 0.92,
      roughness: 0.22,
    });

    // Glowing Ceramic/Steel Brake Discs
    this.brakeDiscMaterial = new THREE.MeshStandardMaterial({
      color: 0x48484e,
      metalness: 0.92,
      roughness: 0.20,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
    });

    // Headlight projector glass & LED
    this.headlightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 3.0,
      roughness: 0.06,
    });

    // Active Taillight LED strip
    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1020,
      emissive: 0xdd0812,
      emissiveIntensity: 0.9,
      roughness: 0.15,
    });

    // FIA central rain strobe
    this.fiaRainLight = new THREE.MeshStandardMaterial({
      color: 0xff0020,
      emissive: 0xff0020,
      emissiveIntensity: 2.2,
    });

    // Inconel / Titanium thermal exhaust core glow
    this.exhaustGlowMat = new THREE.MeshStandardMaterial({
      color: 0x221105,
      emissive: 0xff3b00,
      emissiveIntensity: 0.0,
      roughness: 0.32,
      metalness: 0.88,
    });
  }

  /**
   * Sculpted aerodynamic body with F1 front wing, organic curved sidepods with extreme undercut,
   * Coke-bottle waistline, F1 titanium Halo, and overhead airbox with dorsal shark fin.
   */
  private buildCarBody(): void {
    const carBodyGroup = new THREE.Group();

    // 1. Central Carbon Monocoque / Cockpit Tub (Curved aerodynamic envelope)
    const monocoqueGeo = new THREE.BoxGeometry(1.24, 0.44, 3.35, 6, 4, 12);
    const pos = monocoqueGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const y = pos.getY(i);
      const x = pos.getX(i);

      // Organic Coke-bottle waistline narrowing tightly around driver cockpit
      if (z > -0.35 && z < 0.65) {
        pos.setX(i, x * (0.88 + Math.pow(Math.sin((z + 0.35) / 1.0 * Math.PI), 2) * -0.06));
      }
      // Top shoulder rounding
      if (y > 0.08) {
        pos.setX(i, x * 0.85);
        pos.setY(i, y * 0.92);
      }
      // Underside curvature
      if (y < -0.08) {
        pos.setY(i, y * 0.75);
      }
    }
    monocoqueGeo.computeVertexNormals();
    const monocoqueMesh = new THREE.Mesh(monocoqueGeo, this.bodyMaterial);
    monocoqueMesh.position.set(0, 0.35, 0);
    monocoqueMesh.castShadow = true;
    monocoqueMesh.receiveShadow = true;
    carBodyGroup.add(monocoqueMesh);

    // 2. F1 SLENDER NEEDLE NOSE CONE (Aerodynamic downward slope & needle tip)
    const noseGeo = new THREE.CylinderGeometry(0.22, 0.58, 1.48, 20, 10);
    noseGeo.rotateX(Math.PI / 2);
    const nosePos = noseGeo.attributes.position;
    for (let i = 0; i < nosePos.count; i++) {
      const y = nosePos.getY(i);
      const z = nosePos.getZ(i);
      const x = nosePos.getX(i);

      if (y < 0) nosePos.setY(i, y * 0.40); // Flat underside for ground-effect
      if (z > 0) {
        // Needle taper towards front tip
        nosePos.setY(i, nosePos.getY(i) - z * 0.22);
        nosePos.setX(i, x * (1.0 - z * 0.34));
      }
    }
    noseGeo.computeVertexNormals();
    this.noseMesh = new THREE.Mesh(noseGeo, this.bodyMaterial);
    this.noseMesh.position.set(0, 0.33, 1.62);
    this.noseMesh.castShadow = true;
    this.noseMesh.receiveShadow = true;
    carBodyGroup.add(this.noseMesh);

    this.pristineNosePositions = new Float32Array(noseGeo.attributes.position.array);

    // S-Duct Air Intake Scoop on top of nose cone
    const sDuctGeo = new THREE.BoxGeometry(0.18, 0.04, 0.32);
    const sDuctMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
    const sDuct = new THREE.Mesh(sDuctGeo, sDuctMat);
    sDuct.position.set(0, 0.45, 1.65);
    carBodyGroup.add(sDuct);

    // Pitot Speed Probe Needle at tip of nose
    const pitotGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8);
    pitotGeo.rotateX(Math.PI / 2);
    const pitot = new THREE.Mesh(pitotGeo, this.goldMetalMat);
    pitot.position.set(0, 0.23, 2.45);
    carBodyGroup.add(pitot);

    // 3. MULTI-ELEMENT FORMULA 1 FRONT WING
    const f1FrontWingGroup = new THREE.Group();

    // Twin Carbon Vertical Mounting Pylons
    [-0.14, 0.14].forEach((pylonX) => {
      const pylonGeo = new THREE.BoxGeometry(0.025, 0.22, 0.38);
      pylonGeo.rotateX(-0.15);
      const pylon = new THREE.Mesh(pylonGeo, this.carbonMaterial);
      pylon.position.set(pylonX, 0.19, 2.22);
      f1FrontWingGroup.add(pylon);
    });

    // Tier 1: Main Ground-Effect Carbon Wing Blade (2.20m wide, arched neutral channel)
    const mainPlaneGeo = new THREE.BoxGeometry(2.20, 0.028, 0.48, 14, 1, 4);
    const mpPos = mainPlaneGeo.attributes.position;
    for (let i = 0; i < mpPos.count; i++) {
      const x = mpPos.getX(i);
      const z = mpPos.getZ(i);
      mpPos.setZ(i, z + Math.abs(x / 1.1) * 0.08);
      mpPos.setY(i, mpPos.getY(i) + Math.pow(Math.abs(x) / 1.1, 2) * 0.04);
    }
    mainPlaneGeo.computeVertexNormals();
    const mainPlane = new THREE.Mesh(mainPlaneGeo, this.carbonMaterial);
    mainPlane.position.set(0, 0.09, 2.24);
    mainPlane.castShadow = true;
    f1FrontWingGroup.add(mainPlane);

    // Tier 2: Secondary Contoured Upper Aerofoil Flap
    const flapGeo = new THREE.BoxGeometry(2.14, 0.022, 0.34, 12, 1, 3);
    flapGeo.rotateX(-0.14);
    const flap = new THREE.Mesh(flapGeo, this.carbonMaterial);
    flap.position.set(0, 0.14, 2.18);
    flap.castShadow = true;
    f1FrontWingGroup.add(flap);

    // Tier 3: Tertiary Upper Gurney Flap Blade with gold adjusters
    const gurneyGeo = new THREE.BoxGeometry(2.08, 0.016, 0.16);
    gurneyGeo.rotateX(-0.24);
    const gurney = new THREE.Mesh(gurneyGeo, this.carbonMaterial);
    gurney.position.set(0, 0.19, 2.12);
    f1FrontWingGroup.add(gurney);

    // Slot-Gap Separators
    [-0.55, 0.55].forEach((sepX) => {
      const sepGeo = new THREE.BoxGeometry(0.015, 0.08, 0.22);
      const sep = new THREE.Mesh(sepGeo, this.goldMetalMat);
      sep.position.set(sepX, 0.14, 2.18);
      f1FrontWingGroup.add(sep);
    });

    // Aerodynamic Curved Vertical Endplates with Outwash Tunnels & Canards
    [-1.11, 1.11].forEach((endX) => {
      const isRight = endX > 0;
      const endplateGeo = new THREE.BoxGeometry(0.025, 0.28, 0.68);
      const endplate = new THREE.Mesh(endplateGeo, this.carbonMaterial);
      endplate.position.set(endX, 0.18, 2.22);
      f1FrontWingGroup.add(endplate);

      // Curved Outwash Footplate Tunnel
      const footplateGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8, 1, true, 0, Math.PI);
      footplateGeo.rotateZ(Math.PI / 2);
      footplateGeo.rotateY(isRight ? -0.15 : 0.15);
      const footplate = new THREE.Mesh(footplateGeo, this.carbonMaterial);
      footplate.position.set(endX + (isRight ? 0.03 : -0.03), 0.09, 2.22);
      f1FrontWingGroup.add(footplate);

      // Dual-Tier Diveplane Canards
      [0.17, 0.26].forEach((canardY, cIdx) => {
        const canardGeo = new THREE.BoxGeometry(0.14, 0.015, 0.22 - cIdx * 0.04);
        canardGeo.rotateZ(isRight ? -0.32 : 0.32);
        canardGeo.rotateX(-0.12);
        const canard = new THREE.Mesh(canardGeo, this.carbonMaterial);
        canard.position.set(endX + (isRight ? 0.07 : -0.07), canardY, 2.25 - cIdx * 0.08);
        f1FrontWingGroup.add(canard);
      });
    });

    carBodyGroup.add(f1FrontWingGroup);

    // 4. CURVED AERODYNAMIC SIDEPODS (PONTONES) WITH EXTREME UNDERCUT & DOWNWASH
    [-0.84, 0.84].forEach((xSide) => {
      const isRight = xSide > 0;
      // High-subdivision mesh to sculpt the organic undercut and waterfall slide
      const sidepodGeo = new THREE.BoxGeometry(0.52, 0.44, 2.15, 6, 6, 14);
      const spPos = sidepodGeo.attributes.position;
      for (let i = 0; i < spPos.count; i++) {
        const z = spPos.getZ(i);
        const y = spPos.getY(i);
        const x = spPos.getX(i);

        // 1. Shark-Nose Overbite Intake (Top forward lip extends forward over concave mouth)
        if (z > 0.6 && y > 0.05) {
          spPos.setZ(i, z + 0.12); // Forward protrusion
        }

        // 2. Extreme Lower Undercut Channel (Inner air pathway under sidepod)
        if (y < 0.0 && z > -0.4 && z < 0.8) {
          const depth = Math.sin(((z + 0.4) / 1.2) * Math.PI);
          // Draw outer vertices inward, carving a massive channel for ground-effect air
          spPos.setX(i, x * (1.0 - depth * 0.36));
        }

        // 3. Downwash Waterfall Slide (Top surface descends smoothly towards rear)
        if (y > 0.05 && z < 0.5) {
          const rearSlope = (0.5 - z) / 1.5;
          spPos.setY(i, y - rearSlope * 0.18);
        }

        // 4. Smooth Outer Curvature (No sharp 90-degree creases)
        if (Math.abs(x) > 0.15 && y > 0.1) {
          spPos.setY(i, y * 0.90);
          spPos.setX(i, x * 0.92);
        }
      }
      sidepodGeo.computeVertexNormals();
      const sidepod = new THREE.Mesh(sidepodGeo, this.bodyMaterial);
      sidepod.position.set(xSide, 0.32, -0.05);
      sidepod.castShadow = true;
      sidepod.receiveShadow = true;
      carBodyGroup.add(sidepod);

      // NACA Radiator Intake Air Cavity (Recessed dark cavity)
      const ductCavityGeo = new THREE.BoxGeometry(0.36, 0.24, 0.08);
      const ductMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const duct = new THREE.Mesh(ductCavityGeo, ductMat);
      duct.position.set(xSide, 0.35, 1.02);
      carBodyGroup.add(duct);

      // Carbon Fiber Stepped Floor Edge with Longitudinal Venturi Vortices
      const floorGeo = new THREE.BoxGeometry(0.42, 0.03, 2.30);
      const floor = new THREE.Mesh(floorGeo, this.carbonMaterial);
      floor.position.set(xSide, 0.11, -0.05);
      carBodyGroup.add(floor);

      // Aerodynamic Sidepod Winglet Mirrors (Carbon Aerofoil Stalk & Housing)
      const mirrorStalkGeo = new THREE.BoxGeometry(0.18, 0.015, 0.08);
      mirrorStalkGeo.rotateZ(isRight ? -0.35 : 0.35);
      const mirrorStalk = new THREE.Mesh(mirrorStalkGeo, this.carbonMaterial);
      mirrorStalk.position.set(isRight ? 0.62 : -0.62, 0.54, 0.45);
      carBodyGroup.add(mirrorStalk);

      const mirrorHousingGeo = new THREE.BoxGeometry(0.14, 0.065, 0.08);
      const mirrorHousing = new THREE.Mesh(mirrorHousingGeo, this.carbonMaterial);
      mirrorHousing.position.set(isRight ? 0.72 : -0.72, 0.58, 0.45);
      mirrorHousing.castShadow = true;
      carBodyGroup.add(mirrorHousing);

      // Reflective Chrome Mirror Glass on face
      const mirrorGlassGeo = new THREE.PlaneGeometry(0.12, 0.05);
      mirrorGlassGeo.rotateY(Math.PI);
      const mirrorGlassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.02,
        metalness: 0.98,
      });
      const mirrorGlass = new THREE.Mesh(mirrorGlassGeo, mirrorGlassMat);
      mirrorGlass.position.set(isRight ? 0.72 : -0.72, 0.58, 0.491);
      carBodyGroup.add(mirrorGlass);
    });

    // 5. TITANIUM F1 SAFETY HALO (3-Point Tubular Safety Hoop & Central Pylon)
    const haloGroup = new THREE.Group();

    // Curved Overhead Tubular Hoop
    const haloHoopGeo = new THREE.TorusGeometry(0.36, 0.032, 10, 24, Math.PI * 1.05);
    haloHoopGeo.rotateX(Math.PI / 2);
    haloHoopGeo.rotateZ(Math.PI / 2);
    const haloHoop = new THREE.Mesh(haloHoopGeo, this.haloMaterial);
    haloHoop.position.set(0, 0.74, 0.02);
    haloHoop.castShadow = true;
    haloGroup.add(haloHoop);

    // Central Forward Support Pylon (Connecting to nose/monocoque)
    const haloCenterPylonGeo = new THREE.CylinderGeometry(0.028, 0.038, 0.36, 12);
    haloCenterPylonGeo.rotateX(0.42);
    const haloCenterPylon = new THREE.Mesh(haloCenterPylonGeo, this.haloMaterial);
    haloCenterPylon.position.set(0, 0.62, 0.38);
    haloCenterPylon.castShadow = true;
    haloGroup.add(haloCenterPylon);

    // Micro-Vortex Aerodynamic Deflector on top of Halo
    const haloDeflectorGeo = new THREE.BoxGeometry(0.24, 0.015, 0.06);
    haloDeflectorGeo.rotateX(-0.1);
    const haloDeflector = new THREE.Mesh(haloDeflectorGeo, this.carbonMaterial);
    haloDeflector.position.set(0, 0.78, 0.04);
    haloGroup.add(haloDeflector);

    carBodyGroup.add(haloGroup);

    // 6. OVERHEAD AIRBOX INTAKE & CONTINUOUS CARBON DORSAL SHARK FIN
    const airboxGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.55, 16);
    airboxGeo.rotateX(0.25);
    const airbox = new THREE.Mesh(airboxGeo, this.bodyMaterial);
    airbox.position.set(0, 0.88, -0.22);
    airbox.castShadow = true;
    carBodyGroup.add(airbox);

    // Airbox Mouth Intake Hole
    const airboxHoleGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 14);
    airboxHoleGeo.rotateX(Math.PI / 2);
    const airboxHole = new THREE.Mesh(airboxHoleGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    airboxHole.position.set(0, 0.95, -0.05);
    carBodyGroup.add(airboxHole);

    // Carbon Fiber Dorsal Shark Fin along spine
    const sharkFinGeo = new THREE.BoxGeometry(0.028, 0.52, 1.45, 1, 4, 8);
    const sfPos = sharkFinGeo.attributes.position;
    for (let i = 0; i < sfPos.count; i++) {
      const z = sfPos.getZ(i);
      const y = sfPos.getY(i);
      if (z < 0 && y > 0) {
        sfPos.setY(i, y * (1.0 + (z / 0.72) * 0.45)); // Swept dorsal profile towards rear wing
      }
    }
    sharkFinGeo.computeVertexNormals();
    const sharkFin = new THREE.Mesh(sharkFinGeo, this.carbonMaterial);
    sharkFin.position.set(0, 0.82, -0.92);
    sharkFin.castShadow = true;
    carBodyGroup.add(sharkFin);

    // 7. DETAILED RACING COCKPIT INTERIOR (Open F1 Monocoque Tub)
    // Carbon Cockpit Rim Collar & Head Protection Surround
    const cockpitSurroundGeo = new THREE.TorusGeometry(0.38, 0.042, 8, 24, Math.PI * 1.15);
    cockpitSurroundGeo.rotateX(Math.PI / 2);
    cockpitSurroundGeo.rotateZ(Math.PI / 2);
    const cockpitSurround = new THREE.Mesh(cockpitSurroundGeo, this.carbonMaterial);
    cockpitSurround.position.set(0, 0.54, 0.08);
    carBodyGroup.add(cockpitSurround);

    // Front Perspex Aerodynamic Wind Deflector Lip (Clean, ultra-transparent perspex)
    const aeroLipGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.035, 16, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
    aeroLipGeo.rotateX(Math.PI / 2);
    const aeroLipMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0.05,
      transmission: 0.95,
      opacity: 0.25,
      transparent: true,
      reflectivity: 0.95,
    });
    const aeroLip = new THREE.Mesh(aeroLipGeo, aeroLipMat);
    aeroLip.position.set(0, 0.56, 0.38);
    carBodyGroup.add(aeroLip);

    // Carbon Monocoque Bucket Seat with Headrest Foam Cushions
    const seatGeo = new THREE.BoxGeometry(0.48, 0.55, 0.65);
    seatGeo.rotateX(0.3);
    const seat = new THREE.Mesh(seatGeo, this.carbonMaterial);
    seat.position.set(0, 0.42, 0.05);
    carBodyGroup.add(seat);

    // Headrest Safety Foam Surrounds (FIA Blue)
    const headrestGeo = new THREE.BoxGeometry(0.42, 0.18, 0.35);
    const headrestMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    const headrest = new THREE.Mesh(headrestGeo, headrestMat);
    headrest.position.set(0, 0.64, -0.12);
    carBodyGroup.add(headrest);

    // 6-Point Racing Harness Belts (Red woven belts with gold central clasp)
    [-0.11, 0.11].forEach((harnX) => {
      const beltGeo = new THREE.BoxGeometry(0.06, 0.015, 0.45);
      beltGeo.rotateX(0.35);
      const beltMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 });
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.set(harnX, 0.54, 0.02);
      carBodyGroup.add(belt);
    });
    const claspGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
    const clasp = new THREE.Mesh(claspGeo, this.goldMetalMat);
    clasp.position.set(0, 0.48, 0.16);
    carBodyGroup.add(clasp);

    // Formula 1 Butterfly Steering Wheel with LCD Telemetry Screen & Dynamic Shift LEDs
    this.steeringWheelPivot = new THREE.Group();
    this.steeringWheelPivot.position.set(0, 0.52, 0.28);
    this.steeringWheelPivot.rotation.x = -0.38; // Ergonomic steering column slant

    this.steeringWheel = new THREE.Group();

    // 1. Central Carbon Fiber Core Hub & Housing
    const hubGeo = new THREE.BoxGeometry(0.12, 0.08, 0.024);
    const hubMesh = new THREE.Mesh(hubGeo, this.carbonMaterial);
    this.steeringWheel.add(hubMesh);

    // 2. Ergonomic F1 Butterfly Hand Grips (Alcantara / Molded Suede)
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    [-0.082, 0.082].forEach((gripX) => {
      const isRight = gripX > 0;
      // Vertical contour grip
      const gripGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.11, 10);
      gripGeo.rotateZ(isRight ? -0.12 : 0.12);
      const grip = new THREE.Mesh(gripGeo, gripMat);
      grip.position.set(gripX, 0, 0.005);
      this.steeringWheel.add(grip);

      // Ergonomic Thumb Rests
      const thumbGeo = new THREE.BoxGeometry(0.025, 0.022, 0.022);
      const thumb = new THREE.Mesh(thumbGeo, gripMat);
      thumb.position.set(gripX * 0.85, 0.03, 0.01);
      this.steeringWheel.add(thumb);

      // Racing Gloves Gripping the Wheel (Red & White Motorsport Gloves)
      const gloveGeo = new THREE.SphereGeometry(0.026, 10, 8);
      gloveGeo.scale(0.9, 1.4, 1.0);
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
      const glove = new THREE.Mesh(gloveGeo, gloveMat);
      glove.position.set(gripX, 0.005, 0.012);
      this.steeringWheel.add(glove);
    });

    // 3. Central Telemetry LCD Digital Display
    const lcdGeo = new THREE.PlaneGeometry(0.068, 0.038);
    const lcdMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const lcd = new THREE.Mesh(lcdGeo, lcdMat);
    lcd.position.set(0, 0.005, 0.013);
    this.steeringWheel.add(lcd);

    // 4. Shift Rev Indicator LEDs (Dynamic RPM Lighting: Green -> Yellow -> Red -> Magenta)
    this.revLedMeshes = [];
    for (let led = -3; led <= 3; led++) {
      const ledGeo = new THREE.SphereGeometry(0.005, 8, 8);
      const baseColor = Math.abs(led) <= 1 ? 0x22c55e : Math.abs(led) === 2 ? 0xeab308 : 0xef4444;
      const ledMat = new THREE.MeshBasicMaterial({ color: baseColor });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(led * 0.012, 0.032, 0.014);
      this.steeringWheel.add(ledMesh);
      this.revLedMeshes.push(ledMesh);
    }

    // 5. Rotary Multi-Function Dials & Pushbuttons (Gold, Blue, Yellow)
    [
      { x: -0.032, y: -0.024, c: 0xf59e0b },
      { x: 0.032, y: -0.024, c: 0x3b82f6 },
      { x: -0.022, y: 0.024, c: 0xef4444 },
      { x: 0.022, y: 0.024, c: 0x10b981 },
    ].forEach((btn) => {
      const btnGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 8);
      btnGeo.rotateX(Math.PI / 2);
      const btnMat = new THREE.MeshStandardMaterial({ color: btn.c, roughness: 0.3 });
      const button = new THREE.Mesh(btnGeo, btnMat);
      button.position.set(btn.x, btn.y, 0.014);
      this.steeringWheel.add(button);
    });

    this.steeringWheelPivot.add(this.steeringWheel);
    carBodyGroup.add(this.steeringWheelPivot);

    // Driver Helmet with Dynamic G-Force Apex Tilt
    this.driverHelmet = new THREE.Group();
    this.driverHelmet.position.set(0, 0.64, 0.05);

    const helmetGeo = new THREE.SphereGeometry(0.14, 16, 14);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.5 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    this.driverHelmet.add(helmet);

    const visorGeo = new THREE.BoxGeometry(0.16, 0.06, 0.12);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.01, 0.07);
    this.driverHelmet.add(visor);
    carBodyGroup.add(this.driverHelmet);

    // 8. REAR ENGINE DECK, DIFFUSER & SWAN-NECK REAR WING
    const engineCoverGeo = new THREE.BoxGeometry(1.05, 0.32, 1.15, 4, 3, 6);
    const ecPos = engineCoverGeo.attributes.position;
    for (let i = 0; i < ecPos.count; i++) {
      const z = ecPos.getZ(i);
      if (z < 0) {
        ecPos.setY(i, ecPos.getY(i) * 0.82);
      }
    }
    engineCoverGeo.computeVertexNormals();
    const engineCover = new THREE.Mesh(engineCoverGeo, this.bodyMaterial);
    engineCover.position.set(0, 0.44, -1.05);
    engineCover.castShadow = true;
    carBodyGroup.add(engineCover);

    // Rear Carbon Diffuser with vertical aerodynamic fins
    const diffuserGeo = new THREE.BoxGeometry(1.8, 0.12, 0.75);
    diffuserGeo.rotateX(0.18);
    const diffuser = new THREE.Mesh(diffuserGeo, this.carbonMaterial);
    diffuser.position.set(0, 0.18, -1.8);
    carBodyGroup.add(diffuser);

    [-0.6, -0.2, 0.2, 0.6].forEach((finX) => {
      const finGeo = new THREE.BoxGeometry(0.03, 0.18, 0.65);
      const fin = new THREE.Mesh(finGeo, this.carbonMaterial);
      fin.position.set(finX, 0.2, -1.82);
      carBodyGroup.add(fin);
    });

    // Central FIA Rain Strobe LED
    const fiaGeo = new THREE.BoxGeometry(0.14, 0.08, 0.05);
    const fiaMesh = new THREE.Mesh(fiaGeo, this.fiaRainLight);
    fiaMesh.position.set(0, 0.22, -1.86);
    carBodyGroup.add(fiaMesh);

    // Swan-Neck Carbon Fiber Rear Wing with Endplates
    this.wingGroup = new THREE.Group();
    const wingGeo = new THREE.BoxGeometry(2.1, 0.04, 0.42, 8, 1, 3);
    const wPos = wingGeo.attributes.position;
    for (let i = 0; i < wPos.count; i++) {
      const z = wPos.getZ(i);
      wPos.setY(i, wPos.getY(i) - z * 0.16);
    }
    wingGeo.computeVertexNormals();
    const wingBlade = new THREE.Mesh(wingGeo, this.carbonMaterial);
    wingBlade.position.set(0, 0.98, -1.85);
    wingBlade.castShadow = true;
    this.wingGroup.add(wingBlade);

    [-1.04, 1.04].forEach((endX) => {
      const endplateGeo = new THREE.BoxGeometry(0.03, 0.35, 0.52);
      const endplate = new THREE.Mesh(endplateGeo, this.carbonMaterial);
      endplate.position.set(endX, 0.96, -1.85);
      this.wingGroup.add(endplate);
    });

    [-0.42, 0.42].forEach((pylonX) => {
      const pylonGeo = new THREE.BoxGeometry(0.04, 0.48, 0.22);
      pylonGeo.rotateX(-0.35);
      const pylon = new THREE.Mesh(pylonGeo, this.carbonMaterial);
      pylon.position.set(pylonX, 0.74, -1.72);
      this.wingGroup.add(pylon);
    });

    carBodyGroup.add(this.wingGroup);
    this.proceduralBodyGroup = carBodyGroup;
    this.group.add(this.proceduralBodyGroup);
    this.group.add(this.customModelGroup);
  }

  /**
   * Forged Racing Alloy Wheels with Pirelli P-Zero Branding,
   * Anodized Centerlocks (Blue on Right, Red on Left per FIA Regulation),
   * and Spiral Perforated Brake Discs with Brembo Calipers.
   */
  private buildWheels(): void {
    const wheelPositions = [
      { x: -0.92, y: 0.34, z: 1.25, isFront: true, isRight: false }, // Front Left (Red Nut)
      { x: 0.92, y: 0.34, z: 1.25, isFront: true, isRight: true },   // Front Right (Blue Nut)
      { x: -0.94, y: 0.36, z: -1.25, isFront: false, isRight: false },// Rear Left (Red Nut)
      { x: 0.94, y: 0.36, z: -1.25, isFront: false, isRight: true }, // Rear Right (Blue Nut)
    ];

    const tireRadius = 0.35;
    const tireWidth = 0.32;

    wheelPositions.forEach((wp) => {
      const pivot = new THREE.Group();
      pivot.position.set(wp.x, wp.y, wp.z);
      pivot.userData = { baseY: wp.y, isRight: wp.isRight };

      const wheelRotGroup = new THREE.Group();

      // Rubber Slick Tire (Deep vulcanized racing rubber)
      const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.76,
        metalness: 0.02,
      });
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelRotGroup.add(tire);
      this.tireMeshList.push(tire);

      // Pirelli P-Zero Subtle Sidewall Pinstripe Ring
      const pzeroGeo = new THREE.TorusGeometry(tireRadius * 0.82, 0.007, 6, 24);
      pzeroGeo.rotateY(Math.PI / 2);
      const pzeroMat = new THREE.MeshStandardMaterial({
        color: 0xef4444, // Default Soft Red
        roughness: 0.65,
        metalness: 0.0,
      });
      const pzeroRing = new THREE.Mesh(pzeroGeo, pzeroMat);
      pzeroRing.position.x = wp.isRight ? tireWidth / 2 + 0.005 : -tireWidth / 2 - 0.005;
      wheelRotGroup.add(pzeroRing);
      this.tireStripeMaterials.push(pzeroMat);

      // BBS Forged Matte Gunmetal Titanium Rim
      const rimRadius = tireRadius * 0.65;
      const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth + 0.005, 18);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        metalness: 0.85,
        roughness: 0.28,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelRotGroup.add(rim);

      // Monolug Anodized Centerlock Nut (Dark satin finish)
      const centerlockGeo = new THREE.CylinderGeometry(0.065, 0.075, tireWidth + 0.03, 8);
      centerlockGeo.rotateZ(Math.PI / 2);
      const nutMat = new THREE.MeshStandardMaterial({
        color: wp.isRight ? 0x1e3a5f : 0x7f1d1d,
        metalness: 0.90,
        roughness: 0.25,
      });
      const centerlock = new THREE.Mesh(centerlockGeo, nutMat);
      wheelRotGroup.add(centerlock);

      // Spiral Perforated Steel/Carbon Brake Disc
      const discGeo = new THREE.CylinderGeometry(rimRadius * 0.84, rimRadius * 0.84, 0.032, 18);
      discGeo.rotateZ(Math.PI / 2);
      const disc = new THREE.Mesh(discGeo, this.brakeDiscMaterial.clone());
      this.brakeDiscs.push(disc);
      pivot.add(disc);

      // Brembo 6-Piston Caliper (Fluorescent Race Yellow)
      const caliperGeo = new THREE.BoxGeometry(0.08, 0.15, 0.22);
      const caliperMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22 });
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(wp.isRight ? -0.06 : 0.06, 0.06, 0.08);
      pivot.add(caliper);

      // Central Titanium Spindle Shaft (visible when wheel is dismounted)
      const spindleGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.22, 12);
      spindleGeo.rotateZ(Math.PI / 2);
      const spindleMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.95,
        roughness: 0.2,
      });
      const spindle = new THREE.Mesh(spindleGeo, spindleMat);
      spindle.position.set(wp.isRight ? 0.04 : -0.04, 0, 0);
      pivot.add(spindle);

      pivot.add(wheelRotGroup);
      this.proceduralBodyGroup.add(pivot);

      this.wheelMeshes.push(wheelRotGroup);
      this.wheelPivots.push(pivot);
      if (wp.isFront) {
        this.wheelPivotsFront.push(pivot);
      }
    });
  }

  /**
   * Physically slide wheel along axle off/on the hub during pit stop tire change
   */
  public setWheelOffset(wheelIdx: number, offset: number): void {
    if (this.wheelMeshes[wheelIdx]) {
      const isRight = wheelIdx === 1 || wheelIdx === 3;
      this.wheelMeshes[wheelIdx].position.x = offset * (isRight ? 1 : -1);
    }
  }

  public setWheelVisible(wheelIdx: number, visible: boolean): void {
    if (this.wheelMeshes[wheelIdx]) {
      this.wheelMeshes[wheelIdx].visible = visible;
    }
  }

  public setAllWheelsVisible(visible: boolean = true): void {
    for (let i = 0; i < 4; i++) {
      if (this.wheelMeshes[i]) {
        this.wheelMeshes[i].visible = visible;
      }
    }
  }

  public resetWheelOffsets(): void {
    for (let i = 0; i < 4; i++) {
      if (this.wheelMeshes[i]) {
        this.wheelMeshes[i].position.x = 0;
      }
    }
  }

  public setTireCompoundVisuals(compound: TireCompoundType): void {
    const config = TIRE_COMPOUNDS[compound] || TIRE_COMPOUNDS.soft;
    this.tireStripeMaterials.forEach((mat) => {
      mat.color.setHex(config.stripeColorHex);
    });
  }

  /**
   * Get dynamic world position of a wheel hub for Analytical Two-Bone IK targeting
   */
  public getWheelHubWorldPos(wheelIdx: number, target: THREE.Vector3): THREE.Vector3 {
    if (this.wheelPivots[wheelIdx]) {
      this.wheelPivots[wheelIdx].getWorldPosition(target);
      return target;
    }
    if (this.wheelMeshes[wheelIdx]) {
      this.wheelMeshes[wheelIdx].getWorldPosition(target);
      return target;
    }
    return target.set(0, 0, 0);
  }

  /**
   * Get rock-solid world position, outward axle unit vector, and orientation for any wheel spindle hub.
   * Remains perfectly stable regardless of whether the wheel mesh is detached, hidden, or offset.
   */
  public getSpindleWorldTransform(
    wheelIdx: number,
    outPos: THREE.Vector3,
    outDir: THREE.Vector3,
    outQuat: THREE.Quaternion
  ): void {
    const pivot = this.wheelPivots[wheelIdx];
    if (pivot) {
      this.group.updateMatrixWorld(true);
      pivot.getWorldPosition(outPos);
      pivot.getWorldQuaternion(outQuat);
      const isRight = (wheelIdx === 1 || wheelIdx === 3);
      // In pivot local space, the axle points along X (+X for right wheels, -X for left wheels)
      const localAxle = new THREE.Vector3(isRight ? 1 : -1, 0, 0);
      outDir.copy(localAxle).applyQuaternion(outQuat).normalize();
    } else {
      outPos.copy(this.group.position);
      outDir.set(0, 0, 1);
      outQuat.copy(this.group.quaternion);
    }
  }

  /**
   * Projector Headlights & Active LED Taillights
   */
  private buildLights(): void {
    [-0.68, 0.68].forEach((x) => {
      const lightGeo = new THREE.BoxGeometry(0.24, 0.08, 0.28);
      lightGeo.rotateY(x > 0 ? 0.2 : -0.2);
      const lightMesh = new THREE.Mesh(lightGeo, this.headlightGlowMat);
      lightMesh.position.set(x, 0.38, 2.05);
      this.proceduralBodyGroup.add(lightMesh);
    });

    this.headlightsLeft = new THREE.SpotLight(0xf8fafc, 5.0, 50, Math.PI / 6, 0.35, 1.2);
    this.headlightsLeft.position.set(-0.68, 0.45, 2.0);
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.7, 0, 20);
    this.group.add(targetL);
    this.headlightsLeft.target = targetL;
    this.group.add(this.headlightsLeft);

    this.headlightsRight = new THREE.SpotLight(0xf8fafc, 5.0, 50, Math.PI / 6, 0.35, 1.2);
    this.headlightsRight.position.set(0.68, 0.45, 2.0);
    const targetR = new THREE.Object3D();
    targetR.position.set(0.7, 0, 20);
    this.group.add(targetR);
    this.headlightsRight.target = targetR;
    this.group.add(this.headlightsRight);

    // Vertical Rain LED Strips on Rear Wing Endplates (F1 FIA Spec)
    [-1.05, 1.05].forEach((x) => {
      const ledGeo = new THREE.BoxGeometry(0.015, 0.28, 0.02);
      const ledMesh = new THREE.Mesh(ledGeo, this.taillightMaterial);
      ledMesh.position.set(x, 0.96, -2.11);
      this.proceduralBodyGroup.add(ledMesh);
    });

    // Dynamic Exhaust Backfire Point Light
    this.exhaustPointLight = new THREE.PointLight(0xff6600, 0, 10, 2);
    this.exhaustPointLight.position.set(0, 0.44, -2.1);
    this.group.add(this.exhaustPointLight);
  }

  /**
   * High-Performance Inconel / Titanium Twin Exhaust System:
   * Features beveled tailpipes with burnt titanium rainbow anodization rings (blue/violet/gold),
   * internal thermal glowing heat core, and dual backfire flame cones.
   */
  private buildExhausts(): void {
    const exhaustShroudGeo = new THREE.BoxGeometry(0.48, 0.16, 0.28);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.3,
    });
    const shroud = new THREE.Mesh(exhaustShroudGeo, shroudMat);
    shroud.position.set(0, 0.44, -1.68);
    this.proceduralBodyGroup.add(shroud);

    // Burnt Titanium Anodization Ring Materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      metalness: 0.96,
      roughness: 0.12,
    });
    const burntBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.92,
      roughness: 0.18,
    });
    const burntGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.92,
      roughness: 0.18,
    });

    [-0.125, 0.125].forEach((x) => {
      const tipGroup = new THREE.Group();
      tipGroup.position.set(x, 0.44, -1.74);

      // Outer Beveled Titanium Pipe
      const pipeGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.24, 16, 1, true);
      pipeGeo.rotateX(Math.PI / 2);
      const pipe = new THREE.Mesh(pipeGeo, titaniumMat);
      tipGroup.add(pipe);

      // Burnt Titanium Blue Heat Ring at the tip
      const blueRingGeo = new THREE.CylinderGeometry(0.069, 0.069, 0.06, 16, 1, true);
      blueRingGeo.rotateX(Math.PI / 2);
      const blueRing = new THREE.Mesh(blueRingGeo, burntBlueMat);
      blueRing.position.set(0, 0, -0.09);
      tipGroup.add(blueRing);

      // Burnt Gold Transition Ring
      const goldRingGeo = new THREE.CylinderGeometry(0.0685, 0.0685, 0.05, 16, 1, true);
      goldRingGeo.rotateX(Math.PI / 2);
      const goldRing = new THREE.Mesh(goldRingGeo, burntGoldMat);
      goldRing.position.set(0, 0, -0.035);
      tipGroup.add(goldRing);

      // Internal Glowing Inconel Core
      const coreGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.18, 14);
      coreGeo.rotateX(Math.PI / 2);
      const core = new THREE.Mesh(coreGeo, this.exhaustGlowMat);
      core.position.set(0, 0, 0.02);
      tipGroup.add(core);

      // Procedural Volumetric Backfire Flame Jet (Dual-Core Plasma + Mach Shock Diamonds + FBM Turbulence)
      const flameGeo = new THREE.CylinderGeometry(0.016, 0.082, 0.72, 16, 12, true);
      flameGeo.rotateX(-Math.PI / 2);
      flameGeo.translate(0, 0, -0.36); // origin at tailpipe exit extending along -Z

      const flameMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uLength: { value: 1.0 },
          uTurbulence: { value: 1.0 },
          uIsHighRpm: { value: 1.0 },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uLength;
          uniform float uTurbulence;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying float vDist;

          // 3D Simplex noise for fluid flame tongues
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

          float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                       i.z + vec4(0.0, i1.z, i2.z, 1.0))
                     + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                     + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }

          void main() {
            vUv = uv;
            vNormal = normalMatrix * normal;
            float zProgress = uv.y;
            vDist = zProgress;

            vec3 pos = position;
            pos.z *= uLength;

            // Chaotic high-speed tongue deformation
            float noiseTime = uTime * 48.0;
            float n1 = snoise(vec3(pos.xy * 10.0, zProgress * 4.0 - noiseTime));
            float n2 = snoise(vec3(pos.yx * 14.0, zProgress * 6.0 - noiseTime * 1.4));

            float dispersion = pow(zProgress, 1.3) * uTurbulence * 0.075;
            pos.x += n1 * dispersion;
            pos.y += n2 * dispersion;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uIntensity;
          uniform float uIsHighRpm;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying float vDist;

          void main() {
            if (uIntensity <= 0.001) discard;

            float z = vDist;

            // 1. Mach Shock Diamonds (Periodic supersonic gas compression standing nodes)
            float machFrequency = 26.0;
            float machWave = pow(clamp(cos(z * machFrequency - uTime * 20.0), 0.0, 1.0), 4.5);
            float machDiamond = machWave * smoothstep(0.04, 0.22, z) * (1.0 - smoothstep(0.72, 0.96, z));

            // 2. Dual-Core Thermal Color Profile
            vec3 electricBlue = vec3(0.3, 0.8, 1.8);
            vec3 whiteHot = vec3(1.7, 1.7, 1.8);
            vec3 moltenGold = vec3(1.5, 0.95, 0.25);
            vec3 orangeFlame = vec3(1.45, 0.52, 0.08);
            vec3 deepCrimson = vec3(0.85, 0.10, 0.02);

            vec3 baseColor;
            if (uIsHighRpm > 0.5) {
              if (z < 0.28) {
                baseColor = mix(whiteHot, electricBlue, z / 0.28);
              } else if (z < 0.65) {
                baseColor = mix(electricBlue, orangeFlame, (z - 0.28) / 0.37);
              } else {
                baseColor = mix(orangeFlame, deepCrimson, (z - 0.65) / 0.35);
              }
            } else {
              if (z < 0.20) {
                baseColor = mix(whiteHot, moltenGold, z / 0.20);
              } else if (z < 0.60) {
                baseColor = mix(moltenGold, orangeFlame, (z - 0.20) / 0.40);
              } else {
                baseColor = mix(orangeFlame, deepCrimson, (z - 0.60) / 0.40);
              }
            }

            // Boost with Mach Diamond standing waves
            baseColor += whiteHot * machDiamond * 0.9;

            // 3. Volumetric Alpha and Rim Profile
            float tipFade = smoothstep(0.0, 0.05, z);
            float tailFade = pow(clamp(1.0 - z, 0.0, 1.0), 1.4);
            float alpha = tipFade * tailFade * uIntensity;

            float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
            alpha *= (0.65 + 0.35 * rim);

            if (alpha < 0.008) discard;

            gl_FragColor = vec4(baseColor * uIntensity, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });

      const flame = new THREE.Mesh(flameGeo, flameMat);
      tipGroup.add(flame);
      this.exhaustFlameMeshes.push(flame);
      this.exhaustFlameMaterials.push(flameMat);

      this.exhaustTips.push(tipGroup);
      this.proceduralBodyGroup.add(tipGroup);
    });
  }

  /**
   * Get world positions of both tailpipe tips and rearward ejection vector for particle emission
   */
  public getExhaustWorldPositions(
    outLeft: THREE.Vector3,
    outRight: THREE.Vector3,
    outRearDir: THREE.Vector3
  ): void {
    if (this.exhaustTips.length >= 2) {
      this.exhaustTips[0].getWorldPosition(outLeft);
      this.exhaustTips[1].getWorldPosition(outRight);
      outLeft.y += 0.02;
      outRight.y += 0.02;
    } else {
      outLeft.copy(this.group.position);
      outRight.copy(this.group.position);
    }

    const worldQuat = new THREE.Quaternion();
    this.group.getWorldQuaternion(worldQuat);
    outRearDir.set(0, 0, -1).applyQuaternion(worldQuat).normalize();
  }

  /**
   * Get world positions of both rear wingtips for aerodynamic condensation vortex streamers
   */
  public getWingtipWorldPositions(
    outLeft: THREE.Vector3,
    outRight: THREE.Vector3,
    outRearDir: THREE.Vector3
  ): void {
    const p = this.group.position;
    const yaw = this.group.rotation.y;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    // Left wingtip: x = -1.04, y = 0.98, z = -1.85
    outLeft.set(
      p.x - cosY * 1.04 + sinY * 1.85,
      p.y + 0.98,
      p.z + sinY * 1.04 + cosY * 1.85
    );

    // Right wingtip: x = 1.04, y = 0.98, z = -1.85
    outRight.set(
      p.x + cosY * 1.04 + sinY * 1.85,
      p.y + 0.98,
      p.z - sinY * 1.04 + cosY * 1.85
    );

    outRearDir.set(-sinY, 0, -cosY);
  }

  /**
   * Get precise world ground contact positions for all 4 wheels [FL, FR, RL, RR]
   */
  public getFourWheelWorldPositions(
    outFL: THREE.Vector3,
    outFR: THREE.Vector3,
    outRL: THREE.Vector3,
    outRR: THREE.Vector3
  ): void {
    const outs = [outFL, outFR, outRL, outRR];
    for (let i = 0; i < 4; i++) {
      if (this.wheelMeshes[i]) {
        this.wheelMeshes[i].getWorldPosition(outs[i]);
        // Ground contact is bottom of tire (tire radius 0.35m below axle center)
        outs[i].y -= 0.34;
      } else {
        outs[i].copy(this.group.position);
      }
    }
  }

  /**
   * Module 2: Trigger Multi-Stage Backfire Lifecycle (Pop -> Rapid Triple Spit -> Inconel Thermal Afterglow)
   */
  public triggerBackfire(isHighRpm: boolean = false): void {
    this.backfireState.active = true;
    this.backfireState.phaseTime = 0;
    this.backfireState.totalDuration = isHighRpm ? 0.17 : 0.12;
    this.backfireState.isHighRpm = isHighRpm;

    // Flash light: electric blue-white plasma on high RPM, blazing gold on lower RPM
    this.exhaustPointLight.intensity = isHighRpm ? 8.5 : 5.5;
    this.exhaustPointLight.color.setHex(isHighRpm ? 0x60a5fa : 0xff9922);

    // Initial titanium tip incandescence boost
    this.exhaustGlowMat.emissive.setHex(isHighRpm ? 0xff4400 : 0xff6600);
    this.exhaustGlowMat.emissiveIntensity = 4.2;

    this.exhaustFlameMaterials.forEach((mat) => {
      mat.uniforms.uIsHighRpm.value = isHighRpm ? 1.0 : 0.0;
      mat.uniforms.uIntensity.value = 1.0;
      mat.uniforms.uLength.value = isHighRpm ? 1.45 : 1.1;
      mat.uniforms.uTurbulence.value = 0.6;
    });
  }

  /**
   * Update Car Animation every frame:
   * Steering angle with Ackermann geometry & Caster Counter-Steer, suspension compression, forward wheel rolling, brake disc glow, backfire lighting
   */
  public update(
    steerAngle: number,
    wheelRotations: number[],
    brake: number,
    speedKmh: number,
    damage: DamageState,
    isBackfiring: boolean,
    rpm: number = 1000,
    suspensionCompression?: number[],
    isPunctured?: boolean[],
    tireWear?: number[]
  ): void {
    // 1. Steering Pivot on Front Wheels with authentic Ackermann steering geometry
    // steerAngle > 0 is LEFT, steerAngle < 0 is RIGHT
    if (this.wheelPivotsFront[0] && this.wheelPivotsFront[1]) {
      if (steerAngle > 0) {
        // Turning left: wheels pivot left (positive rotation.y points front wheels towards driver's left)
        // Inside wheel (FL, index 0) turns slightly sharper than Outside wheel (FR, index 1)
        this.wheelPivotsFront[0].rotation.y = steerAngle * 1.08;
        this.wheelPivotsFront[1].rotation.y = steerAngle * 0.92;
      } else if (steerAngle < 0) {
        // Turning right: wheels pivot right (negative rotation.y points front wheels towards driver's right)
        // Inside wheel (FR, index 1) turns slightly sharper than Outside wheel (FL, index 0)
        this.wheelPivotsFront[0].rotation.y = steerAngle * 0.92;
        this.wheelPivotsFront[1].rotation.y = steerAngle * 1.08;
      } else {
        this.wheelPivotsFront[0].rotation.y = 0;
        this.wheelPivotsFront[1].rotation.y = 0;
      }
    }

    // 2. Forward Wheel Roll, Dynamic Suspension & Punctured Tire Visual Deflation
    for (let i = 0; i < 4; i++) {
      const punctured = Boolean(isPunctured && isPunctured[i]);
      const wear = (tireWear && tireWear[i] !== undefined) ? tireWear[i] : 0;

      // Dynamic suspension compression moves the entire hub assembly (pivot) realistically
      if (this.wheelPivots[i] && this.wheelPivots[i].userData?.baseY !== undefined) {
        const comp = (suspensionCompression && suspensionCompression[i] !== undefined)
          ? suspensionCompression[i]
          : 0;
        
        // Punctured wheel drops lower onto the rim
        const punctureDrop = punctured ? -0.075 : 0;
        this.wheelPivots[i].position.y = this.wheelPivots[i].userData.baseY + comp + punctureDrop;

        // Damaged suspension or punctured camber wobble
        const isLeftDamaged = i % 2 === 0 && damage.suspensionLeft < 75;
        const isRightDamaged = i % 2 === 1 && damage.suspensionRight < 75;
        
        if (punctured && speedKmh > 2) {
          // Violent rhythmic flat-tire wobble
          const flapFreq = wheelRotations[i] * 2.0;
          const camberAngle = (i % 2 === 0 ? -0.09 : 0.09) + Math.sin(flapFreq) * 0.04;
          this.wheelPivots[i].rotation.z = camberAngle;
        } else if ((isLeftDamaged || isRightDamaged) && speedKmh > 10) {
          const wobbleFreq = Date.now() * 0.035;
          this.wheelPivots[i].rotation.z = Math.sin(wobbleFreq) * 0.05;
        } else {
          this.wheelPivots[i].rotation.z = punctured ? (i % 2 === 0 ? -0.08 : 0.08) : 0;
        }
      }

      // Wheel rotation (forward roll around axle X) & Deflated tire geometry scale
      if (this.wheelMeshes[i]) {
        this.wheelMeshes[i].rotation.x = wheelRotations[i];
        this.wheelMeshes[i].position.y = 0;

        if (punctured) {
          // Deflated rubber pancake: compressed in height/radial axis
          const flatPulse = 0.74 + Math.sin(wheelRotations[i] * 2.0) * 0.04;
          this.wheelMeshes[i].scale.set(1.08, flatPulse, 1.08);
        } else {
          this.wheelMeshes[i].scale.set(1.0, 1.0, 1.0);
        }
      }

      // Scuff material roughness when tire is heavily worn
      if (this.tireMeshList[i]) {
        const mat = this.tireMeshList[i].material as THREE.MeshStandardMaterial;
        if (punctured) {
          mat.color.setHex(0x111113);
          mat.roughness = 0.98;
        } else if (wear > 75) {
          mat.color.setHex(0x222226);
          mat.roughness = 0.88;
        } else {
          mat.color.setHex(0x18181b);
          mat.roughness = 0.76;
        }
      }
    }

    // Note: When custom 3D model is active, the model is rendered intact with its native wheel positions,
    // avoiding broken coordinate pivots or wheel dislocations.

    // 3. Glowing Brake Discs during heavy braking
    const brakeIntensity = (brake > 0.35 && speedKmh > 35) ? Math.min(1.0, (brake * speedKmh) / 130) : 0;
    this.brakeDiscs.forEach((disc) => {
      const mat = disc.material as THREE.MeshStandardMaterial;
      if (brakeIntensity > 0.1) {
        mat.emissive.setHex(0xff3300);
        mat.emissiveIntensity = brakeIntensity * 2.8;
      } else {
        mat.emissiveIntensity = Math.max(0, mat.emissiveIntensity - 0.04);
      }
    });

    // 4. Taillight brightness
    if (brake > 0.1) {
      this.taillightMaterial.emissiveIntensity = 3.2;
      this.taillightMaterial.color.setHex(0xff0020);
    } else {
      this.taillightMaterial.emissiveIntensity = 0.8;
      this.taillightMaterial.color.setHex(0xaa0510);
    }

    // 5. Inconel Exhaust Thermal Glow (convective cooling based on airspeed)
    const targetGlow = Math.min(2.4, (speedKmh / 210) * 2.0);
    if (this.exhaustGlowMat.emissiveIntensity > targetGlow) {
      // Smooth convective cooling after a backfire
      const coolingRate = 1.8 + (speedKmh / 100) * 2.5;
      this.exhaustGlowMat.emissiveIntensity = Math.max(
        targetGlow,
        this.exhaustGlowMat.emissiveIntensity - 0.016 * coolingRate
      );
    } else {
      this.exhaustGlowMat.emissiveIntensity = THREE.MathUtils.lerp(
        this.exhaustGlowMat.emissiveIntensity,
        targetGlow,
        0.08
      );
    }

    // 6. Multi-Phase Backfire Flame Lifecycle
    if (isBackfiring && !this.backfireState.active) {
      this.triggerBackfire(false);
    }

    this.flameGlobalTime += 0.016;

    if (this.backfireState.active) {
      this.backfireState.phaseTime += 0.016;
      const pt = this.backfireState.phaseTime;
      const total = this.backfireState.totalDuration;
      const isHigh = this.backfireState.isHighRpm;

      let currentIntensity = 0;
      let currentLength = 1.0;
      let currentTurbulence = 1.0;

      if (pt < 0.035) {
        // Phase 1: Initial Supersonic Detonation Pop (0 - 35ms)
        const popRatio = pt / 0.035;
        currentIntensity = 1.0;
        currentLength = (isHigh ? 1.45 : 1.1) * (0.8 + 0.2 * Math.sin(popRatio * Math.PI));
        currentTurbulence = 0.5;
        this.exhaustPointLight.intensity = isHigh ? 8.5 : 5.5;
        this.exhaustPointLight.color.setHex(isHigh ? 0x60a5fa : 0xff9922);
      } else if (pt < total) {
        // Phase 2: Rapid Triple Spit Oscillation (35ms - 170ms)
        const spitProgress = (pt - 0.035) / (total - 0.035);
        const spitWave = Math.sin(spitProgress * Math.PI * 4.5) * 0.5 + 0.5;
        const spitDecay = 1.0 - spitProgress;

        currentIntensity = spitWave * spitDecay * 0.95;
        currentLength = (0.7 + spitWave * 0.65) * (isHigh ? 1.35 : 1.0);
        currentTurbulence = 1.2 + (1.0 - spitDecay) * 0.8;

        this.exhaustPointLight.intensity = spitWave * spitDecay * 4.5;
        this.exhaustPointLight.color.setHex(0xf97316);
      } else {
        // Backfire extinguished
        this.backfireState.active = false;
        currentIntensity = 0;
      }

      this.exhaustFlameMaterials.forEach((mat) => {
        mat.uniforms.uTime.value = this.flameGlobalTime;
        mat.uniforms.uIntensity.value = currentIntensity;
        mat.uniforms.uLength.value = currentLength;
        mat.uniforms.uTurbulence.value = currentTurbulence;
      });
    } else {
      this.exhaustPointLight.intensity = Math.max(0, this.exhaustPointLight.intensity - 0.35);
      this.exhaustFlameMaterials.forEach((mat) => {
        mat.uniforms.uTime.value = this.flameGlobalTime;
        mat.uniforms.uIntensity.value = Math.max(0, mat.uniforms.uIntensity.value - 0.2);
      });
    }

    // 7. Dynamic Wing Looseness on damage
    if (damage.wingLoose) {
      this.wingGroup.rotation.z = 0.14;
      this.wingGroup.rotation.y = 0.08;
    } else {
      this.wingGroup.rotation.z = 0;
      this.wingGroup.rotation.y = 0;
    }

    // 8. Visual Mesh Vertex Deformation (Bumper & Hood Crumple)
    this.applyVertexDeformation(damage.frontCrumple);

    // 9. Smooth Coordinated Steering Wheel & Cockpit Animation
    // Target rotation: steering left (steerAngle > 0) turns wheel left, steering right turns right
    // F1 steering wheels turn smoothly with realistic physical damping and micro-vibration under load
    const targetSteerAngle = steerAngle * 2.8;
    const steerLerpSpeed = 0.35;
    this.currentSteerAnim += (targetSteerAngle - this.currentSteerAnim) * steerLerpSpeed;

    if (this.steeringWheel) {
      // Apply subtle high-speed road vibration to steering wheel when rolling fast
      const roadVibe = (speedKmh > 40) ? (Math.random() - 0.5) * (speedKmh / 280) * 0.015 : 0;
      this.steeringWheel.rotation.z = this.currentSteerAnim + roadVibe;
    }

    // Driver Helmet Dynamic G-Force Apex Tilt (Driver looks naturally into corner apex)
    if (this.driverHelmet) {
      const helmetTiltTargetZ = -steerAngle * 0.12;
      const helmetYawTargetY = steerAngle * 0.18;
      this.driverHelmet.rotation.z += (helmetTiltTargetZ - this.driverHelmet.rotation.z) * 0.25;
      this.driverHelmet.rotation.y += (helmetYawTargetY - this.driverHelmet.rotation.y) * 0.25;
    }

    // Dynamic Shift Rev LEDs on Steering Wheel based on RPM
    if (this.revLedMeshes && this.revLedMeshes.length > 0) {
      const rpmRatio = Math.min(1.0, Math.max(0, (rpm - 2200) / 7000));
      const totalLeds = this.revLedMeshes.length;
      const activeLeds = Math.floor(rpmRatio * totalLeds);
      for (let i = 0; i < totalLeds; i++) {
        const mat = this.revLedMeshes[i].material as THREE.MeshBasicMaterial;
        if (i <= activeLeds && rpmRatio > 0.05) {
          const color = i < 2 ? 0x22c55e : i < 5 ? 0xeab308 : 0xef4444;
          mat.color.setHex(color);
        } else {
          mat.color.setHex(0x18181b); // Inactive dark diode
        }
      }
    }
  }

  /**
   * Displaces vertices of the nosecone to simulate realistic crumple zone damage.
   * Optimized: only recomputes vertices and normals when crumple value actually changes!
   */
  private applyVertexDeformation(frontCrumple: number): void {
    if (!this.noseMesh || !this.pristineNosePositions) return;

    // Zero-CPU optimization: if crumple hasn't changed, skip entirely!
    if (Math.abs(frontCrumple - this.lastAppliedCrumple) < 0.001) {
      return;
    }
    this.lastAppliedCrumple = frontCrumple;

    const pos = this.noseMesh.geometry.attributes.position;
    const count = pos.count;
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      const origZ = this.pristineNosePositions[i * 3 + 2];
      const origX = this.pristineNosePositions[i * 3];
      const origY = this.pristineNosePositions[i * 3 + 1];

      if (origZ > 0.05) {
        const crumpleAmount = frontCrumple * 0.38 * (origZ / 0.7);
        const targetZ = origZ - crumpleAmount;
        const dentNoise = Math.sin(origX * 7.5 + origY * 5) * frontCrumple * 0.08;

        pos.setZ(i, targetZ);
        pos.setY(i, origY + Math.abs(dentNoise) * 0.5);
        needsUpdate = true;
      } else {
        pos.setZ(i, origZ);
        pos.setY(i, origY);
      }
    }

    if (needsUpdate) {
      pos.needsUpdate = true;
      this.noseMesh.geometry.computeVertexNormals();
    }
  }

  /**
   * Load custom player 3D model (.glb, .gltf, .zip, .obj) and substitute vehicle
   */
  public async loadCustomModel(file: File): Promise<{ success: boolean; name: string; error?: string }> {
    try {
      const imported = await CarModelImporter.loadFromFile(file);
      this.customModelGroup.clear();
      this.customModelGroup.add(imported.rootGroup);
      this.customModelGroup.visible = true;
      this.proceduralBodyGroup.visible = false;
      this.isCustomModel = true;
      this.currentModelName = imported.name;
      this.customWheelMeshes = imported.wheelMeshes;
      this.customWheelPivotsFront = imported.wheelPivotsFront;

      // Hide procedural wheels completely when custom model is loaded
      this.wheelMeshes.forEach((w) => {
        w.visible = false;
      });

      return { success: true, name: imported.name };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, name: file.name, error: msg };
    }
  }

  /**
   * Restore the default F1 Turbo GP model
   */
  public restoreDefaultModel(): void {
    this.customModelGroup.clear();
    this.customModelGroup.visible = false;
    this.proceduralBodyGroup.visible = true;
    this.wheelMeshes.forEach((w) => {
      w.visible = true;
    });
    this.isCustomModel = false;
    this.currentModelName = 'F1 Turbo GP';
  }

  /**
   * Underbody Ambient Occlusion & Soft Ground Contact Shadow Plate
   * Eliminates the "floating car" sensation by grounding the chassis and 4 tires
   * firmly onto the asphalt road with optical contact occlusion.
   */
  private buildUnderbodyContactShadow(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Soft penumbra outer wash
    const outerGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 248);
    outerGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.95)');
    outerGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.75)');
    outerGrad.addColorStop(0.70, 'rgba(0, 0, 0, 0.35)');
    outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Chassis and floor undertray deep contact core (Umbra)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
    ctx.beginPath();
    ctx.roundRect(130, 70, 252, 370, 35);
    ctx.fill();

    // 3. 4 Tire Ground Contact Patches
    // Front Tires
    ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
    ctx.beginPath();
    ctx.ellipse(86, 95, 36, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(426, 95, 36, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear Tires
    ctx.beginPath();
    ctx.ellipse(78, 385, 46, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(434, 385, 46, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;

    const geo = new THREE.PlaneGeometry(2.8, 5.2);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    const contactMesh = new THREE.Mesh(geo, mat);
    contactMesh.position.set(0, 0.012, 0.12);
    contactMesh.renderOrder = 4;
    this.group.add(contactMesh);
  }
}
