/**
 * CareerRaceManager.ts - 5-Car Grand Prix Race Coordinator
 * Manages grid positions, 5 red lights start countdown, live telemetry leaderboards (P1-P5),
 * FIA mandatory 2-compound rules enforcement, and podium finishes.
 */

import * as THREE from 'three';
import { AICarController } from '../ai/AICarController';
import {
  RACE_TEAMS,
  RaceDifficulty,
  RaceLapOption,
  CareerRaceConfig,
  DriverLeaderboardEntry,
} from './CareerTypes';
import {
  CIRCUIT_TOTAL_LENGTH,
  CIRCUIT_RACE_PACE_SPEED,
  getTrackDistanceAtPosition,
  formatF1TimeGap,
  formatF1LapTime,
} from './CircuitWaypoints';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { ParticleSystem } from '../particles/ParticleSystem';
import { EngineSound } from '../audio/EngineSound';
import { TireCompoundType } from '../physics/TireCompound';

export class CareerRaceManager {
  public scene: THREE.Scene;
  public config: CareerRaceConfig;
  public aiCars: AICarController[] = [];

  // Race Progress
  public isRaceStarted: boolean = false;
  public isRaceFinished: boolean = false;
  public isControlsLocked: boolean = true;
  public totalRaceTime: number = 0;
  public playerTotalDistance: number = 0;
  public playerCompoundsUsed: Set<TireCompoundType> = new Set();
  public playerPitStopsCount: number = 0;

  // Stored Leaderboard
  public leaderboard: DriverLeaderboardEntry[] = [];
  public raceWinner: DriverLeaderboardEntry | null = null;
  public playerFinishPosition: number | null = null;
  private leaderboardTimer: number = 0;

  // Final Results
  public isShowingPodium: boolean = false;

  constructor(scene: THREE.Scene, config?: Partial<CareerRaceConfig>) {
    this.scene = scene;
    this.config = {
      totalLaps: config?.totalLaps || 20,
      difficulty: config?.difficulty || 'medium',
      startingCompound: config?.startingCompound || 'soft',
      requiresTwoCompounds: (config?.totalLaps || 20) >= 20,
    };

    this.playerCompoundsUsed.add(this.config.startingCompound);
    this.initAiGrid();
  }

  /**
   * Initializes the 4 AI Rival Cars with their official team liveries and compounds
   */
  private initAiGrid(): void {
    // Clear existing AI cars if any
    for (const car of this.aiCars) {
      this.scene.remove(car.carModel.group);
    }
    this.aiCars = [];

    // AI Teams: Scuderia (#16), Silver Arrow (#63), Papaya (#4), Emerald (#14)
    const aiTeams = RACE_TEAMS.slice(1);
    const startingCompounds: TireCompoundType[] = ['medium', 'soft', 'medium', 'hard'];

    aiTeams.forEach((team, idx) => {
      const startComp = startingCompounds[idx % startingCompounds.length];
      const ai = new AICarController(
        team,
        this.config.difficulty,
        startComp,
        this.config.totalLaps
      );

      // Grid Slots: Slot 1 is Player (P1 Pole), Slot 2 to 5 are AI cars
      ai.setGridPosition(idx + 2);

      this.scene.add(ai.carModel.group);
      this.aiCars.push(ai);
    });
  }

  /**
   * Resets and starts the Grand Prix on official F1 Grid
   */
  public startRace(playerPhysics: VehiclePhysics): void {
    this.isRaceStarted = true;
    this.isRaceFinished = false;
    this.isControlsLocked = true;
    this.totalRaceTime = 0;
    this.playerTotalDistance = 0;
    this.playerCompoundsUsed.clear();
    this.playerCompoundsUsed.add(playerPhysics.tireCompound);
    this.playerPitStopsCount = 0;
    this.playerFinishPosition = null;
    this.raceWinner = null;
    this.isShowingPodium = false;

    // Set player to Pole Position (Grid Slot 1: x = -18.0, z = -128.0, yaw = Math.PI / 2)
    playerPhysics.reset(-18.0, -128.0, Math.PI / 2);
    playerPhysics.speed = 0;
    playerPhysics.gear = 1;

    // Reset AI cars on their F1 grid slots (Slot 2 to 5)
    this.aiCars.forEach((ai, idx) => {
      ai.setGridPosition(idx + 2);
    });
  }

  /**
   * Triggered when starting lights go out
   */
  public onLightsOut(): void {
    this.isControlsLocked = false;
    this.aiCars.forEach((ai) => {
      ai.onLightsOut();
    });
  }

  /**
   * Registers a pit stop compound change for the player
   */
  public registerPlayerPitStop(newCompound: TireCompoundType): void {
    this.playerCompoundsUsed.add(newCompound);
    this.playerPitStopsCount++;
  }

