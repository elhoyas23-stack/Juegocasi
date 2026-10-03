/**
 * HUD.tsx - Clean High-Performance Racing Telemetry Heads-Up Display
 * Features:
 * - Speedometer, gear display, and dynamic RPM tachometer
 * - Mini-radar circuit track map and lap chronometer
 * - Compact & subtle Top-Right 4-wheel tire degradation widget
 * - Modern, non-invasive Next Pit Stop compound strategy selector (Soft / Medium / Hard)
 * - Fullscreen browser toggle button with responsive layout safeguarding against element clipping
 */

import React from 'react';
import { Camera, Flame, Pause, Trophy, Wrench, AlertTriangle, Disc, Maximize, Minimize, Check } from 'lucide-react';
import { GameTelemetry } from '../game/RacingGameEngine';
import { TIRE_COMPOUNDS, TireCompoundType } from '../game/physics/TireCompound';

interface HUDProps {
  telemetry: GameTelemetry;
  carPosition?: { x: number; z: number; yaw: number };
  onSwitchCamera: () => void;
  onOpenPause: () => void;
  onRequestPitStop?: () => void;
  onSelectNextPitTireCompound?: (compound: TireCompoundType) => void;
  onChangeTireCompound?: (compound: TireCompoundType) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isMultiplayer?: boolean;
  totalLaps?: number;
  myPlayerName?: string;
  myPlayerId?: 'p1' | 'p2';
  rivalPlayerName?: string;
  rivalLap?: number;
  raceWinner?: { id: string; name: string } | null;
}

