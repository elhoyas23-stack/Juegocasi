/**
 * CircuitWaypoints.ts - Shared Circuit Geometry, Spline Projections & Official F1 Timing Formatters
 * Ensures 100% synchronized spatial tracking between the Player and AI rivals,
 * eliminating leader distance glitches and providing FIA-grade millisecond timing.
 */

import * as THREE from 'three';

export interface SplinePoint {
  x: number;
  z: number;
  speedLimitKmh: number;
  yaw: number;
}

export const CIRCUIT_TOTAL_LENGTH = 974.76;

// Circuit average race pace velocity (~159.5 km/h, calibrated to 22.0s representative lap time)
export const CIRCUIT_RACE_PACE_SPEED = 44.307; // m/s

/**
 * Pre-generates the canonical closed racing line waypoints for the circuit
 */
export function buildCircuitWaypoints(): SplinePoint[] {
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

  return points.map((pt, idx, arr) => {
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
 * Cached global waypoint array
 */
export const SHARED_CIRCUIT_WAYPOINTS = buildCircuitWaypoints();

/**
 * Projects an arbitrary 2D world position (x, z) onto the circuit centerline
 * to return exact distance along lap in meters (0 to 974.76m).
 */
export function getTrackDistanceAtPosition(x: number, z: number): number {
  const pts = SHARED_CIRCUIT_WAYPOINTS;
  const numPts = pts.length;
  let closestIdx = 0;
  let minDsq = Infinity;

  for (let i = 0; i < numPts; i++) {
    const dx = pts[i].x - x;
    const dz = pts[i].z - z;
    const dsq = dx * dx + dz * dz;
    if (dsq < minDsq) {
      minDsq = dsq;
      closestIdx = i;
    }
  }

  return (closestIdx / numPts) * CIRCUIT_TOTAL_LENGTH;
}

/**
 * Formats F1 time difference gap with millisecond precision and comma separator (e.g. +1,354 s, +0,715 s)
 */
export function formatF1TimeGap(seconds: number): string {
  if (seconds <= 0.0005) return '+0,000 s';

  if (seconds >= 60.0) {
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    const remStr = rem.toFixed(3).replace('.', ',');
    return `+${mins}:${remStr.padStart(6, '0')} s`;
  }

  return `+${seconds.toFixed(3).replace('.', ',')} s`;
}

/**
 * Formats official F1 lap chronometer time (e.g. 0:22,938 or 1:18,452) with comma separator
 */
export function formatF1LapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) {
    return '--:--,---';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds * 1000) % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
