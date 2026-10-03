/**
 * StartScreen.tsx
 * Comprehensive Lobby & Start Screen with Solo Game, Create Private Room, Join Room,
 * Host-exclusive 3D Model Manager, Laps Selector, and Camera Presets.
 */

import React, { useState, useRef } from 'react';
import {
  Play,
  Users,
  UserCheck,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  Upload,
  Car,
  Camera,
  Flag,
  ArrowLeft,
  Volume2,
  RefreshCw,
  Wrench,
  Sparkles,
  ShieldCheck,
  Gamepad2,
  AlertCircle,
  Gauge,
  Award
} from 'lucide-react';
import { CameraDistanceMode, CameraViewMode } from '../game/RacingGameEngine';
import { MultiplayerRoomState } from '../game/multiplayer/MultiplayerClient';

import { RaceDifficulty, RaceLapOption } from '../game/career/CareerTypes';
import { TireCompoundType } from '../game/physics/TireCompound';

interface StartScreenProps {
  onStartSolo: (
    cameraDistance: CameraDistanceMode,
    cameraMode: CameraViewMode,
    laps: RaceLapOption,
    difficulty: RaceDifficulty,
    startingCompound: TireCompoundType
  ) => void;
  onStartFreePractice?: (
    cameraDistance: CameraDistanceMode,
    cameraMode: CameraViewMode,
    startingCompound: TireCompoundType
  ) => void;
  onCreateRoom: (options: {
    playerName: string;
    laps: number;
    car1Name: string;
    car2Name: string;
    crewName: string;
    cameraDistance: CameraDistanceMode;
    cameraMode: CameraViewMode;
    car1Data?: string;
    car2Data?: string;
    crewData?: string;
  }) => Promise<void>;
  onJoinRoom: (code: string, playerName: string, cameraDistance: CameraDistanceMode, cameraMode: CameraViewMode) => Promise<void>;
  onStartMultiplayerRace: () => void;
  onSetReady: (isReady: boolean) => void;
  onLeaveRoom: () => void;
  roomState: MultiplayerRoomState | null;
  playerId: 'p1' | 'p2' | null;
  isConnecting: boolean;
  errorMessage: string | null;
  onOpenModelUpload: (target: 'car1' | 'car2' | 'crew') => void;
  car1Name: string;
  car2Name: string;
  crewName: string;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartSolo,
  onStartFreePractice,
  onCreateRoom,
  onJoinRoom,
  onStartMultiplayerRace,
  onSetReady,
  onLeaveRoom,
  roomState,
  playerId,
  isConnecting,
  errorMessage,
  onOpenModelUpload,
  car1Name,
  car2Name,
  crewName,
}) => {
  const [activeView, setActiveView] = useState<'home' | 'create_lobby' | 'join_lobby'>('home');
  const [playerName, setPlayerName] = useState<string>('Piloto ' + Math.floor(100 + Math.random() * 900));
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [selectedLaps, setSelectedLaps] = useState<number>(3);
  const [careerLaps, setCareerLaps] = useState<RaceLapOption>(20);
  const [difficulty, setDifficulty] = useState<RaceDifficulty>('medium');
  const [startingCompound, setStartingCompound] = useState<TireCompoundType>('soft');
  const [cameraDistance, setCameraDistance] = useState<CameraDistanceMode>('medium');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const isHost = playerId === 'p1';
  const isGuest = playerId === 'p2';
  const inRoom = Boolean(roomState && playerId);

  const handleCopyCode = () => {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCreateRoomSubmit = async () => {
    await onCreateRoom({
      playerName: playerName.trim() || 'Piloto 1 (Anfitrión)',
      laps: selectedLaps,
      car1Name,
      car2Name,
      crewName,
      cameraDistance,
      cameraMode,
    });
  };

  const handleJoinRoomSubmit = async () => {
    if (!joinCodeInput.trim()) return;
    await onJoinRoom(
      joinCodeInput.trim(),
      playerName.trim() || 'Piloto 2 (Invitado)',
      cameraDistance,
      cameraMode
    );
  };

  const handleToggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    onSetReady(next);
  };

  // --- 1. LOBBY VIEW (WHEN INSIDE A ROOM) ---
  if (inRoom && roomState) {
    const p1 = roomState.players['p1'];
    const p2 = roomState.players['p2'];
    const canStart = isHost && p1 && p2 && p2.isReady;

    return (
      <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
        <div className="bg-neutral-900/95 border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-wide">
                    SALA MULTIJUGADOR 1 VS 1
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isHost ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
                    {isHost ? 'ANFITRIÓN (P1)' : 'INVITADO (P2)'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Parrilla de salida oficial · 2 Coches en pista</p>
              </div>
            </div>

            <button
              onClick={onLeaveRoom}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Room ID Bar */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex flex-col text-center sm:text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  CÓDIGO DE SALA PRIVADA
                </span>
                <span className="text-2xl font-black font-mono tracking-widest text-amber-400 mt-0.5">
                  {roomState.code}
                </span>
              </div>

              <button
                onClick={handleCopyCode}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? '¡CÓDIGO COPIADO!' : 'COPIAR ID DE SALA'}</span>
              </button>
            </div>

            {/* Players Status (P1 & P2 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Player 1 (Host - Pole Position) */}
              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Flag className="w-3 h-3" /> POLE POSITION · JUGADOR 1
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    LISTO
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mt-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                    1
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-sm text-white truncate">
                      {p1?.name || 'Anfitrión'}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">
                      Coche: {car1Name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Player 2 (Guest - 2nd Grid Box) */}
              <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Flag className="w-3 h-3" /> 2ª POSICIÓN · JUGADOR 2
                  </span>
                  {p2 ? (
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${p2.isReady ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'}`}>
                      {p2.isReady ? 'LISTO' : 'ESPERANDO...'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-white/5 text-[10px] font-bold animate-pulse">
                      ESPERANDO RIVAL...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-1">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-sm">
                    2
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold text-sm text-white truncate">
                      {p2 ? p2.name : 'Esperando a que tu amigo se una...'}
                    </span>
                    <span className="text-[11px] text-neutral-400 truncate">
                      {p2 ? `Coche: ${car2Name}` : 'Comparte el código de sala arriba'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Exclusive Configuration Panel: 3D Models & Laps */}
            {isHost && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-amber-300 uppercase tracking-wider">
                      CONFIGURACIÓN EXCLUSIVA DEL ANFITRIÓN
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">Solo tú puedes modificar esto</span>
                </div>

                {/* 3D Model Loaders (Car 1, Car 2, Pit Crew) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onOpenModelUpload('car1')}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex flex-col items-start gap-1 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">COCHE J1 (TUYO)</span>
                      <Upload className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">{car1Name}</span>
                    <span className="text-[9px] text-neutral-400">Toca para cambiar modelo</span>
                  </button>

                  <button
                    onClick={() => onOpenModelUpload('car2')}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex flex-col items-start gap-1 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">COCHE J2 (RIVAL)</span>
                      <Upload className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">{car2Name}</span>
                    <span className="text-[9px] text-neutral-400">Toca para cambiar modelo</span>
                  </button>

                  <button
                    onClick={() => onOpenModelUpload('crew')}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex flex-col items-start gap-1 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">MECÁNICOS (BOXES)</span>
                      <Upload className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span className="text-xs font-bold text-white truncate w-full">{crewName}</span>
                    <span className="text-[9px] text-neutral-400">Toca para cambiar modelo</span>
                  </button>
                </div>

                {/* Laps Selector */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                    Número de Vueltas de Carrera:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 3, 5, 10, 20].map((lap) => (
                      <button
                        key={lap}
                        onClick={() => setSelectedLaps(lap)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all ${
                          selectedLaps === lap
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-900/40'
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-white/5'
                        }`}
                      >
                        {lap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Individual Preferences: Camera Mode */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  Tu Distancia de Cámara Preferida:
                </span>
                <span className="text-[10px] text-neutral-400">Puedes cambiarla en cualquier momento</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['near', 'medium', 'far'] as CameraDistanceMode[]).map((dist) => (
                  <button
                    key={dist}
                    onClick={() => setCameraDistance(dist)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      cameraDistance === dist
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-white/5'
                    }`}
                  >
                    {dist === 'near' ? 'Cerca' : dist === 'medium' ? 'Media (Recomendada)' : 'Lejos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest Ready Button or Host Start Race Button */}
            {isGuest ? (
              <button
                onClick={handleToggleReady}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] ${
                  isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
                }`}
              >
                {isReady ? <UserCheck className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isReady ? '¡ESTÁS LISTO! (ESPERANDO AL ANFITRIÓN)' : 'MARCAR COMO LISTO'}</span>
              </button>
            ) : (
              <button
                onClick={onStartMultiplayerRace}
                disabled={!canStart}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.99] ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white shadow-amber-950/60 cursor-pointer animate-pulse'
                    : 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {!p2
                    ? 'ESPERANDO A QUE SE UNA EL JUGADOR 2...'
                    : !p2.isReady
                    ? 'ESPERANDO A QUE EL JUGADOR 2 MARQUE LISTO...'
                    : '¡INICIAR CARRERA 1 VS 1!'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 2. HOME SELECTION VIEW ---
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto select-none animate-fade-in">
      <div className="bg-neutral-900/95 border border-white/15 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col my-auto">
        
        {/* Banner Header */}
        <div className="relative px-6 py-6 sm:py-8 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-900 border-b border-white/10 text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 border border-amber-400/40 flex items-center justify-center text-white shadow-lg shadow-amber-950/50">
            <Gamepad2 className="w-9 h-9" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                APEX GT RACING
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                PRO 1v1
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Simulador de carreras 3D ultrarrealista · Salas Privadas · Semáforo FIA y Parrilla 1v1
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          {/* Pilot Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Nombre de tu Piloto:
            </label>
            <input
              type="text"
              value={playerName}
              maxLength={20}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Introduce tu nombre o apodo"
              className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-white/15 text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Camera Preference */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Cámara Inicial:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['near', 'medium', 'far'] as CameraDistanceMode[]).map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setCameraDistance(dist)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold capitalize transition-all ${
                    cameraDistance === dist
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-950/50'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-white/10'
                  }`}
                >
                  {dist === 'near' ? 'Cerca' : dist === 'medium' ? 'Media' : 'Lejos'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-white/10 my-1" />

          {/* GRAND PRIX CAREER MODE CONFIGURATION */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-emerald-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-emerald-400" />
                MODO CARRERA F1 (5 COCHES EN PISTA):
              </span>
            </div>

            {/* 1. Laps Selector (9, 20, 50) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Distancia de Carrera:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {( [9, 20, 50] as RaceLapOption[] ).map((laps) => (
                  <button
                    key={laps}
                    type="button"
                    onClick={() => setCareerLaps(laps)}
                    className={`py-2 rounded-xl text-xs font-black font-mono transition-all border ${
                      careerLaps === laps
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/80'
                        : 'bg-neutral-900 text-neutral-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {laps === 9 ? '9 Vueltas (Sprint)' : laps === 20 ? '20 Vueltas (GP)' : '50 Vueltas (Endurance)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Difficulty Selector (Easy, Medium, Hard) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Dificultad de la IA:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {( ['easy', 'medium', 'hard'] as RaceDifficulty[] ).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      difficulty === diff
                        ? diff === 'easy'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-black'
                          : diff === 'medium'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-black'
                          : 'bg-red-500/25 border-red-400 text-red-300 font-black'
                        : 'bg-neutral-900 text-neutral-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {diff === 'easy' ? '🟢 Fácil' : diff === 'medium' ? '🟡 Medio' : '🔴 Difícil (F1 Elite)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Starting Compound Selector (Soft, Medium, Hard) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Compuesto de Salida Elegido:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {( ['soft', 'medium', 'hard'] as TireCompoundType[] ).map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setStartingCompound(comp)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                      startingCompound === comp
                        ? comp === 'soft'
                          ? 'bg-red-600 text-white border-red-400 font-black'
                          : comp === 'medium'
                          ? 'bg-amber-500 text-neutral-950 border-amber-300 font-black'
                          : 'bg-neutral-100 text-neutral-950 border-white font-black'
                        : 'bg-neutral-900 text-neutral-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: comp === 'soft' ? '#ef4444' : comp === 'medium' ? '#eab308' : '#f8fafc',
                      }}
                    />
                    <span className="capitalize">{comp === 'soft' ? 'Blando (C3)' : comp === 'medium' ? 'Medio (C2)' : 'Duro (C1)'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mandatory 2-Compound Rule Banner for 20 & 50 Lap Races */}
            {careerLaps >= 20 && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Reglamento FIA Obligatorio:</strong> En carreras de {careerLaps} vueltas debes realizar al menos 1 parada en boxes y usar <strong>dos compuestos distintos</strong> durante la carrera.
                </span>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-white/10 my-1" />

          {/* Mode 0: Free Practice / Time Trial (1 Solo Jugador) */}
          <button
            onClick={() => onStartFreePractice?.(cameraDistance, cameraMode, startingCompound)}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 hover:from-blue-600 hover:to-indigo-500 text-white font-black text-sm tracking-wide transition-all border border-blue-400/40 flex items-center justify-between group shadow-xl shadow-blue-950/60 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Gauge className="w-5 h-5 text-cyan-300 ml-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-sm text-white">🏎️ MODO 1 SOLO JUGADOR (VUELTAS LIBRES)</span>
                <span className="text-[11px] text-blue-100/90">
                  Pista vacía sin rivales · Practica trazadas, apuradas de frenada y récord de vuelta
                </span>
              </div>
            </div>
            <Award className="w-5 h-5 text-cyan-300" />
          </button>

          {/* Mode 1: Start Career Grand Prix Race */}
          <button
            onClick={() => onStartSolo(cameraDistance, cameraMode, careerLaps, difficulty, startingCompound)}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide transition-all border border-emerald-400/40 flex items-center justify-between group shadow-xl shadow-emerald-950/60 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-sm text-white">¡INICIAR GRAN PREMIO (5 COCHES)!</span>
                <span className="text-[11px] text-emerald-100/90">
                  {careerLaps} Vueltas · Dificultad {difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Media' : 'Máxima'} · Salida {startingCompound.toUpperCase()}
                </span>
              </div>
            </div>
            <Flag className="w-5 h-5 text-emerald-300" />
          </button>

          {/* Mode 2: Create Private Room (1 vs 1) */}
          <button
            onClick={handleCreateRoomSubmit}
            disabled={isConnecting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-amber-950/40 flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-sm text-white">CREAR SALA PRIVADA (1 VS 1)</span>
                <span className="text-[11px] text-amber-100/80">Genera un código, personaliza modelos 3D y compite contra tu amigo</span>
              </div>
            </div>
            {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          </button>

          {/* Mode 3: Join Private Room */}
          {activeView !== 'join_lobby' ? (
            <button
              onClick={() => setActiveView('join_lobby')}
              className="w-full py-3.5 px-6 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs tracking-wide transition-all border border-white/10 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>¿TIENES UN CÓDIGO DE SALA? UNIRSE A UNA SALA</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-cyan-500/40 flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  UNIRSE A SALA DE UN AMIGO:
                </span>
                <button
                  onClick={() => setActiveView('home')}
                  className="text-[11px] text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="PEGA EL CÓDIGO (EJ: APEX-824)"
                  className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 border border-white/15 text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleJoinRoomSubmit}
                  disabled={isConnecting || !joinCodeInput.trim()}
                  className={`px-5 py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 ${
                    joinCodeInput.trim()
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/50'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  <span>CONECTAR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