export const HUD = React.memo<HUDProps>(({
  telemetry,
  carPosition,
  onSwitchCamera,
  onOpenPause,
  onRequestPitStop,
  onSelectNextPitTireCompound,
  onChangeTireCompound,
  isFullscreen = false,
  onToggleFullscreen,
  isMultiplayer,
  totalLaps = 3,
  myPlayerName,
  myPlayerId = 'p1',
  rivalPlayerName,
  rivalLap = 1,
  raceWinner,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 1000) % 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // RPM percentage (0% at 1000, 100% at 9500)
  const rpmPercent = Math.min(100, Math.max(0, ((telemetry.rpm - 1000) / 8500) * 100));
  const isRedline = telemetry.rpm > 8700;

  // Mini-map coordinates translation
  const posX = carPosition ? carPosition.x : telemetry.carX;
  const posZ = carPosition ? carPosition.z : telemetry.carZ;
  const yaw = carPosition ? carPosition.yaw : telemetry.carYaw;
  const mapX = 50 + (posX * 0.35);
  const mapY = 50 + (posZ * 0.35);
  const carHeadingDeg = (yaw * 180) / Math.PI;

  const currentCompound = TIRE_COMPOUNDS[telemetry.tireCompound] || TIRE_COMPOUNDS.soft;
  const nextCompoundType = telemetry.nextPitTireCompound || telemetry.tireCompound || 'soft';
  const hasPuncture = telemetry.hasAnyPuncture;
  const wear = telemetry.tireWear || [0, 0, 0, 0];
  const temps = telemetry.tireTemps || [95, 95, 95, 95];
  const punctures = telemetry.isPunctured || [false, false, false, false];

  const getTireStatusBadge = (idx: number) => {
    if (punctures[idx]) {
      return {
        bg: 'bg-red-600/90 text-white border-red-400 animate-pulse',
        text: 'PINCHADO',
        isCritical: true,
      };
    }
    const w = wear[idx];
    if (w > 80) {
      return {
        bg: 'bg-red-500/25 text-red-300 border-red-500/40',
        text: `${Math.round(w)}%`,
        isCritical: true,
      };
    }
    if (w > 50) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        text: `${Math.round(w)}%`,
        isCritical: false,
      };
    }
    return {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      text: `${Math.round(w)}%`,
      isCritical: false,
    };
  };

  const handleChooseNextCompound = (comp: TireCompoundType) => {
    if (onSelectNextPitTireCompound) {
      onSelectNextPitTireCompound(comp);
    }
    if (onChangeTireCompound) {
      onChangeTireCompound(comp);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden">
      {/* Top Header Section */}
      <div className="w-full flex flex-col gap-2 z-20">
        {/* Main Telemetry & Actions Navigation Bar */}
        <div className="pointer-events-auto flex items-center justify-between gap-1.5 sm:gap-2.5 w-full bg-neutral-950/85 backdrop-blur-md border border-white/10 rounded-2xl px-2.5 sm:px-3.5 py-1.5 shadow-2xl">
          
          {/* Left: Compact Circuit Mini-Map & Lap Chrono */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Radar Mini-map */}
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-neutral-900/90 rounded-xl border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 100 100" className="w-full h-full p-0.5 opacity-80">
                <rect x="8" y="8" width="84" height="84" rx="14" ry="14" fill="none" stroke="#52525b" strokeWidth="6" />
                <rect x="8" y="8" width="84" height="84" rx="14" ry="14" fill="none" stroke="#18181b" strokeWidth="4" />
                <line x1="42" y1="92" x2="58" y2="92" stroke="#ef4444" strokeWidth="3" />
                <line x1="40" y1="83" x2="65" y2="83" stroke="#10b981" strokeWidth="2" strokeDasharray="2,2" />
              </svg>
              <div
                className="absolute w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"
                style={{
                  left: `${Math.min(92, Math.max(8, mapX))}%`,
                  top: `${Math.min(92, Math.max(8, mapY))}%`,
                  transform: `translate(-50%, -50%) rotate(${carHeadingDeg}deg)`,
                }}
              >
                <div className="w-0.5 h-1 bg-white mx-auto -mt-0.5 rounded-full" />
              </div>
            </div>

            {/* Lap Counter & Chronometer */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1 text-[8.5px] sm:text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider">
                <span>VUELTA {telemetry.lapCount}{isMultiplayer ? `/${totalLaps}` : ''}</span>
                {telemetry.isDrifting && (
                  <span className="flex items-center gap-0.5 text-amber-400 font-black text-[8.5px] animate-pulse">
                    <Flame className="w-2.5 h-2.5" /> DRIFT
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white tabular-nums leading-tight">
                {formatTime(telemetry.lapTime)}
              </div>
              <div className="hidden xs:block text-[8px] sm:text-[8.5px] text-neutral-400 font-mono tabular-nums leading-none">
                Mejor: {telemetry.bestLap ? formatTime(telemetry.bestLap) : '--:--.---'}
              </div>
            </div>
          </div>

          {/* Center: High-Performance Speedometer & Tachometer */}
          <div className="flex items-center gap-2 sm:gap-3 bg-neutral-900/80 border border-white/10 rounded-xl px-2 sm:px-3 py-1 shadow-inner">
            {/* Gear Indicator */}
            <div className="flex items-center gap-0.5">
              <span className="text-[7.5px] sm:text-[8.5px] uppercase font-bold text-neutral-400">M</span>
              <span className={`text-sm sm:text-base font-black font-mono leading-none ${telemetry.gear === -1 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {telemetry.gear === -1 ? 'R' : telemetry.gear === 0 ? 'N' : telemetry.gear}
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/15" />

            {/* Speed Display */}
            <div className="flex items-baseline gap-0.5">
              <span className={`text-sm sm:text-lg font-black font-mono tracking-tight tabular-nums leading-none ${hasPuncture ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {telemetry.speedKmh}
              </span>
              <span className="text-[7.5px] sm:text-[8.5px] font-bold text-neutral-400">KM/H</span>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-white/15" />

            {/* RPM Tachometer */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-14 sm:w-20 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full rounded-full ${
                    isRedline
                      ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-red-600 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500'
                  }`}
                  style={{ width: `${rpmPercent}%` }}
                />
              </div>
              <span className={`text-[8.5px] font-mono font-bold tabular-nums ${isRedline ? 'text-red-400 animate-pulse' : 'text-neutral-400'}`}>
                {(telemetry.rpm / 1000).toFixed(1)}k
              </span>
            </div>
          </div>

          {/* Right: Quick Action Controls (Camera, Fullscreen, Pit Stop, Pause) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Quick Camera Switcher */}
            <button
              onClick={onSwitchCamera}
              title="Cambiar vista de cámara (C)"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5 transition-all active:scale-95 flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                {telemetry.cameraMode === 'hood' && 'Morro'}
                {telemetry.cameraMode === 'bumper' && 'Alerón'}
                {telemetry.cameraMode === 'orbit' && 'Aéreo'}
                {telemetry.cameraMode === 'chase' && (telemetry.cameraDistance === 'near' ? 'Cerca' : telemetry.cameraDistance === 'far' ? 'Lejos' : 'Cámara')}
              </span>
            </button>

            {/* Fullscreen Toggle Button */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Poner juego en pantalla completa'}
                className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/5 transition-all active:scale-95 flex items-center gap-1"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Maximize className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-wider text-neutral-300">
                  {isFullscreen ? 'Ventana' : 'Pantalla Completa'}
                </span>
              </button>
            )}

            {/* Quick Pit Stop Request Button */}
            {onRequestPitStop && (
              <button
                onClick={onRequestPitStop}
                title="Entrar a Boxes / Cambio de Neumáticos (B)"
                disabled={telemetry.isInPit}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 font-bold ${
                  telemetry.isInPit
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-default'
                    : hasPuncture
                    ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-950/80 animate-bounce'
                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border-red-500/40'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[9px] uppercase tracking-wider hidden xs:inline">
                  {telemetry.isInPit ? 'Boxes' : hasPuncture ? '¡BOX NOW! (B)' : 'BOX (B)'}
                </span>
              </button>
            )}

            {/* Pause Menu Trigger Button */}
            <button
              onClick={onOpenPause}
              title="Menú de Pausa (P / ESC)"
              className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 transition-all active:scale-95 flex items-center justify-center font-bold"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        {/* PROMINENT TIRE BLOWOUT / PUNCTURE WARNING BANNER */}
        {hasPuncture && !telemetry.isInPit && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 border-2 border-red-300 text-white rounded-2xl px-3 sm:px-4 py-2 text-center shadow-2xl shadow-red-950/90 max-w-xl mx-auto flex items-center justify-center gap-2.5 pointer-events-auto animate-bounce">
            <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-yellow-200 leading-tight">
                ⚠️ ¡NEUMÁTICO REVENTADO / PINCHADO! MODO COJERA (MÁX 38 KM/H)
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-white leading-tight">
                Agarre comprometido y desvío lateral. Pulsa <strong>BOX (B)</strong> para sustituir los neumáticos en boxes.
              </span>
            </div>
          </div>
        )}

        {/* Center: Pit Stop Telemetry Banner (when in pit) */}
        {telemetry.isInPit && (
          <div className="bg-neutral-950/95 border-2 border-emerald-500/70 rounded-2xl px-3.5 py-1.5 sm:py-2 text-center backdrop-blur-xl shadow-2xl shadow-emerald-950/60 max-w-sm mx-auto flex flex-col gap-1 pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
            {telemetry.broadcastCamName && (
              <div className="flex items-center justify-center gap-1.5 bg-red-950/60 border border-red-500/40 rounded py-0.5 px-2 text-[7.5px] font-bold text-red-200 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                <span>DIRECTO · {telemetry.broadcastCamName}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 text-[11px] sm:text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wide">
                {(telemetry.pitPhase === 'entry_autopilot' || telemetry.pitPhase === 'entry') && 'AUTOPILOT · LÍMITE 60 KM/H'}
                {telemetry.pitPhase === 'docking' && 'COLOCANDO EN CAJÓN'}
                {(telemetry.pitPhase === 'jacks_up' || telemetry.pitPhase === 'jacking') && 'LEVANTANDO COCHE'}
                {(telemetry.pitPhase === 'servicing' || telemetry.pitPhase === 'service') && 'CAMBIO DE RUEDAS Y REPARACIÓN'}
                {telemetry.pitPhase === 'jacks_down' && 'GATOS ABAJO · LISTO'}
                {(telemetry.pitPhase === 'released' || telemetry.pitPhase === 'exit') && '¡SALIDA DE BOXES!'}
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                {telemetry.pitPhase === 'entry_autopilot' ? '60 KM/H' : `${telemetry.pitTimeRemaining.toFixed(1)}s`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${Math.min(100, telemetry.pitProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Victory Banner (Multiplayer Finish) */}
        {raceWinner && (
          <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-2 border-yellow-300 rounded-3xl px-5 py-2.5 text-center shadow-2xl shadow-amber-950/80 max-w-md mx-auto flex items-center justify-center gap-3 pointer-events-auto animate-bounce">
            <Trophy className="w-6 h-6 text-neutral-950 fill-current shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-950">
                ¡GANADOR DE LA CARRERA 1 VS 1!
              </span>
              <span className="text-base sm:text-lg font-black text-neutral-950 font-mono tracking-tight leading-none">
                {raceWinner.name} ({raceWinner.id === myPlayerId ? '¡ERES TÚ!' : 'RIVAL'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Left Floating Solo Free Practice / Time Trial Timing Widget */}
      {telemetry.isFreePractice && (
        <div className="pointer-events-auto absolute top-14 sm:top-16 left-2 sm:left-3 z-10 flex flex-col gap-1.5 w-[185px] sm:w-[220px] bg-neutral-950/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-2.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] sm:text-[8.5px] font-black tracking-widest text-cyan-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              VUELTAS LIBRES · TIME TRIAL
            </span>
          </div>

          <div className="flex flex-col gap-1 font-mono text-[9px] sm:text-[10px]">
            <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-neutral-900/80 border border-white/5">
              <span className="text-neutral-400 text-[8px] uppercase font-bold">RÉCORD PERSONAL:</span>
              <span className="font-black text-amber-400 tabular-nums">
                {telemetry.bestLap ? formatTime(telemetry.bestLap) : '--:--,---'}
              </span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-neutral-900/80 border border-white/5">
              <span className="text-neutral-400 text-[8px] uppercase font-bold">VUELTA ACTUAL:</span>
              <span className="font-bold text-white tabular-nums">
                {formatTime(telemetry.lapTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Left Floating F1 Live Timing Tower (P1 to P5) */}
      {!telemetry.isFreePractice && telemetry.careerLeaderboard && telemetry.careerLeaderboard.length > 0 && (
        <div className="pointer-events-auto absolute top-14 sm:top-16 left-2 sm:left-3 z-10 flex flex-col gap-1 w-[190px] sm:w-[230px] bg-neutral-950/85 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[8px] sm:text-[8.5px] font-black tracking-widest text-neutral-400 uppercase">
            <span>TIEMPOS F1 EN VIVO</span>
            {telemetry.careerConfig?.requiresTwoCompounds && (
              <span className="text-amber-400 text-[7px] font-bold">2 COMP OBLIG.</span>
            )}
          </div>

          {/* Drivers Rows (P1 to P5) */}
          <div className="flex flex-col gap-1">
            {telemetry.careerLeaderboard.map((entry) => {
              const compCss = TIRE_COMPOUNDS[entry.currentCompound]?.colorCss || '#ef4444';
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-1.5 py-1 rounded-xl text-[8px] sm:text-[9px] font-mono font-bold transition-all border ${
                    entry.isPlayer
                       ? 'bg-blue-600/25 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-400/30'
                      : 'bg-neutral-900/60 border-white/5 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {/* Position */}
                    <span className={`w-3.5 text-center font-black ${entry.position === 1 ? 'text-amber-400' : 'text-neutral-400'}`}>
                      P{entry.position}
                    </span>
                    {/* Team Color Strip */}
                    <span className="w-1 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.teamColorCss }} />
                    {/* Driver Code */}
                    <span className="font-black text-white tracking-wider truncate max-w-[42px] sm:max-w-[65px]">
                      {entry.driverCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Gap */}
                    <span className={`text-[7.5px] sm:text-[8.5px] tabular-nums font-mono ${entry.position === 1 ? 'text-amber-400 font-black' : 'text-neutral-200 font-bold'}`}>
                      {entry.gapToLeaderFormatted}
                    </span>

                    {/* Compound Badge */}
                    <span
                      className="px-1 py-0.5 rounded text-[7px] font-black uppercase border leading-none shrink-0"
                      style={{
                        backgroundColor: `${compCss}22`,
                        borderColor: `${compCss}66`,
                        color: compCss,
                      }}
                    >
                      {entry.currentCompound.charAt(0).toUpperCase()}
                    </span>

                    {/* Pit count / Box indicator */}
                    <span className="text-[7px] text-neutral-400 font-bold shrink-0">
                      {entry.isInPit ? 'BOX' : `P${entry.pitStopsCount}`}
                    </span>

                    {/* Mandatory 2-Compound Rule Status Badge */}
                    {telemetry.careerConfig?.requiresTwoCompounds && (
                      <span title={entry.hasSatisfiedTireRule ? 'Cumple regla de 2 compuestos' : 'Pendiente usar 2º compuesto'}>
                        {entry.hasSatisfiedTireRule ? (
                          <span className="text-emerald-400 text-[8px]">✓</span>
                        ) : (
                          <span className="text-amber-400 text-[8px] animate-pulse">⚠️</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Right Floating Compact & Subtle Tire Status & Next Pit Strategy Selector */}
      <div className="pointer-events-auto absolute top-14 sm:top-16 right-2 sm:right-3 z-10 flex flex-col items-end gap-1.5">
        <div className="bg-neutral-950/80 hover:bg-neutral-950/95 transition-colors backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1.5 w-[165px] sm:w-[185px]">
          
          {/* Header with Active Compound Indicator */}
          <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
            <div className="flex items-center gap-1">
              <Disc className="w-3 h-3" style={{ color: currentCompound.colorCss }} />
              <span className="text-[8px] sm:text-[8.5px] font-black tracking-wider uppercase text-neutral-300">
                NEUMÁTICOS
              </span>
            </div>
            <div
              className="px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 border"
              style={{
                backgroundColor: `${currentCompound.colorCss}18`,
                borderColor: `${currentCompound.colorCss}55`,
                color: currentCompound.colorCss,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentCompound.colorCss }} />
              <span>{currentCompound.code}</span>
            </div>
          </div>

          {/* Micro 4-Wheel Degradation Grid (FL, FR, RL, RR) */}
          <div className="grid grid-cols-2 gap-1 text-[7.5px]">
            {/* Front Left */}
            {(() => {
              const b = getTireStatusBadge(0);
              return (
                <div className={`rounded-md border px-1 py-0.5 flex flex-col justify-between ${b.bg}`}>
                  <div className="flex items-center justify-between font-bold leading-tight">
                    <span className="opacity-80">D-IZQ</span>
                    <span>{b.text}</span>
                  </div>
                  <div className="text-[6.5px] opacity-75 font-mono leading-none mt-0.5">
                    {Math.round(temps[0])}°C
                  </div>
                </div>
              );
            })()}

            {/* Front Right */}
            {(() => {
              const b = getTireStatusBadge(1);
              return (
                <div className={`rounded-md border px-1 py-0.5 flex flex-col justify-between ${b.bg}`}>
                  <div className="flex items-center justify-between font-bold leading-tight">
                    <span className="opacity-80">D-DER</span>
                    <span>{b.text}</span>
                  </div>
                  <div className="text-[6.5px] opacity-75 font-mono leading-none mt-0.5">
                    {Math.round(temps[1])}°C
                  </div>
                </div>
              );
            })()}

            {/* Rear Left */}
            {(() => {
              const b = getTireStatusBadge(2);
              return (
                <div className={`rounded-md border px-1 py-0.5 flex flex-col justify-between ${b.bg}`}>
                  <div className="flex items-center justify-between font-bold leading-tight">
                    <span className="opacity-80">T-IZQ</span>
                    <span>{b.text}</span>
                  </div>
                  <div className="text-[6.5px] opacity-75 font-mono leading-none mt-0.5">
                    {Math.round(temps[2])}°C
                  </div>
                </div>
              );
            })()}

            {/* Rear Right */}
            {(() => {
              const b = getTireStatusBadge(3);
              return (
                <div className={`rounded-md border px-1 py-0.5 flex flex-col justify-between ${b.bg}`}>
                  <div className="flex items-center justify-between font-bold leading-tight">
                    <span className="opacity-80">T-DER</span>
                    <span>{b.text}</span>
                  </div>
                  <div className="text-[6.5px] opacity-75 font-mono leading-none mt-0.5">
                    {Math.round(temps[3])}°C
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Modern & Non-Invasive Next Pit Stop Compound Selector */}
          <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-[7px] uppercase font-bold tracking-wider text-neutral-400">
              <span>SIGUIENTE PARADA</span>
              <span className="font-mono text-white font-black">
                {nextCompoundType === 'soft' && 'SOFT'}
                {nextCompoundType === 'medium' && 'MED'}
                {nextCompoundType === 'hard' && 'HARD'}
              </span>
            </div>

            {/* Segmented Selector Buttons */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-900/90 p-0.5 rounded-lg border border-white/5">
              {/* Soft (C3 Red) */}
              <button
                type="button"
                onClick={() => handleChooseNextCompound('soft')}
                title="Elegir compuesto Blando (C3 Rojo) para el próximo cambio"
                className={`py-1 rounded-md text-[7.5px] sm:text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                  nextCompoundType === 'soft'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950/80 ring-1 ring-red-400'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>S</span>
                {nextCompoundType === 'soft' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>

              {/* Medium (C2 Yellow) */}
              <button
                type="button"
                onClick={() => handleChooseNextCompound('medium')}
                title="Elegir compuesto Medio (C2 Amarillo) para el próximo cambio"
                className={`py-1 rounded-md text-[7.5px] sm:text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                  nextCompoundType === 'medium'
                    ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/80 ring-1 ring-amber-300 font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span>M</span>
                {nextCompoundType === 'medium' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>

              {/* Hard (C1 White) */}
              <button
                type="button"
                onClick={() => handleChooseNextCompound('hard')}
                title="Elegir compuesto Duro (C1 Blanco) para el próximo cambio"
                className={`py-1 rounded-md text-[7.5px] sm:text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                  nextCompoundType === 'hard'
                    ? 'bg-neutral-100 text-neutral-950 shadow-md ring-1 ring-white font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>H</span>
                {nextCompoundType === 'hard' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
