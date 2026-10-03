/**
 * AIRaycastPerception.ts - High-Performance Analytical Multibeam Radar Perception for Autonomous Racing AI
 * Provides continuous 7-ray spatial awareness, gap seeking, wheel-to-wheel proximity buffers,
 * and track boundary clearance with zero WebGL draw calls and zero garbage collection overhead.
 */

import * as THREE from 'three';

export interface RayHit {
  hit: boolean;
  distance: number;
  entityId: string | null;
  relativeSpeed: number; // Positive if we are closing in, negative if pulling away
  lateralOffset: number; // Lateral offset of the hit obstacle relative to our centerline
}

export interface RaycastSensorArray {
  center: RayHit;       // 0° (Range 48m): Long-range forward slipstream & obstacle tracker
  attackLeft: RayHit;   // -14° (Range 32m): Forward-left gap search
  attackRight: RayHit;  // +14° (Range 32m): Forward-right gap search
  flankLeft: RayHit;    // -35° (Range 20m): Corner entry & quarter-panel detection
  flankRight: RayHit;   // +35° (Range 20m): Corner entry & quarter-panel detection
  sideLeft: RayHit;     // -90° (Range 6m): Wheel-to-wheel door clearance
  sideRight: RayHit;    // +90° (Range 6m): Wheel-to-wheel door clearance
  trackWidthLeft: number;  // Available tarmac meters to left track curb
  trackWidthRight: number; // Available tarmac meters to right track curb
}

export interface VehicleObstacle {
  id: string;
  x: number;
  z: number;
  yaw: number;
  speedMs: number;
  length: number;
  width: number;
}

export interface OvertakeOpportunity {
  shouldOvertake: boolean;
  recommendedLane: 'inside' | 'outside' | 'hold';
  targetOffset: number;
  isSideBySide: boolean;
  canDivebomb: boolean;
  urgency: number; // 0.0 to 1.0
}

export class AIRaycastPerception {
  // Ray definitions: [angleOffsetRadians, maxRangeMeters]
  private static readonly SENSOR_ANGLES = {
    center: { angle: 0, range: 48.0 },
    attackLeft: { angle: -0.244, range: 32.0 },  // ~ -14 deg
    attackRight: { angle: 0.244, range: 32.0 },   // ~ +14 deg
    flankLeft: { angle: -0.610, range: 20.0 },    // ~ -35 deg
    flankRight: { angle: 0.610, range: 20.0 },    // ~ +35 deg
    sideLeft: { angle: -Math.PI / 2, range: 6.5 },
    sideRight: { angle: Math.PI / 2, range: 6.5 },
  };

