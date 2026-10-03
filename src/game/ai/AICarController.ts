/**
 * AICarController.ts - Professional Multi-Car AI Racing Pilot with Real Rigid Body Physics
 * Controls autonomous F1 cars with dynamic racing lines, long-range predictive braking,
 * realistic Pacejka physics, structural damage simulation, multi-compound pit stop strategies,
 * 7-ray multibeam radar perception, active slipstream slingshot overtaking, and F1 driver personalities.
 */

import * as THREE from 'three';
import { CarModel } from '../models/CarModel';
import { TeamLiveryConfig, RaceDifficulty, DriverLeaderboardEntry } from '../career/CareerTypes';
import { TireCompoundType, TIRE_COMPOUNDS } from '../physics/TireCompound';
import { ParticleSystem } from '../particles/ParticleSystem';
import { DamageState, VehiclePhysics, CarInputs } from '../physics/VehiclePhysics';
import { AIRaycastPerception, VehicleObstacle } from './AIRaycastPerception';
import {
  SplinePoint,
  SHARED_CIRCUIT_WAYPOINTS,
  CIRCUIT_TOTAL_LENGTH,
  CIRCUIT_RACE_PACE_SPEED,
  formatF1TimeGap,
} from '../career/CircuitWaypoints';

export type { SplinePoint };

