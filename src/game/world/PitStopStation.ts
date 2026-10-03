/**
 * PitStopStation.ts - Highly Detailed 3D Pit Stop Box & Animated Pit Crew
 * Features realistic team mechanics, hydraulic chassis jacks, overhead lollipop sign,
 * pneumatic wheel guns with sparks, and dynamic repair times based on vehicle damage.
 */

import * as THREE from 'three';
import { ParticleSystem } from '../particles/ParticleSystem';
import { EngineSound } from '../audio/EngineSound';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export type PitStopPhase = 'empty' | 'approach' | 'lifting' | 'servicing' | 'dropping' | 'released';

export interface PitTelemetry {
  isActive: boolean;
  phase: PitStopPhase;
  progress: number;       // 0 to 1
  timeRemaining: number;  // seconds
  totalDuration: number;  // seconds
  statusText: string;
}

export class PitStopStation {
  public group: THREE.Group;

  // Visual sub-elements
  private lollipopArm!: THREE.Group;
  private lollipopSign!: THREE.Mesh;
  private lollipopLight!: THREE.PointLight;
  private frontJackMesh!: THREE.Group;
  private rearJackMesh!: THREE.Group;
  private mechanics: THREE.Group[] = [];

  // Pit Stop timing & state
  public phase: PitStopPhase = 'empty';
  public totalPitTime: number = 0;
  public pitTimer: number = 0;
  private carLiftHeight: number = 0; // 0 to 0.16m
  private targetLiftHeight: number = 0;

  // Box Coordinates (on South Straight Pit Lane)
  public readonly boxBounds = {
    minX: -18,
    maxX: 8,
    minZ: -120.5,
    maxZ: -113.5,
    centerX: -5,
    centerZ: -117,
  };

