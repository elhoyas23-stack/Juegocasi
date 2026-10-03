/**
 * SpeedPostEffect.ts - Neutralized / Disabled Speed Post Effect
 * Preserves 100% crystal-clear, razor-sharp rendering at all vehicle speeds without any optical blur or smearing.
 */

import * as THREE from 'three';

export class SpeedPostEffect {
  public group: THREE.Group;

  constructor(_camera: THREE.Camera) {
    this.group = new THREE.Group();
  }

  public update(_dt: number, _speedKmh: number, _isPaused: boolean): void {
    // Disabled: zero blur, zero vignette, crystal-clear viewport at all speeds
  }

  public dispose(): void {
    // No-op
  }
}

