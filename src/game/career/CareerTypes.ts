/**
 * CareerTypes.ts - Multi-Car Grand Prix Race Definitions & Teams
 */

import { TireCompoundType } from '../physics/TireCompound';

export type RaceDifficulty = 'easy' | 'medium' | 'hard';
export type RaceLapOption = 9 | 20 | 50;

export interface TeamLiveryConfig {
  id: string;
  driverNumber: string;
  driverName: string;
  driverCode: string;
  teamName: string;
  primaryColor: string;       // Hex string e.g. '#1d4ed8'
  secondaryColor: string;     // Accent / Pods e.g. '#ef4444'
  accentColor: string;        // Stripes / Endplates
  haloColor: string;
  sponsorName: string;
  teamColorHex: number;
  teamColorCss: string;
  pitStallX: number;          // Pit lane X dock position (-24, -12, 0, 12, 24)
  pitStallZ: number;          // Pit lane Z dock position (-116.0)
}

export const RACE_TEAMS: TeamLiveryConfig[] = [
  {
    id: 'player',
    driverNumber: '1',
    driverName: 'Tú (Player)',
    driverCode: 'YOU',
    teamName: 'Apex Racing GP',
    primaryColor: '#1d4ed8',     // Electric Blue
    secondaryColor: '#ef4444',   // Racing Red
    accentColor: '#facc15',      // Gold
    haloColor: '#1e293b',
    sponsorName: 'APEX RACING',
    teamColorHex: 0x3b82f6,
    teamColorCss: '#3b82f6',
    pitStallX: 0.0,
    pitStallZ: -116.0,
  },
  {
    id: 'scuderia',
    driverNumber: '16',
    driverName: 'C. Leclerc',
    driverCode: 'LEC',
    teamName: 'Scuderia Corsa',
    primaryColor: '#dc2626',     // Rosso Corsa
    secondaryColor: '#facc15',   // Modena Yellow
    accentColor: '#ffffff',
    haloColor: '#0f172a',
    sponsorName: 'SANTANDER',
    teamColorHex: 0xdc2626,
    teamColorCss: '#dc2626',
    pitStallX: -24.0,
    pitStallZ: -116.0,
  },
  {
    id: 'silver_arrow',
    driverNumber: '63',
    driverName: 'G. Russell',
    driverCode: 'RUS',
    teamName: 'Silver Arrow F1',
    primaryColor: '#64748b',     // Silver Grey Metallic
    secondaryColor: '#06b6d4',   // Petronas Cyan
    accentColor: '#10b981',
    haloColor: '#06b6d4',
    sponsorName: 'PETRONAS',
    teamColorHex: 0x06b6d4,
    teamColorCss: '#06b6d4',
    pitStallX: -12.0,
    pitStallZ: -116.0,
  },
  {
    id: 'papaya',
    driverNumber: '4',
    driverName: 'L. Norris',
    driverCode: 'NOR',
    teamName: 'Papaya Racing',
    primaryColor: '#ea580c',     // Papaya Orange
    secondaryColor: '#0284c7',   // Gulf Blue
    accentColor: '#0f172a',
    haloColor: '#ea580c',
    sponsorName: 'MCLAREN',
    teamColorHex: 0xf97316,
    teamColorCss: '#f97316',
    pitStallX: 12.0,
    pitStallZ: -116.0,
  },
  {
    id: 'emerald',
    driverNumber: '14',
    driverName: 'F. Alonso',
    driverCode: 'ALO',
    teamName: 'Emerald Grand Prix',
    primaryColor: '#065f46',     // British Racing Green
    secondaryColor: '#84cc16',   // Neon Lime
    accentColor: '#f8fafc',
    haloColor: '#84cc16',
    sponsorName: 'ARAMCO',
    teamColorHex: 0x10b981,
    teamColorCss: '#10b981',
    pitStallX: 24.0,
    pitStallZ: -116.0,
  },
];

export interface DriverLeaderboardEntry {
  id: string;
  position: number;
  driverCode: string;
  driverName: string;
  driverNumber: string;
  teamName: string;
  teamColorCss: string;
  currentLap: number;
  currentSector: number;
  currentCompound: TireCompoundType;
  compoundsUsed: TireCompoundType[];
  hasSatisfiedTireRule: boolean;
  tireWearAvg: number;
  pitStopsCount: number;
  isInPit: boolean;
  gapToLeaderFormatted: string;
  gapToAheadFormatted: string;
  lastLapTime: number | null;
  bestLapTime: number | null;
  currentLapTime: number;
  totalRaceTime: number;
  isPlayer: boolean;
  isFinished: boolean;
  finishPosition?: number;
  hasPenalty: boolean;
  penaltySeconds: number;
}

export interface CareerRaceConfig {
  totalLaps: RaceLapOption;
  difficulty: RaceDifficulty;
  startingCompound: TireCompoundType;
  requiresTwoCompounds: boolean; // True for 20 and 50 laps
}