  /**
   * Main Frame Update: Simulation of all 4 AI pilots and live race standings calculation
   */
  public update(
    dt: number,
    playerPhysics: VehiclePhysics,
    playerLapCount: number,
    playerCurrentSector: number,
    playerCurrentLapTime: number,
    playerBestLapTime: number | null,
    playerIsInPit: boolean,
    particles: ParticleSystem,
    audio?: EngineSound,
    isControlsLocked: boolean = false
  ): void {
    if (!this.isRaceStarted) return;

    this.isControlsLocked = isControlsLocked;
    if (!isControlsLocked) {
      this.totalRaceTime += dt;
    }

    // Approximate player distance along track
    const totalTrackLength = 974.76;
    const playerSpeedKmh = Math.abs(playerPhysics.speed) * 3.6;
    const pPos = new THREE.Vector3(playerPhysics.position.x, playerPhysics.position.y, playerPhysics.position.z);

    // 1. Update all 4 AI Cars
    for (const ai of this.aiCars) {
      ai.update(
        dt,
        pPos,
        playerSpeedKmh,
        this.aiCars,
        particles,
        this.isRaceStarted,
        this.isControlsLocked
      );

      // Check AI Finish
      if (!ai.isFinished && ai.currentLap > this.config.totalLaps) {
        ai.isFinished = true;
        ai.finishTime = this.totalRaceTime;
      }
    }

    // 2. Player Finish Check
    if (!this.isRaceFinished && playerLapCount > this.config.totalLaps) {
      this.isRaceFinished = true;
      if (audio) {
        audio.triggerPitChime();
      }
    }

    // 3. Compute Live F1 Leaderboard & Real-Time Positions (P1 to P5) - Throttled to 10 Hz
    this.leaderboardTimer += dt;
    if (this.leaderboardTimer < 0.10 && this.leaderboard.length > 0) {
      return;
    }
    this.leaderboardTimer = 0;

    // Synchronize Player track progress on the exact same circuit waypoint spline as AI
    const playerDistOnLap = getTrackDistanceAtPosition(playerPhysics.position.x, playerPhysics.position.z);
    const playerProgressScore = (playerLapCount - 1) * CIRCUIT_TOTAL_LENGTH + playerDistOnLap;

    interface TempDriver {
      id: string;
      isPlayer: boolean;
      score: number;
      ai?: AICarController;
    }

    const competitors: TempDriver[] = [
      { id: 'player', isPlayer: true, score: playerProgressScore },
      ...this.aiCars.map((ai) => ({
        id: ai.team.id,
        isPlayer: false,
        score: (ai.currentLap - 1) * CIRCUIT_TOTAL_LENGTH + ai.distanceAlongTrack,
        ai: ai,
      })),
    ];

    // Sort descending by real accumulated race progress (P1 leader = furthest progress)
    competitors.sort((a, b) => b.score - a.score);

    const leaderScore = competitors[0].score;

    // Build finalized leaderboard entries with official F1 millisecond gaps and comma format
    const newLeaderboard: DriverLeaderboardEntry[] = competitors.map((comp, idx) => {
      const position = idx + 1;
      const scoreDelta = Math.max(0, leaderScore - comp.score);
      const gapSeconds = scoreDelta / CIRCUIT_RACE_PACE_SPEED;
      const aheadScore = idx === 0 ? leaderScore : competitors[idx - 1].score;
      const intervalSeconds = Math.max(0, (aheadScore - comp.score) / CIRCUIT_RACE_PACE_SPEED);
      const lapsBehind = Math.floor(scoreDelta / CIRCUIT_TOTAL_LENGTH);

      let gapFormatted = 'LÍDER';
      let aheadFormatted = '-';

      if (position > 1) {
        if (lapsBehind >= 1) {
          gapFormatted = `+${lapsBehind} ${lapsBehind === 1 ? 'VTA' : 'VTAS'}`;
          aheadFormatted = `+${lapsBehind} ${lapsBehind === 1 ? 'VTA' : 'VTAS'}`;
        } else {
          gapFormatted = formatF1TimeGap(gapSeconds);
          aheadFormatted = formatF1TimeGap(intervalSeconds);
        }
      }

      if (comp.isPlayer) {
        const compoundsArray = Array.from(this.playerCompoundsUsed);
        const hasSatisfied = !this.config.requiresTwoCompounds || compoundsArray.length >= 2;
        const avgWear = (playerPhysics.tireWear[0] + playerPhysics.tireWear[1] + playerPhysics.tireWear[2] + playerPhysics.tireWear[3]) / 4;

        if (this.isRaceFinished && this.playerFinishPosition === null) {
          this.playerFinishPosition = position;
        }

        return {
          id: 'player',
          position,
          driverCode: 'YOU',
          driverName: 'Tú (Player)',
          driverNumber: '1',
          teamName: 'Apex Racing GP',
          teamColorCss: '#3b82f6',
          currentLap: Math.min(this.config.totalLaps, playerLapCount),
          currentSector: playerCurrentSector,
          currentCompound: playerPhysics.tireCompound,
          compoundsUsed: compoundsArray,
          hasSatisfiedTireRule: hasSatisfied,
          tireWearAvg: avgWear,
          pitStopsCount: this.playerPitStopsCount,
          isInPit: playerIsInPit,
          gapToLeaderFormatted: gapFormatted,
          gapToAheadFormatted: aheadFormatted,
          lastLapTime: null,
          bestLapTime: playerBestLapTime,
          currentLapTime: playerCurrentLapTime,
          totalRaceTime: this.totalRaceTime,
          isPlayer: true,
          isFinished: this.isRaceFinished,
          finishPosition: this.playerFinishPosition || undefined,
          hasPenalty: this.isRaceFinished && this.config.requiresTwoCompounds && compoundsArray.length < 2,
          penaltySeconds: this.config.requiresTwoCompounds && compoundsArray.length < 2 ? 30 : 0,
        };
      } else {
        const ai = comp.ai!;
        const aiData = ai.getLeaderboardData(position, leaderScore);
        aiData.gapToLeaderFormatted = gapFormatted;
        aiData.gapToAheadFormatted = aheadFormatted;
        return aiData;
      }
    });

    this.leaderboard = newLeaderboard;
    this.raceWinner = newLeaderboard[0];
  }

  public dispose(): void {
    for (const car of this.aiCars) {
      this.scene.remove(car.carModel.group);
    }
    this.aiCars = [];
  }
}