  public sensors: RaycastSensorArray = {
    center: { hit: false, distance: 48.0, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    attackLeft: { hit: false, distance: 32.0, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    attackRight: { hit: false, distance: 32.0, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    flankLeft: { hit: false, distance: 20.0, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    flankRight: { hit: false, distance: 20.0, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    sideLeft: { hit: false, distance: 6.5, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    sideRight: { hit: false, distance: 6.5, entityId: null, relativeSpeed: 0, lateralOffset: 0 },
    trackWidthLeft: 7.5,
    trackWidthRight: 7.5,
  };

  /**
   * Casts all 7 analytical radar rays against all other vehicles on track
   */
  public castRays(
    originX: number,
    originZ: number,
    yaw: number,
    mySpeedMs: number,
    obstacles: VehicleObstacle[],
    trackCenterlineDistFromLeft: number = 7.5,
    trackCenterlineDistFromRight: number = 7.5
  ): RaycastSensorArray {
    this.sensors.trackWidthLeft = trackCenterlineDistFromLeft;
    this.sensors.trackWidthRight = trackCenterlineDistFromRight;

    // Reset all rays
    const defs = AIRaycastPerception.SENSOR_ANGLES;
    this.resetRay(this.sensors.center, defs.center.range);
    this.resetRay(this.sensors.attackLeft, defs.attackLeft.range);
    this.resetRay(this.sensors.attackRight, defs.attackRight.range);
    this.resetRay(this.sensors.flankLeft, defs.flankLeft.range);
    this.resetRay(this.sensors.flankRight, defs.flankRight.range);
    this.resetRay(this.sensors.sideLeft, defs.sideLeft.range);
    this.resetRay(this.sensors.sideRight, defs.sideRight.range);

    // Front bumper origin
    const frontAxleDist = 1.35;
    const startX = originX + Math.sin(yaw) * frontAxleDist;
    const startZ = originZ + Math.cos(yaw) * frontAxleDist;

    // Evaluate each sensor ray
    this.evaluateRay(this.sensors.center, startX, startZ, yaw + defs.center.angle, defs.center.range, mySpeedMs, obstacles);
    this.evaluateRay(this.sensors.attackLeft, startX, startZ, yaw + defs.attackLeft.angle, defs.attackLeft.range, mySpeedMs, obstacles);
    this.evaluateRay(this.sensors.attackRight, startX, startZ, yaw + defs.attackRight.angle, defs.attackRight.range, mySpeedMs, obstacles);
    this.evaluateRay(this.sensors.flankLeft, startX, startZ, yaw + defs.flankLeft.angle, defs.flankLeft.range, mySpeedMs, obstacles);
    this.evaluateRay(this.sensors.flankRight, startX, startZ, yaw + defs.flankRight.angle, defs.flankRight.range, mySpeedMs, obstacles);

    // Side rays start from the cockpit / mid-chassis
    this.evaluateRay(this.sensors.sideLeft, originX, originZ, yaw + defs.sideLeft.angle, defs.sideLeft.range, mySpeedMs, obstacles);
    this.evaluateRay(this.sensors.sideRight, originX, originZ, yaw + defs.sideRight.angle, defs.sideRight.range, mySpeedMs, obstacles);

    return this.sensors;
  }

  private resetRay(ray: RayHit, defaultDist: number): void {
    ray.hit = false;
    ray.distance = defaultDist;
    ray.entityId = null;
    ray.relativeSpeed = 0;
    ray.lateralOffset = 0;
  }

  /**
   * Analytical 2D Ray vs Dual-Sphere Bounding Volume intersection
   * Fast, branch-predicted, and exact for F1 car dimensions
   */
  private evaluateRay(
    ray: RayHit,
    rayStartX: number,
    rayStartZ: number,
    rayAngle: number,
    maxRange: number,
    mySpeedMs: number,
    obstacles: VehicleObstacle[]
  ): void {
    const rayDirX = Math.sin(rayAngle);
    const rayDirZ = Math.cos(rayAngle);

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];

      // Each F1 car is modeled as dual overlapping bounding spheres (front & rear axles)
      const halfWheelbase = 1.35;
      const sphereRadius = 1.15;

      const fX = obs.x + Math.sin(obs.yaw) * halfWheelbase;
      const fZ = obs.z + Math.cos(obs.yaw) * halfWheelbase;
      const rX = obs.x - Math.sin(obs.yaw) * halfWheelbase;
      const rZ = obs.z - Math.cos(obs.yaw) * halfWheelbase;

      const distFront = this.intersectRayCircle(rayStartX, rayStartZ, rayDirX, rayDirZ, fX, fZ, sphereRadius, maxRange);
      const distRear = this.intersectRayCircle(rayStartX, rayStartZ, rayDirX, rayDirZ, rX, rZ, sphereRadius, maxRange);

      const closestDist = Math.min(distFront, distRear);

      if (closestDist > 0 && closestDist < ray.distance) {
        ray.hit = true;
        ray.distance = closestDist;
        ray.entityId = obs.id;
        ray.relativeSpeed = mySpeedMs - obs.speedMs;

        // Relative lateral offset
        const dx = obs.x - rayStartX;
        const dz = obs.z - rayStartZ;
        ray.lateralOffset = dx * -rayDirZ + dz * rayDirX;
      }
    }
  }

  /**
   * Exact algebraic ray vs circle intersection
   */
  private intersectRayCircle(
    rx: number,
    rz: number,
    dx: number,
    dz: number,
    cx: number,
    cz: number,
    radius: number,
    maxRange: number
  ): number {
    const ox = rx - cx;
    const oz = rz - cz;

    const b = ox * dx + oz * dz;
    const c = ox * ox + oz * oz - radius * radius;

    // Ray origin is inside circle
    if (c < 0) return 0.05;

    // Ray points away from circle
    if (b > 0) return Infinity;

    const disc = b * b - c;
    if (disc < 0) return Infinity;

    const t = -b - Math.sqrt(disc);
    if (t > 0 && t <= maxRange) {
      return t;
    }

    return Infinity;
  }

  /**
   * Analyzes radar rays to determine optimal tactical overtaking decision & path corridor
   */
  public evaluateOvertake(
    currentLaneOffset: number,
    aggression: number = 0.85,
    isCornerEntry: boolean = false
  ): OvertakeOpportunity {
    const s = this.sensors;
    const isSideBySide = s.sideLeft.hit || s.sideRight.hit || s.flankLeft.distance < 4.5 || s.flankRight.distance < 4.5;

    // 1. Direct Obstacle Ahead
    const hasLeaderAhead = s.center.hit && s.center.distance < 36.0;
    const isClosingFast = s.center.relativeSpeed > 0.5;

    if (!hasLeaderAhead && !isSideBySide) {
      return {
        shouldOvertake: false,
        recommendedLane: 'hold',
        targetOffset: currentLaneOffset * 0.95, // gently drift to racing line
        isSideBySide: false,
        canDivebomb: false,
        urgency: 0,
      };
    }

    // 2. Score Left vs Right Corridors
    // Clearance considers attack ray distance and available tarmac width
    const leftClearance = Math.min(s.attackLeft.distance, s.flankLeft.distance) * (s.trackWidthLeft > 2.5 ? 1.0 : 0.2);
    const rightClearance = Math.min(s.attackRight.distance, s.flankRight.distance) * (s.trackWidthRight > 2.5 ? 1.0 : 0.2);

    let recommendedLane: 'inside' | 'outside' | 'hold' = 'hold';
    let targetOffset = currentLaneOffset;
    let canDivebomb = false;
    let urgency = THREE.MathUtils.clamp((36.0 - s.center.distance) / 28.0, 0.2, 1.0);

    // If already side-by-side, enforce racing room!
    if (isSideBySide) {
      if (s.sideLeft.hit) {
        // Rival on our left: keep safe space to the right
        targetOffset = Math.min(s.trackWidthRight - 1.2, Math.max(1.8, currentLaneOffset + 0.6));
      } else if (s.sideRight.hit) {
        // Rival on our right: keep safe space to the left
        targetOffset = Math.max(-s.trackWidthLeft + 1.2, Math.min(-1.8, currentLaneOffset - 0.6));
      }
      return {
        shouldOvertake: true,
        recommendedLane: targetOffset > 0 ? 'outside' : 'inside',
        targetOffset,
        isSideBySide: true,
        canDivebomb: false,
        urgency: 0.9,
      };
    }

    // 3. Slingshot Lane Selection based on ray clearance and driver aggression
    if (rightClearance >= leftClearance && s.trackWidthRight > 3.0) {
      // Clear path on right
      targetOffset = THREE.MathUtils.clamp(2.7, 1.8, s.trackWidthRight - 1.0);
      recommendedLane = 'outside';
    } else if (leftClearance > rightClearance && s.trackWidthLeft > 3.0) {
      // Clear path on left
      targetOffset = THREE.MathUtils.clamp(-2.7, -s.trackWidthLeft + 1.0, -1.8);
      recommendedLane = 'inside';
    } else {
      // Both sides tight: pick the side with least resistance
      const chosenSide = rightClearance > leftClearance ? 2.2 : -2.2;
      targetOffset = chosenSide;
      recommendedLane = chosenSide > 0 ? 'outside' : 'inside';
    }

    // 4. Divebomb / Late-braking potential in corner entry zone
    if (isCornerEntry && aggression > 0.82 && s.center.distance < 20.0 && s.center.distance > 6.0) {
      // If we have an inside run with at least 15m clearance, trigger divebomb!
      if (recommendedLane === 'inside' && leftClearance > 14.0) {
        canDivebomb = true;
        urgency = 1.0;
      }
    }

    return {
      shouldOvertake: true,
      recommendedLane,
      targetOffset,
      isSideBySide: false,
      canDivebomb,
      urgency,
    };
  }
}