  // Materials
  private crewSuitMat!: THREE.MeshStandardMaterial;
  private helmetMat!: THREE.MeshStandardMaterial;
  private visorMat!: THREE.MeshStandardMaterial;
  private metalToolMat!: THREE.MeshStandardMaterial;
  private jackMat!: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.initMaterials();
    this.buildPitBoxInfrastructure();
    this.buildPitCrew();
    this.buildHydraulicJacks();
    this.buildOverheadLollipop();
  }

  private initMaterials(): void {
    // Team racing suit: high-visibility scarlet red & obsidian
    this.crewSuitMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.65,
      metalness: 0.1,
    });

    // Pit crew helmet
    this.helmetMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.6,
      roughness: 0.25,
    });

    // Helmet dark gold visor
    this.visorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.1,
    });

    // Pneumatic impact guns & steel racks
    this.metalToolMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.25,
    });

    // Hydraulic trolley jacks (Racing Yellow)
    this.jackMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.7,
      roughness: 0.3,
    });
  }

  /**
   * Builds the pit box ground markings, tool cabinets, and overhead gantry boom
   */
  private buildPitBoxInfrastructure(): void {
    const infra = new THREE.Group();
    const bx = this.boxBounds.centerX;
    const bz = this.boxBounds.centerZ;

    // 1. High-Visibility Tarmac Markings
    const boxMarkingGeo = new THREE.PlaneGeometry(24, 6.2);
    boxMarkingGeo.rotateX(-Math.PI / 2);
    const markCanvas = document.createElement('canvas');
    markCanvas.width = 512;
    markCanvas.height = 128;
    const mCtx = markCanvas.getContext('2d')!;
    mCtx.fillStyle = '#065f46'; // Deep emerald box
    mCtx.fillRect(0, 0, 512, 128);

    // Yellow hazard border stripes
    mCtx.strokeStyle = '#facc15';
    mCtx.lineWidth = 10;
    mCtx.strokeRect(6, 6, 500, 116);

    // Text & Wheel Targets
    mCtx.fillStyle = '#f8fafc';
    mCtx.font = 'bold 36px monospace';
    mCtx.textAlign = 'center';
    mCtx.fillText('★ APEX RACING PIT BOX ★', 256, 72);

    // Wheel markers
    mCtx.fillStyle = '#ef4444';
    mCtx.fillRect(60, 20, 45, 25);
    mCtx.fillRect(60, 83, 45, 25);
    mCtx.fillRect(407, 20, 45, 25);
    mCtx.fillRect(407, 83, 45, 25);

    const markTex = new THREE.CanvasTexture(markCanvas);
    const markMat = new THREE.MeshStandardMaterial({
      map: markTex,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
    });
    const markMesh = new THREE.Mesh(boxMarkingGeo, markMat);
    markMesh.position.set(bx, 0.012, bz);
    infra.add(markMesh);

    // 2. High-Tech Tool Cabinet & Telemetry Rig (Infield Wall Side)
    const cabinetGeo = new THREE.BoxGeometry(6.5, 2.2, 1.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const cabinet = new THREE.Mesh(cabinetGeo, cabMat);
    cabinet.position.set(bx - 3, 1.1, bz + 4.2);
    cabinet.castShadow = true;
    infra.add(cabinet);

    // Dual Telemetry Monitors on Cabinet
    for (let m = 0; m < 2; m++) {
      const monGeo = new THREE.PlaneGeometry(1.4, 0.85);
      const monMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const monitor = new THREE.Mesh(monGeo, monMat);
      monitor.position.set(bx - 4.5 + m * 2.2, 2.7, bz + 3.8);
      infra.add(monitor);
    }

    // 3. Fresh Tire Racks (Stacks of brand-new slick tires on mobile trolleys)
    [-7, 5].forEach((trolleyX) => {
      const rackGeo = new THREE.BoxGeometry(2.4, 0.2, 1.0);
      const rack = new THREE.Mesh(rackGeo, cabMat);
      rack.position.set(bx + trolleyX, 0.1, bz + 4.0);
      infra.add(rack);

      for (let t = 0; t < 3; t++) {
        const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16);
        tireGeo.rotateX(Math.PI / 2);
        const freshTireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
        const freshTire = new THREE.Mesh(tireGeo, freshTireMat);
        freshTire.position.set(bx + trolleyX - 0.7 + t * 0.7, 0.45, bz + 4.0);
        freshTire.castShadow = true;
        infra.add(freshTire);
      }
    });

    this.group.add(infra);
  }

  /**
   * Detailed 3D Pit Crew Mechanics with articulated limbs, helmets, and pneumatic wheel guns
   */
  private buildPitCrew(): void {
    const bx = this.boxBounds.centerX;
    const bz = this.boxBounds.centerZ;

    // 4 Tire Mechanics (FL, FR, RL, RR) + 1 Jack Operator Front + 1 Jack Operator Rear
    const crewPositions = [
      { id: 'FL', x: bx - 2.8, z: bz - 2.4, rotY: Math.PI / 2, isCrouched: true },
      { id: 'FR', x: bx - 2.8, z: bz + 2.4, rotY: -Math.PI / 2, isCrouched: true },
      { id: 'RL', x: bx + 2.8, z: bz - 2.4, rotY: Math.PI / 2, isCrouched: true },
      { id: 'RR', x: bx + 2.8, z: bz + 2.4, rotY: -Math.PI / 2, isCrouched: true },
      { id: 'JackFront', x: bx + 4.8, z: bz, rotY: Math.PI, isCrouched: false },
      { id: 'JackRear', x: bx - 4.8, z: bz, rotY: 0, isCrouched: false },
    ];

    crewPositions.forEach((cfg) => {
      const mechanic = new THREE.Group();
      mechanic.position.set(cfg.x, 0, cfg.z);
      mechanic.rotation.y = cfg.rotY;

      const bodyY = cfg.isCrouched ? 0.6 : 0.85;

      // Torso / Racing Suit
      const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
      const torso = new THREE.Mesh(torsoGeo, this.crewSuitMat);
      torso.position.y = bodyY;
      torso.castShadow = true;
      mechanic.add(torso);

      // Full-Face Pit Helmet with Gold Visor
      const headGeo = new THREE.SphereGeometry(0.2, 14, 12);
      const head = new THREE.Mesh(headGeo, this.helmetMat);
      head.position.y = bodyY + 0.52;
      head.castShadow = true;
      mechanic.add(head);

      const visorGeo = new THREE.BoxGeometry(0.22, 0.08, 0.12);
      const visor = new THREE.Mesh(visorGeo, this.visorMat);
      visor.position.set(0, bodyY + 0.52, 0.16);
      mechanic.add(visor);

      // Articulated Arms
      [-0.34, 0.34].forEach((armX) => {
        const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55);
        armGeo.rotateX(0.4);
        const arm = new THREE.Mesh(armGeo, this.crewSuitMat);
        arm.position.set(armX, bodyY + 0.1, 0.22);
        mechanic.add(arm);
      });

      // Legs / Stance
      [-0.18, 0.18].forEach((legX) => {
        const legGeo = new THREE.BoxGeometry(0.18, cfg.isCrouched ? 0.55 : 0.85, 0.22);
        const leg = new THREE.Mesh(legGeo, this.crewSuitMat);
        leg.position.set(legX, cfg.isCrouched ? 0.28 : 0.42, 0);
        mechanic.add(leg);
      });

      // Pneumatic Impact Gun held by tire mechanics
      if (cfg.isCrouched) {
        const gunGeo = new THREE.BoxGeometry(0.15, 0.2, 0.35);
        const gun = new THREE.Mesh(gunGeo, this.metalToolMat);
        gun.position.set(0, bodyY, 0.45);
        mechanic.add(gun);

        // Coiled pneumatic air hose
        const hoseGeo = new THREE.TorusGeometry(0.12, 0.02, 6, 12);
        const hoseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const hose = new THREE.Mesh(hoseGeo, hoseMat);
        hose.position.set(0, bodyY - 0.2, 0.35);
        mechanic.add(hose);
      }

      this.mechanics.push(mechanic);
      this.group.add(mechanic);
    });
  }

  /**
   * Hydraulic Quick-Lift Racing Jacks (Front & Rear)
   */
  private buildHydraulicJacks(): void {
    const bx = this.boxBounds.centerX;
    const bz = this.boxBounds.centerZ;

    // Front Jack
    this.frontJackMesh = new THREE.Group();
    const fBaseGeo = new THREE.BoxGeometry(1.6, 0.15, 0.6);
    const fBase = new THREE.Mesh(fBaseGeo, this.jackMat);
    this.frontJackMesh.add(fBase);

    const fLeverGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4);
    fLeverGeo.rotateZ(0.35);
    const fLever = new THREE.Mesh(fLeverGeo, this.metalToolMat);
    fLever.position.set(0.6, 0.6, 0);
    this.frontJackMesh.add(fLever);

    this.frontJackMesh.position.set(bx + 3.4, 0.1, bz);
    this.group.add(this.frontJackMesh);

    // Rear Jack
    this.rearJackMesh = new THREE.Group();
    const rBaseGeo = new THREE.BoxGeometry(1.6, 0.15, 0.6);
    const rBase = new THREE.Mesh(rBaseGeo, this.jackMat);
    this.rearJackMesh.add(rBase);

    const rLeverGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4);
    rLeverGeo.rotateZ(-0.35);
    const rLever = new THREE.Mesh(rLeverGeo, this.metalToolMat);
    rLever.position.set(-0.6, 0.6, 0);
    this.rearJackMesh.add(rLever);

    this.rearJackMesh.position.set(bx - 3.4, 0.1, bz);
    this.group.add(this.rearJackMesh);
  }

  /**
   * Overhead Lollipop Sign ("STOP" Red / "GO" Green) on rotating boom
   */
  private buildOverheadLollipop(): void {
    const bx = this.boxBounds.centerX;
    const bz = this.boxBounds.centerZ;

    this.lollipopArm = new THREE.Group();
    this.lollipopArm.position.set(bx - 1.2, 4.2, bz + 3.8);

    // Carbon boom arm extending across pit box
    const boomGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.5);
    boomGeo.rotateX(Math.PI / 2);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 });
    const boom = new THREE.Mesh(boomGeo, boomMat);
    boom.position.set(0, 0, -2.2);
    this.lollipopArm.add(boom);

    // Circular Lollipop Sign
    const signGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24);
    signGeo.rotateX(Math.PI / 2);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    this.lollipopSign = new THREE.Mesh(signGeo, signMat);
    this.lollipopSign.position.set(0, -1.2, -4.2);
    this.lollipopArm.add(this.lollipopSign);

    // Dynamic LED illumination
    this.lollipopLight = new THREE.PointLight(0xef4444, 2.5, 8);
    this.lollipopLight.position.set(0, -1.2, -4.2);
    this.lollipopArm.add(this.lollipopLight);

    this.group.add(this.lollipopArm);
  }

  /**
   * Main Pit Stop Simulation Tick
   * Calculates realistic damage-based repair time, lifts the car, runs crew animations & audio, and releases car
   */
  public update(
    dt: number,
    physics: VehiclePhysics,
    carModelGroup: THREE.Group,
    particles: ParticleSystem,
    audio: EngineSound
  ): PitTelemetry {
    const carPos = physics.position;
    const speedKmh = Math.abs(physics.speed) * 3.6;

    // Check if car is inside the pit box bounds
    const isInsideBox =
      carPos.x >= this.boxBounds.minX &&
      carPos.x <= this.boxBounds.maxX &&
      carPos.z >= this.boxBounds.minZ &&
      carPos.z <= this.boxBounds.maxZ;

    physics.isInPitStop = isInsideBox;

    // --- State Machine ---
    if (!isInsideBox) {
      this.phase = 'empty';
      this.pitTimer = 0;
      this.targetLiftHeight = 0;
      this.setLollipopState('stop', false);
    } else if (this.phase === 'empty' && isInsideBox) {
      if (speedKmh > 1.8) {
        this.phase = 'approach';
        this.setLollipopState('stop', true);
      } else {
        // Stationary inside box: INITIATE FULL REPAIR
        this.startPitService(physics);
      }
    } else if (this.phase === 'approach') {
      if (speedKmh <= 1.8) {
        this.startPitService(physics);
      }
    } else if (this.phase === 'lifting') {
      this.targetLiftHeight = 0.16;
      this.carLiftHeight += (this.targetLiftHeight - this.carLiftHeight) * Math.min(1.0, 8.0 * dt);

      if (Math.abs(this.carLiftHeight - 0.16) < 0.01) {
        this.phase = 'servicing';
      }
    } else if (this.phase === 'servicing') {
      this.pitTimer -= dt;

      // 1. Crew Working Vibrations & Pneumatic Impact Gun sparks
      const workVibe = Math.sin(Date.now() * 0.05);
      this.mechanics.forEach((m, idx) => {
        m.position.y = Math.sin(Date.now() * 0.03 + idx) * 0.03;
      });

      // 2. Bodywork Welding / Un-denting Sparks
      if (Math.random() < 0.35 && physics.damage.overallHealth < 98) {
        particles.emitSparks(
          new THREE.Vector3(carPos.x + 1.6, carPos.y + 0.35, carPos.z),
          new THREE.Vector3(0, 1, 0),
          12
        );
      }

      // 3. Proportional health restoration over the calculated pit time
      const repairFraction = dt / Math.max(0.1, this.totalPitTime);
      physics.damage.overallHealth = Math.min(100, physics.damage.overallHealth + 100 * repairFraction);
      physics.damage.engineHealth = Math.min(100, physics.damage.engineHealth + 100 * repairFraction);
      physics.damage.suspensionLeft = Math.min(100, physics.damage.suspensionLeft + 100 * repairFraction);
      physics.damage.suspensionRight = Math.min(100, physics.damage.suspensionRight + 100 * repairFraction);
      physics.damage.frontCrumple = Math.max(0, physics.damage.frontCrumple - 1.0 * repairFraction);
      physics.damage.rearCrumple = Math.max(0, physics.damage.rearCrumple - 1.0 * repairFraction);
      physics.damage.wingLoose = false;

      // 4. Check completion
      if (this.pitTimer <= 0) {
        physics.repairFull();
        this.phase = 'dropping';
        audio.triggerPitChime();
      }
    } else if (this.phase === 'dropping') {
      this.targetLiftHeight = 0;
      this.carLiftHeight += (this.targetLiftHeight - this.carLiftHeight) * Math.min(1.0, 14.0 * dt);

      if (this.carLiftHeight <= 0.01) {
        this.carLiftHeight = 0;
        this.phase = 'released';
        this.setLollipopState('go', true);
      }
    } else if (this.phase === 'released') {
      // Driver can accelerate away
      if (speedKmh > 5.0 || !isInsideBox) {
        this.phase = 'empty';
      }
    }

    // Apply hydraulic lift offset to the 3D car body
    carModelGroup.position.y = physics.position.y + this.carLiftHeight;

    // Animate Lollipop arm position
    const targetLollipopY = this.phase === 'servicing' || this.phase === 'lifting' ? 0 : -0.8;
    this.lollipopArm.rotation.z += (targetLollipopY - this.lollipopArm.rotation.z) * Math.min(1.0, 6.0 * dt);

    // Compute progress
    const progress = this.totalPitTime > 0 ? Math.min(1.0, Math.max(0, 1.0 - this.pitTimer / this.totalPitTime)) : 0;
    const timeRemaining = Math.max(0, this.pitTimer);

    let statusText = 'PIT LANE ABIERTO';
    if (this.phase === 'approach') statusText = 'DETÉN EL COCHE EN EL BOX';
    if (this.phase === 'lifting') statusText = 'ELEVANDO COCHE EN GATOS...';
    if (this.phase === 'servicing') statusText = `REPARANDO: ${timeRemaining.toFixed(1)}s`;
    if (this.phase === 'dropping') statusText = 'BAJANDO COCHE...';
    if (this.phase === 'released') statusText = '¡ADELANTE! BOX COMPLETADO';

    return {
      isActive: this.phase !== 'empty',
      phase: this.phase,
      progress,
      timeRemaining,
      totalDuration: this.totalPitTime,
      statusText,
    };
  }

  /**
   * Initializes repair time based precisely on vehicle damage severity
   */
  private startPitService(physics: VehiclePhysics): void {
    const dmg = physics.damage;

    // Minimum tire change & diagnostic base time = 3.0s
    const baseTime = 3.0;

    // Damage penalty based on chassis, engine and body crumple
    const healthDeficit = (100 - dmg.overallHealth) / 100;
    const engineDeficit = (100 - dmg.engineHealth) / 100;
    const bodyDeficit = dmg.frontCrumple;

    // Dynamic duration: 3.0s (pristine/tires only) up to 10.5s (heavy crash overhaul)
    const extraTime = (healthDeficit * 3.5) + (engineDeficit * 3.0) + (bodyDeficit * 1.5);
    this.totalPitTime = baseTime + extraTime;
    this.pitTimer = this.totalPitTime;

    this.phase = 'lifting';
    this.setLollipopState('stop', true);
  }

  private setLollipopState(state: 'stop' | 'go', isActive: boolean): void {
    const mat = this.lollipopSign.material as THREE.MeshStandardMaterial;
    if (!isActive) {
      mat.emissive.setHex(0x331111);
      mat.color.setHex(0x551111);
      this.lollipopLight.intensity = 0;
      return;
    }

    if (state === 'stop') {
      mat.color.setHex(0xef4444);
      mat.emissive.setHex(0xdc2626);
      mat.emissiveIntensity = 2.0;
      this.lollipopLight.color.setHex(0xef4444);
      this.lollipopLight.intensity = 3.0;
    } else {
      mat.color.setHex(0x10b981);
      mat.emissive.setHex(0x059669);
      mat.emissiveIntensity = 2.5;
      this.lollipopLight.color.setHex(0x10b981);
      this.lollipopLight.intensity = 4.0;
    }
  }
}