function getNearestAngle(currentAngle: number, targetAngle: number): number {
  let diff = (targetAngle - currentAngle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return currentAngle + diff;
}

export class AICarController {
  public team: TeamLiveryConfig;
  public carModel: CarModel;
  public difficulty: RaceDifficulty;

  // Real Vehicle Physics Engine for this AI Car
  public physics: VehiclePhysics;

  // Analytical 7-beam Radar Raycasting Sensor
  public radar = new AIRaycastPerception();

  // F1 Driver Personality & Racecraft Attributes
  public aggression: number = 0.85;
  public brakeSkill: number = 1.0;
  public trailBrakeAbility: number = 0.85;

  // Track position & metrics
  public distanceAlongTrack: number = 0; // 0 to TrackLength
  public trackProgressNormalized: number = 0; // 0.0 to 1.0 per lap
  public currentLap: number = 1;
  public currentSector: number = 0;
  public lateralOffset: number = 0; // Smooth offset from optimal racing line (-3.5 to +3.5)
  public targetLateralOffset: number = 0;

  // Starting Grid Anchor & Lane Discipline
  public gridStartX: number = -26.0;
  public gridStartZ: number = -132.0;
  public initialLaneOffset: number = 0;

  // Cached vector for external systems
  public position = new THREE.Vector3();

  // Starting Procedure & Reaction Time
  public hasReactedToLights: boolean = false;
  public reactionTimer: number = 0;

  // Autonomous Stuck Detection & Recovery State Machine
  public stuckTimer: number = 0;
  public recoveryPhase: 'none' | 'reverse' | 'turn_in' = 'none';
  public recoveryTimer: number = 0;

  // Active Overtaking & Slipstream
  public isOvertaking: boolean = false;
  public overtakeTimer: number = 0;
  public slipstreamActive: boolean = false;

  // Tire Compound & Degradation
  public currentCompound: TireCompoundType = 'medium';
  public nextPitCompound: TireCompoundType = 'hard';
  public compoundsUsed: Set<TireCompoundType> = new Set();
  public pitStopsCount: number = 0;

  // Pit Stop State & Garage Stall
  public isInPitLane: boolean = false;
  public isStationaryInBox: boolean = false;
  public hasServicedInBox: boolean = false;
  public pitProgress: number = 0;
  public pitTimer: number = 0;
  public readonly pitDuration: number = 5.0; // Calibrated pit service duration
  public plannedPitLaps: number[] = [];
  public hasPlannedStops: boolean = false;

  // Timing & Telemetry
  public currentLapTime: number = 0;
  public lastLapTime: number | null = null;
  public bestLapTime: number | null = null;
  public totalRaceTime: number = 0;
  public isFinished: boolean = false;
  public finishTime: number = 0;

  // Track geometry metrics
  public readonly totalTrackLength = 974.76;
  public waypoints: SplinePoint[] = [];
  private lastClosestIdx: number = 0;
  private static _obstaclesPool: VehicleObstacle[] = [];

  constructor(
    team: TeamLiveryConfig,
    difficulty: RaceDifficulty = 'medium',
    startingCompound: TireCompoundType = 'medium',
    totalRaceLaps: number = 20
  ) {
    this.team = team;
    this.difficulty = difficulty;
    this.currentCompound = startingCompound;
    this.compoundsUsed.add(startingCompound);
    this.carModel = new CarModel(team);
    this.carModel.setTireCompoundVisuals(startingCompound);

    // Initialize dedicated vehicle physics instance
    this.physics = new VehiclePhysics(-26.0, -132.0, Math.PI / 2);
    this.physics.setTireCompound(startingCompound);

    // Calibrate Authentic Driver Personalities & Racecraft Styles
    if (team.id === 'scuderia') {
      // Charles Leclerc: Aggressive, ultra-late braking, bold inside moves
      this.aggression = 0.92;
      this.brakeSkill = 1.08;
      this.trailBrakeAbility = 0.90;
    } else if (team.id === 'emerald') {
      // Fernando Alonso: Tactical master, cutbacks/switchbacks, fierce defense
      this.aggression = 0.95;
      this.brakeSkill = 1.10;
      this.trailBrakeAbility = 0.95;
    } else if (team.id === 'papaya') {
      // Lando Norris: Smooth high-speed cornering, calculated overtakes
      this.aggression = 0.84;
      this.brakeSkill = 1.02;
      this.trailBrakeAbility = 0.88;
    } else if (team.id === 'silver_arrow') {
      // George Russell: Strong slipstream drafting, solid lane holding
      this.aggression = 0.87;
      this.brakeSkill = 1.04;
      this.trailBrakeAbility = 0.86;
    } else {
      this.aggression = 0.82;
      this.brakeSkill = 1.00;
      this.trailBrakeAbility = 0.80;
    }

    this.waypoints = SHARED_CIRCUIT_WAYPOINTS;
    this.totalTrackLength = CIRCUIT_TOTAL_LENGTH;
    this.planPitStrategy(totalRaceLaps);
  }

  public get speedKmh(): number {
    return Math.abs(this.physics.speed) * 3.6;
  }

  public get speedMs(): number {
    return Math.abs(this.physics.speed);
  }

  public get yaw(): number {
    return this.physics.yaw;
  }

  public get damage(): DamageState {
    return this.physics.damage;
  }

  public get tireWear(): [number, number, number, number] {
    return this.physics.tireWear;
  }

  /**
   * Pre-generates the closed racing line waypoints for the square circuit with rounded corners
   * Calibrates realistic corner apex speeds to 98 km/h so centrifugal force does not exceed tire grip!
   */
  private buildTrackWaypoints(): void {
    const points: { x: number; z: number; speed: number }[] = [];
    const r = 38;
    const inner = 92;

    // 1. Main Straight (z = -130, x from -92 to +92)
    const numStraight = 22;
    for (let i = 0; i <= numStraight; i++) {
      const t = i / numStraight;
      const speed = t < 0.65 ? 335 : THREE.MathUtils.lerp(335, 140, (t - 0.65) / 0.35);
      points.push({ x: -inner + t * (2 * inner), z: -130, speed: Math.round(speed) });
    }

    // 2. Turn 1 (Top-Right): arc from (92, -130) to (130, -92) around center (92, -92)
    // Apex speed calibrated to 98 km/h (within physical 2.0G grip threshold)
    const numCorner = 16;
    for (let i = 1; i <= numCorner; i++) {
      const angle = -Math.PI / 2 + (i / numCorner) * (Math.PI / 2);
      const t = i / numCorner;
      const cornerSpeed = t <= 0.6 ? 98 : THREE.MathUtils.lerp(98, 140, (t - 0.6) / 0.4);
      points.push({
        x: inner + Math.cos(angle) * r,
        z: -inner + Math.sin(angle) * r,
        speed: Math.round(cornerSpeed),
      });
    }

    // 3. Straight 1 (Right edge): x = 130, z from -92 to +92
    for (let i = 1; i <= numStraight; i++) {
      const t = i / numStraight;
      const speed = t < 0.65 ? 330 : THREE.MathUtils.lerp(330, 140, (t - 0.65) / 0.35);
      points.push({ x: 130, z: -inner + t * (2 * inner), speed: Math.round(speed) });
    }

    // 4. Turn 2 (Bottom-Right): arc from (130, 92) to (92, 130) around center (92, 92)
    for (let i = 1; i <= numCorner; i++) {
      const angle = 0 + (i / numCorner) * (Math.PI / 2);
      const t = i / numCorner;
      const cornerSpeed = t <= 0.6 ? 98 : THREE.MathUtils.lerp(98, 140, (t - 0.6) / 0.4);
      points.push({
        x: inner + Math.cos(angle) * r,
        z: inner + Math.sin(angle) * r,
        speed: Math.round(cornerSpeed),
      });
    }

    // 5. Straight 2 (Bottom edge): z = 130, x from +92 to -92
    for (let i = 1; i <= numStraight; i++) {
      const t = i / numStraight;
      const speed = t < 0.65 ? 330 : THREE.MathUtils.lerp(330, 140, (t - 0.65) / 0.35);
      points.push({ x: inner - t * (2 * inner), z: 130, speed: Math.round(speed) });
    }

    // 6. Turn 3 (Bottom-Left): arc from (-92, 130) to (-130, 92) around center (-92, 92)
    for (let i = 1; i <= numCorner; i++) {
      const angle = Math.PI / 2 + (i / numCorner) * (Math.PI / 2);
      const t = i / numCorner;
      const cornerSpeed = t <= 0.6 ? 98 : THREE.MathUtils.lerp(98, 140, (t - 0.6) / 0.4);
      points.push({
        x: -inner + Math.cos(angle) * r,
        z: inner + Math.sin(angle) * r,
        speed: Math.round(cornerSpeed),
      });
    }

    // 7. Straight 3 (Left edge): x = -130, z from +92 to -92
    for (let i = 1; i <= numStraight; i++) {
      const t = i / numStraight;
      const speed = t < 0.65 ? 335 : THREE.MathUtils.lerp(335, 140, (t - 0.65) / 0.35);
      points.push({ x: -130, z: inner - t * (2 * inner), speed: Math.round(speed) });
    }

    // 8. Turn 4 (Top-Left): arc from (-130, -92) to (-92, -130) around center (-92, -92)
    for (let i = 1; i < numCorner; i++) {
      const angle = Math.PI + (i / numCorner) * (Math.PI / 2);
      const t = i / numCorner;
      const cornerSpeed = t <= 0.6 ? 98 : THREE.MathUtils.lerp(98, 140, (t - 0.6) / 0.4);
      points.push({
        x: -inner + Math.cos(angle) * r,
        z: -inner + Math.sin(angle) * r,
        speed: Math.round(cornerSpeed),
      });
    }

    // Compute tangents & yaw
    this.waypoints = points.map((pt, idx, arr) => {
      const next = arr[(idx + 1) % arr.length];
      const dx = next.x - pt.x;
      const dz = next.z - pt.z;
      const yaw = Math.atan2(dx, dz);
      return {
        x: pt.x,
        z: pt.z,
        speedLimitKmh: pt.speed,
        yaw: yaw,
      };
    });
  }

  /**
   * Plans realistic AI pit stop strategy based on race length and compound rules
   */
  public planPitStrategy(totalLaps: number): void {
    this.hasPlannedStops = true;
    if (totalLaps === 9) {
      if (this.currentCompound === 'soft') {
        this.plannedPitLaps = [4];
        this.nextPitCompound = 'medium';
      } else {
        this.plannedPitLaps = [];
      }
    } else if (totalLaps === 20) {
      const pitLap = 8 + Math.floor(Math.random() * 4);
      this.plannedPitLaps = [pitLap];
      if (this.currentCompound === 'soft') {
        this.nextPitCompound = 'medium';
      } else if (this.currentCompound === 'medium') {
        this.nextPitCompound = 'hard';
      } else {
        this.nextPitCompound = 'soft';
      }
    } else {
      this.plannedPitLaps = [16, 33];
      this.nextPitCompound = this.currentCompound === 'soft' ? 'medium' : 'hard';
    }
  }

  /**
   * Sets vehicle cleanly on its designated F1 Starting Grid slot (1 to 5)
   */
  public setGridPosition(gridSlot: number): void {
    const isLeft = gridSlot % 2 === 1;
    const gridX = -18.0 - (gridSlot - 1) * 8.0;
    const gridZ = isLeft ? -128.0 : -132.0;
    const gridYaw = Math.PI / 2; // Facing positive X down the main straight

    this.physics.reset(gridX, gridZ, gridYaw);
    this.gridStartX = gridX;
    this.gridStartZ = gridZ;
    this.initialLaneOffset = isLeft ? 2.0 : -2.0;
    this.lateralOffset = this.initialLaneOffset;
    this.targetLateralOffset = this.initialLaneOffset;

    this.position.set(gridX, 0.35, gridZ);
    this.carModel.group.position.copy(this.position);
    this.carModel.group.rotation.set(0, gridYaw, 0);

    const startProgressX = gridX - (-92.0);
    this.distanceAlongTrack = Math.max(0, startProgressX);
    this.trackProgressNormalized = this.distanceAlongTrack / this.totalTrackLength;

    const reactionBase = {
      easy: 0.32,
      medium: 0.24,
      hard: 0.16,
    }[this.difficulty];
    this.reactionTimer = reactionBase + (Math.random() * 0.10);
    this.hasReactedToLights = false;
    this.stuckTimer = 0;
    this.recoveryPhase = 'none';
    this.isInPitLane = false;
    this.isStationaryInBox = false;
    this.hasServicedInBox = false;
    this.isOvertaking = false;
    this.overtakeTimer = 0;
  }

  /**
   * Called when starting lights go out
   */
  public onLightsOut(): void {
    this.hasReactedToLights = false;
  }

  /**
   * Main AI Update Loop: Autonomous Driver AI with Multibeam Raycasting, Trail Braking, and Overtaking
   */
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerSpeedKmh: number,
    otherAiCars: AICarController[],
    particles: ParticleSystem,
    isRaceActive: boolean,
    isControlsLocked: boolean = false
  ): void {
    // 1. Grid Locked State (Revving in place during 5 Red Lights sequence)
    if (!isRaceActive || isControlsLocked) {
      this.physics.speed = 0;
      this.physics.lateralSpeed = 0;
      this.physics.angularVelocity = 0;
      this.physics.position.x = this.gridStartX;
      this.physics.position.y = 0.35;
      this.physics.position.z = this.gridStartZ;
      this.physics.yaw = Math.PI / 2;
      this.physics.gear = 1;

      this.physics.update(dt, {
        throttle: 0.5 + Math.sin(performance.now() * 0.006) * 0.2, // revving engine
        brake: 1.0,
        steering: 0,
        handbrake: true,
      });

      // Rigid anchor to grid box
      this.physics.position.x = this.gridStartX;
      this.physics.position.y = 0.35;
      this.physics.position.z = this.gridStartZ;
      this.physics.speed = 0;
      this.physics.lateralSpeed = 0;
      this.physics.angularVelocity = 0;
      this.physics.yaw = Math.PI / 2;
      this.physics.gear = 1;

      this.position.set(this.gridStartX, 0.35, this.gridStartZ);
      this.carModel.group.position.copy(this.position);
      this.carModel.group.rotation.set(0, Math.PI / 2, 0);
      this.carModel.update(
        0,
        this.physics.wheelRotations,
        1.0,
        0,
        this.physics.damage,
        false,
        this.physics.rpm
      );
      return;
    }

    // Reaction delay after lights out before launching
    if (!this.hasReactedToLights) {
      this.reactionTimer -= dt;
      if (this.reactionTimer <= 0) {
        this.hasReactedToLights = true;
      } else {
        this.physics.speed = 0;
        this.physics.lateralSpeed = 0;
        this.physics.position.x = this.gridStartX;
        this.physics.position.y = 0.35;
        this.physics.position.z = this.gridStartZ;
        this.physics.yaw = Math.PI / 2;
        this.physics.gear = 1;

        this.physics.update(dt, { throttle: 0.8, brake: 1.0, steering: 0, handbrake: true });

        this.physics.position.x = this.gridStartX;
        this.physics.position.y = 0.35;
        this.physics.position.z = this.gridStartZ;
        this.physics.speed = 0;
        this.physics.lateralSpeed = 0;
        this.physics.gear = 1;

        this.position.set(this.gridStartX, 0.35, this.gridStartZ);
        this.carModel.group.position.copy(this.position);
        this.carModel.group.rotation.set(0, Math.PI / 2, 0);
        this.carModel.update(0, this.physics.wheelRotations, 1.0, 0, this.physics.damage, false, this.physics.rpm);
        return;
      }
    }

    // 2. Autonomous Collision Recovery State Machine (Reversing & Turn-in)
    if (this.recoveryPhase !== 'none') {
      if (this.recoveryPhase === 'reverse') {
        this.recoveryTimer -= dt;
        this.physics.speed = -4.5;
        this.physics.gear = -1;
        this.physics.update(dt, {
          throttle: 0,
          brake: 0.85,
          steering: -Math.sign(this.physics.steerAngle || 1) * 0.85,
          handbrake: false,
        });

        if (this.recoveryTimer <= 0) {
          this.recoveryPhase = 'turn_in';
          this.recoveryTimer = 0.9;
          this.physics.gear = 1;
          this.physics.speed = 1.0;
        }
      } else if (this.recoveryPhase === 'turn_in') {
        this.recoveryTimer -= dt;
        this.physics.gear = 1;
        this.physics.update(dt, {
          throttle: 0.55,
          brake: 0,
          steering: Math.sign(this.physics.steerAngle || 1) * 0.70,
          handbrake: false,
        });

        if (this.recoveryTimer <= 0 || this.speedKmh > 18.0) {
          this.recoveryPhase = 'none';
          this.stuckTimer = 0;
        }
      }

      this.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);
      this.carModel.group.position.copy(this.position);
      this.carModel.group.rotation.set(0, this.physics.yaw, this.physics.roll);
      this.carModel.update(
        this.physics.visualSteerAngle,
        this.physics.wheelRotations,
        0,
        this.speedKmh,
        this.physics.damage,
        this.physics.isShifting,
        this.physics.rpm
      );
      return;
    }

    // 3. Pit Lane Trajectory & Timed Stop
    if (this.isInPitLane) {
      this.updatePitLane(dt, particles);
      return;
    }

    const myX = this.physics.position.x;
    const myZ = this.physics.position.z;
    const mySpeed = Math.abs(this.physics.speed);
    const mySpeedKmh = mySpeed * 3.6;

    // Check pit triggers: Critical Damage, Puncture, High Wear, or Planned Strategy
    const hasCriticalDamage =
      this.physics.damage.wingLoose ||
      this.physics.damage.frontCrumple > 0.28 ||
      this.physics.damage.rearCrumple > 0.32 ||
      this.physics.damage.engineHealth < 78 ||
      this.physics.isPunctured.some((p) => p) ||
      this.physics.damage.overallHealth < 75;

    const needsPit =
      hasCriticalDamage ||
      this.plannedPitLaps.includes(this.currentLap) ||
      (this.physics.tireWear[0] > 78 && this.pitStopsCount < 2);

    // Pit entry corridor detection on the main straight (x from -75 to -35, z < -114)
    if (needsPit && !this.isInPitLane) {
      if (myX > -72 && myX < -36 && myZ > -126 && myZ < -110) {
        this.isInPitLane = true;
        this.isStationaryInBox = false;
        this.hasServicedInBox = false;
        this.pitTimer = 0;
        this.physics.position.z = -119.3;
        this.plannedPitLaps = this.plannedPitLaps.filter((l) => l !== this.currentLap);
      } else if (myX > -90 && myX <= -72 && myZ < -118) {
        this.targetLateralOffset = 3.2;
      }
    }

    // 4. Autonomous Pilot Navigation (Pure Pursuit Waypoint Tracker with Localized Window Search)
    const numPts = this.waypoints.length;
    let closestIdx = this.lastClosestIdx;
    let closestDistSq = Infinity;

    // Check 18 points ahead and 4 behind current position (O(1) localized search)
    for (let offset = -4; offset <= 18; offset++) {
      const idx = (this.lastClosestIdx + offset + numPts) % numPts;
      const pt = this.waypoints[idx];
      const dx = pt.x - myX;
      const dz = pt.z - myZ;
      const dsq = dx * dx + dz * dz;
      if (dsq < closestDistSq) {
        closestDistSq = dsq;
        closestIdx = idx;
      }
    }

    // Safety fallback: if car was reset far away from last waypoint, run full loop
    if (closestDistSq > 1600) {
      for (let i = 0; i < numPts; i++) {
        const pt = this.waypoints[i];
        const dx = pt.x - myX;
        const dz = pt.z - myZ;
        const dsq = dx * dx + dz * dz;
        if (dsq < closestDistSq) {
          closestDistSq = dsq;
          closestIdx = i;
        }
      }
    }
    this.lastClosestIdx = closestIdx;

    // Calibrated Lookahead Distance: 12m at low speed, scales smoothly up to 28m at top speed
    const lookaheadDist = THREE.MathUtils.clamp(12.0 + mySpeed * 0.22, 12.0, 28.0);
    let accumulatedDist = 0;
    let targetIdx = closestIdx;

    while (accumulatedDist < lookaheadDist) {
      const nextIdx = (targetIdx + 1) % numPts;
      const p1 = this.waypoints[targetIdx];
      const p2 = this.waypoints[nextIdx];
      const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      accumulatedDist += segLen;
      targetIdx = nextIdx;
    }

    const targetPt = this.waypoints[targetIdx];

    // Compute tangent & normal at target waypoint for lateral offset
    const nextPt = this.waypoints[(targetIdx + 1) % numPts];
    const tDx = nextPt.x - targetPt.x;
    const tDz = nextPt.z - targetPt.z;
    const tLen = Math.hypot(tDx, tDz) || 1;
    const normX = -tDz / tLen;
    const normZ = tDx / tLen;

    // 5. Multibeam Radar Raycasting Perception & Tactical Overtaking (Zero GC Allocation)
    const isStartingStraight = this.currentLap === 1 && myX < 65 && myZ < -115;
    const baseOffset = isStartingStraight ? this.initialLaneOffset : 0;

    // Reuse persistent static obstacles pool
    const obstacles = AICarController._obstaclesPool;
    obstacles.length = 0;
    obstacles.push({
      id: 'player',
      x: playerPos.x,
      z: playerPos.z,
      yaw: this.physics.yaw,
      speedMs: playerSpeedKmh / 3.6,
      length: 4.8,
      width: 2.0,
    });

    for (let o = 0; o < otherAiCars.length; o++) {
      const other = otherAiCars[o];
      if (other === this) continue;
      obstacles.push({
        id: other.team.id,
        x: other.physics.position.x,
        z: other.physics.position.z,
        yaw: other.physics.yaw,
        speedMs: other.physics.speed,
        length: 4.8,
        width: 2.0,
      });
    }

    // Tarmac width available to the left and right of current lateral offset
    const halfTrackWidth = 7.6;
    const availLeft = Math.max(1.2, halfTrackWidth + this.lateralOffset);
    const availRight = Math.max(1.2, halfTrackWidth - this.lateralOffset);

    // Cast 7-beam radar array against all track entities
    const radar = this.radar.castRays(myX, myZ, this.physics.yaw, mySpeed, obstacles, availLeft, availRight);

    // Evaluate tactical overtaking opportunity
    const isApproachingCorner = targetPt.speedLimitKmh < 160;
    const overtakeDecision = this.radar.evaluateOvertake(this.lateralOffset, this.aggression, isApproachingCorner);

    if (overtakeDecision.shouldOvertake) {
      this.targetLateralOffset = overtakeDecision.targetOffset;
      this.isOvertaking = true;
      this.overtakeTimer = 1.6;
    } else if (this.overtakeTimer > 0) {
      this.overtakeTimer -= dt;
      if (this.overtakeTimer <= 0) {
        this.isOvertaking = false;
        this.targetLateralOffset = baseOffset;
      }
    } else {
      this.targetLateralOffset = baseOffset;
    }

    // Smooth critically-damped lateral movement
    const lateralShiftSpeed = overtakeDecision.isSideBySide ? 4.5 : (3.5 * this.aggression);
    this.lateralOffset += (this.targetLateralOffset - this.lateralOffset) * Math.min(1.0, lateralShiftSpeed * dt);

    // Final target destination point
    const destX = targetPt.x + normX * this.lateralOffset;
    const destZ = targetPt.z + normZ * this.lateralOffset;

    // 6. Steering Controller (PD Heading Tracker)
    const targetAngle = Math.atan2(destX - myX, destZ - myZ);
    let angleDiff = targetAngle - this.physics.yaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steerP = 2.6;
    const steerD = 0.20;
    const steeringInput = THREE.MathUtils.clamp(
      angleDiff * steerP - this.physics.angularVelocity * steerD,
      -1.0,
      1.0
    );

    // 7. Physics-based Long-Range Predictive Braking System
    const diffSpeedScale = {
      easy: 0.86,
      medium: 0.94,
      hard: 0.99,
    }[this.difficulty];

    const compoundConfig = TIRE_COMPOUNDS[this.currentCompound] || TIRE_COMPOUNDS.soft;
    const wearP = Math.min(0.40, (this.physics.tireWear[0] / 100) * 0.40);
    const gripFactor = compoundConfig.gripMultiplier * (1.0 - wearP);
    const engineHealthFactor = Math.pow(Math.max(0.1, this.physics.damage.engineHealth / 100), 0.35);

    // Slipstream (Rebufo): Detected by Forward Center Ray (0 deg) within 32m
    this.slipstreamActive = false;
    let slipstreamBonus = 1.0;
    if (radar.center.hit && radar.center.distance < 32.0 && mySpeed > 26.0 && !overtakeDecision.isSideBySide) {
      this.slipstreamActive = true;
      const towEfficiency = 1.0 - (radar.center.distance / 32.0);
      slipstreamBonus = 1.0 + towEfficiency * 0.15; // Up to +15% top speed in the tow!
    }

    // Dynamic braking deceleration capacity
    let brakeDecel = 13.5 * gripFactor * this.brakeSkill;
    if (overtakeDecision.canDivebomb) {
      // Driver executes late-braking dive down the inside!
      brakeDecel *= 1.14;
    }

    let minAllowedSpeedMs = (targetPt.speedLimitKmh / 3.6) * diffSpeedScale * gripFactor * engineHealthFactor * slipstreamBonus;

    // Scan ahead up to 220 meters along the track for all upcoming corner speed limits
    let scanDist = 0;
    let scanIdx = targetIdx;
    for (let s = 1; s <= 30; s++) {
      const nextScanIdx = (scanIdx + 1) % numPts;
      const sp1 = this.waypoints[scanIdx];
      const sp2 = this.waypoints[nextScanIdx];
      const stepLen = Math.hypot(sp2.x - sp1.x, sp2.z - sp1.z);
      scanDist += stepLen;
      scanIdx = nextScanIdx;

      if (scanDist > 220.0) break;

      const futureTargetMs = (sp2.speedLimitKmh / 3.6) * diffSpeedScale * gripFactor * engineHealthFactor;
      // Physics kinematic formula: v_allowed = sqrt(v_future^2 + 2 * a * distance)
      const allowedSpeedMs = Math.sqrt(futureTargetMs * futureTargetMs + 2.0 * brakeDecel * scanDist);
      if (allowedSpeedMs < minAllowedSpeedMs) {
        minAllowedSpeedMs = allowedSpeedMs;
      }
    }

    const targetSpeedMs = minAllowedSpeedMs;

    let throttleInput = 0;
    let brakeInput = 0;

    // Apply speed control with threshold braking
    if (mySpeed > targetSpeedMs) {
      const excessSpeed = mySpeed - targetSpeedMs;
      throttleInput = 0.0;
      brakeInput = THREE.MathUtils.clamp(excessSpeed / 3.0, 0.45, 1.0);
    } else {
      const deficit = targetSpeedMs - mySpeed;
      throttleInput = THREE.MathUtils.clamp(deficit / 4.0, 0.2, 1.0);
      brakeInput = 0.0;
    }

    // 8. Overtaking vs Trailing Traffic Resolution via Raycasting
    if (overtakeDecision.isSideBySide) {
      // Parallel wheel-to-wheel battle: NEVER CUT THROTTLE! 100% full throttle to complete pass!
      throttleInput = 1.0;
      brakeInput = 0.0;
    } else if (radar.center.hit && radar.center.distance < 14.0) {
      // Direct obstruction in same lane ahead
      const closingSpeed = radar.center.relativeSpeed;
      if (closingSpeed > 0.6 || radar.center.distance < 6.5) {
        throttleInput = 0.0;
        const packBrake = THREE.MathUtils.clamp((closingSpeed + 1.8) / 3.8, 0.40, 1.0);
        brakeInput = Math.max(brakeInput, packBrake);
      } else {
        throttleInput = Math.min(throttleInput, 0.45);
      }
    }

    // 9. Authentic Formula 1 Trail Braking:
    // Bleed off peak hydraulic brake pressure progressively as steering lock increases towards apex!
    if (brakeInput > 0.05) {
      const steerLockRatio = THREE.MathUtils.clamp(Math.abs(steeringInput), 0, 1);
      const trailMultiplier = 1.0 - (0.42 * this.trailBrakeAbility * steerLockRatio);
      brakeInput *= THREE.MathUtils.clamp(trailMultiplier, 0.45, 1.0);
    }

    if (this.isFinished) {
      throttleInput = 0;
      brakeInput = 0.6;
    }

    // 10. Stuck / Collision Detection & Autonomous Recovery Trigger
    if (isRaceActive && !isControlsLocked && !this.isInPitLane) {
      if (this.speedKmh < 3.5 && throttleInput > 0.35) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 1.2) {
          this.recoveryPhase = 'reverse';
          this.recoveryTimer = 1.6;
        }
      } else {
        this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2.0);
      }
    }

    // 11. Step Real Physics Engine for this AI Car
    const inputs: CarInputs = {
      throttle: throttleInput,
      brake: brakeInput,
      steering: steeringInput,
      handbrake: false,
    };
    this.physics.update(dt, inputs);

    // Synchronize coordinates
    this.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);
    this.carModel.group.position.copy(this.position);
    this.carModel.group.rotation.set(0, this.physics.yaw, this.physics.roll);

    // Update 3D car visuals with authentic damage, steer angle, and wheel rotations
    this.carModel.update(
      this.physics.visualSteerAngle,
      this.physics.wheelRotations,
      brakeInput,
      mySpeedKmh,
      this.physics.damage,
      this.physics.isShifting,
      this.physics.rpm
    );

    // 12. Distance Along Track & Lap Timing
    const prevSector = this.currentSector;
    if (this.currentSector === 0 && myX > 40 && myZ < -50) this.currentSector = 1;
    else if (this.currentSector === 1 && myX > 50 && myZ > 40) this.currentSector = 2;
    else if (this.currentSector === 2 && myX < -40 && myZ > 50) this.currentSector = 3;
    else if (this.currentSector === 3 && myX < -50 && myZ < -40) this.currentSector = 4;
    else if (this.currentSector === 4 && myZ < -115 && myX >= -20 && myX <= 20) {
      this.lastLapTime = this.currentLapTime;
      if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.currentLap++;
      this.currentLapTime = 0;
      this.currentSector = 0;
    }

    this.currentLapTime += dt;
    this.totalRaceTime += dt;

    this.distanceAlongTrack = (closestIdx / numPts) * this.totalTrackLength;
    this.trackProgressNormalized = this.distanceAlongTrack / this.totalTrackLength;
  }

  /**
   * Dedicated Pit Lane Trajectory & Timed Mechanical Pit Stop Service
   * Moves along Fast Lane at Z = -119.0, peels off into team's dedicated pit box at Z = -110.5,
   * services vehicle with pit crew, and merges back into Fast Lane towards exit.
   */
  private updatePitLane(dt: number, particles: ParticleSystem): void {
    const stallX = this.team.pitStallX;
    const fastLaneZ = -119.0;
    const pitBoxZ = -110.5;
    const pitSpeedMs = 60.0 / 3.6; // 60 km/h pit speed limiter
    const peelOffStartX = stallX - 12.0;

    if (!this.isStationaryInBox) {
      if (!this.hasServicedInBox) {
        // Phase 1: Fast Lane Cruise and Smooth S-Curve Peel-off
        this.physics.speed = pitSpeedMs;
        this.physics.position.x += this.physics.speed * dt;

        if (this.physics.position.x < peelOffStartX) {
          // Stay locked in Fast Lane
          this.physics.position.z = THREE.MathUtils.damp(this.physics.position.z, fastLaneZ, 5.0, dt);
          const targetYaw = getNearestAngle(this.physics.yaw, Math.PI / 2);
          this.physics.yaw += (targetYaw - this.physics.yaw) * Math.min(1.0, 6.0 * dt);
        } else {
          // Smooth Hermite S-Curve Peel-off into dedicated pit box
          const progress = Math.max(0, Math.min(1.0, (this.physics.position.x - peelOffStartX) / 12.0));
          const smoothS = progress * progress * (3 - 2 * progress);
          this.physics.position.z = THREE.MathUtils.lerp(fastLaneZ, pitBoxZ, smoothS);

          const steerOffset = Math.sin(progress * Math.PI) * 0.20;
          const targetYaw = getNearestAngle(this.physics.yaw, (Math.PI / 2) - steerOffset);
          this.physics.yaw += (targetYaw - this.physics.yaw) * Math.min(1.0, 7.0 * dt);
        }

        // Check if arrived at team's specific pit box
        if (Math.abs(this.physics.position.x - stallX) < 1.2) {
          this.physics.position.x = stallX;
          this.physics.position.z = pitBoxZ;
          this.physics.yaw = getNearestAngle(this.physics.yaw, Math.PI / 2);
          this.physics.speed = 0;
          this.isStationaryInBox = true;
          this.pitTimer = 0;
        }
      } else {
        // Phase 2: Post-service launch and S-curve merge back into Fast Lane
        this.physics.speed = pitSpeedMs;
        this.physics.position.x += this.physics.speed * dt;

        const mergeEndX = stallX + 12.0;
        if (this.physics.position.x < mergeEndX) {
          const exitProg = Math.max(0, Math.min(1.0, (this.physics.position.x - stallX) / 12.0));
          const smoothExit = exitProg * exitProg * (3 - 2 * exitProg);
          this.physics.position.z = THREE.MathUtils.lerp(pitBoxZ, fastLaneZ, smoothExit);

          const steerExitYaw = getNearestAngle(this.physics.yaw, (Math.PI / 2) + Math.sin(exitProg * Math.PI) * 0.16);
          this.physics.yaw += (steerExitYaw - this.physics.yaw) * Math.min(1.0, 7.0 * dt);
        } else {
          this.physics.position.z = THREE.MathUtils.damp(this.physics.position.z, fastLaneZ, 5.0, dt);
          const targetYaw = getNearestAngle(this.physics.yaw, Math.PI / 2);
          this.physics.yaw += (targetYaw - this.physics.yaw) * Math.min(1.0, 6.0 * dt);
        }

        // Pit exit transition back onto the main straight
        if (this.physics.position.x > 38.0) {
          this.physics.position.z += (-125.0 - this.physics.position.z) * Math.min(1.0, 3.5 * dt);
        }

        if (this.physics.position.x >= 46.0) {
          // Rejoin main track smoothly
          this.isInPitLane = false;
          this.hasServicedInBox = false;
          this.physics.speed = 90.0 / 3.6;
          particles.emitTireSmoke(this.position.clone().add(new THREE.Vector3(0, 0.1, 0)), 8, 0.95);
        }
      }
    } else {
      // Stationary in box getting serviced by pit crew
      this.physics.speed = 0;
      this.physics.position.x = stallX;
      this.physics.position.z = pitBoxZ;
      this.physics.yaw = getNearestAngle(this.physics.yaw, Math.PI / 2);
      this.pitTimer += dt;
      this.pitProgress = Math.min(1.0, this.pitTimer / this.pitDuration);

      // Midway through stop: Full vehicle repair (bodywork, wings, engine, tires)
      if (this.pitTimer >= this.pitDuration * 0.5 && !this.hasServicedInBox) {
        // Switch to next optimal tire compound
        if (this.currentCompound !== this.nextPitCompound) {
          this.currentCompound = this.nextPitCompound;
        } else {
          this.currentCompound = this.currentCompound === 'soft' ? 'medium' : 'soft';
        }
        this.compoundsUsed.add(this.currentCompound);
        this.carModel.setTireCompoundVisuals(this.currentCompound);
        this.physics.setTireCompound(this.currentCompound);
        this.physics.repairFull();
      }

      if (this.pitTimer >= this.pitDuration) {
        // Released from box by lollipop!
        this.isStationaryInBox = false;
        this.hasServicedInBox = true;
        this.pitStopsCount++;
      }
    }

    this.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);
    this.carModel.group.position.copy(this.position);
    this.carModel.group.rotation.set(0, this.physics.yaw, this.physics.roll);
  }

  /**
   * Exports live data for F1 leaderboard
   */
  public getLeaderboardData(position: number, leaderScore: number): DriverLeaderboardEntry {
    const avgWear = (this.physics.tireWear[0] + this.physics.tireWear[1] + this.physics.tireWear[2] + this.physics.tireWear[3]) / 4;
    const myScore = (this.currentLap - 1) * this.totalTrackLength + this.distanceAlongTrack;
    const scoreDelta = Math.max(0, leaderScore - myScore);
    const gapSeconds = scoreDelta / CIRCUIT_RACE_PACE_SPEED;
    const lapsBehind = Math.floor(scoreDelta / this.totalTrackLength);

    const gapFormatted = position === 1 ? 'LÍDER' : lapsBehind >= 1 ? `+${lapsBehind} ${lapsBehind === 1 ? 'VTA' : 'VTAS'}` : formatF1TimeGap(gapSeconds);

    return {
      id: this.team.id,
      position,
      driverCode: this.team.driverCode,
      driverName: this.team.driverName,
      driverNumber: this.team.driverNumber,
      teamName: this.team.teamName,
      teamColorCss: this.team.teamColorCss,
      currentLap: this.currentLap,
      currentSector: this.currentSector,
      currentCompound: this.currentCompound,
      compoundsUsed: Array.from(this.compoundsUsed),
      hasSatisfiedTireRule: this.compoundsUsed.size >= 2,
      tireWearAvg: avgWear,
      pitStopsCount: this.pitStopsCount,
      isInPit: this.isInPitLane,
      gapToLeaderFormatted: gapFormatted,
      gapToAheadFormatted: position === 1 ? '-' : formatF1TimeGap(gapSeconds * 0.5),
      lastLapTime: this.lastLapTime,
      bestLapTime: this.bestLapTime,
      currentLapTime: this.currentLapTime,
      totalRaceTime: this.totalRaceTime,
      isPlayer: false,
      isFinished: this.isFinished,
      hasPenalty: false,
      penaltySeconds: 0,
    };
  }
}
