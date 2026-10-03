/**
 * PauseMenu.tsx - High-End Racing Game Pause Menu
 * Clean, uncluttered UI housing camera distance selection, 3D F1 model importer,
 * vehicle repair & reset, audio preferences, and display controls.
 */

import React from 'react';
import { Play, Camera, Upload, Wrench, RotateCcw, Volume2, VolumeX, Maximize, X, Disc, AlertTriangle } from 'lucide-react';
import { CameraDistanceMode, CameraViewMode, GameTelemetry } from '../game/RacingGameEngine';
import { TIRE_COMPOUNDS, TireCompoundType } from '../game/physics/TireCompound';

interface PauseMenuProps {
  isOpen: boolean;
  telemetry: GameTelemetry;
  onResume: () => void;
  onSelectCameraDistance: (dist: CameraDistanceMode) => void;
  onSelectCameraMode: (mode: CameraViewMode) => void;
  onOpenCarUpload: () => void;
  onOpenCrewUpload: () => void;
  onRepair: () => void;
  onReset: () => void;
  onToggleAudio: () => void;
  onChangeTireCompound?: (compound: TireCompoundType) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  telemetry,
  onResume,
  onSelectCameraDistance,
  onSelectCameraMode,
  onOpenCarUpload,
  onOpenCrewUpload,
  onRepair,
  onReset,
  onToggleAudio,
  onChangeTireCompound,
}) => {
  if (!isOpen) return null;

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const distanceModes: { id: CameraDistanceMode; label: string }[] = [
    { id: 'near', label: 'Cerca' },
    { id: 'medium', label: 'Media' },
    { id: 'far', label: 'Lejos' },
  ];

  const cameraModes: { id: CameraViewMode; label: string; desc: string }[] = [
    { id: 'chase', label: 'Persecución', desc: 'Vista trasera dinámica' },
    { id: 'hood', label: 'Morro / Capó', desc: 'Vista frontal limpia' },
    { id: 'bumper', label: 'Alerón / Suelo', desc: 'Aero a ras de asfalto' },
    { id: 'orbit', label: 'Helicóptero TV', desc: 'Retransmisión aérea' },
  ];

  const currentCompound = TIRE_COMPOUNDS[telemetry.tireCompound] || TIRE_COMPOUNDS.soft;
  const wear = telemetry.tireWear || [0, 0, 0, 0];
  const punctures = telemetry.isPunctured || [false, false, false, false];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-neutral-900/95 border border-white/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-neutral-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
              ||
            </div>
            <div>
              <h2 className="font-black text-base text-white tracking-wider uppercase">JUEGO EN PAUSA</h2>
              <p className="text-[11px] text-neutral-400">Ajustes de cámara, vehículo y estrategia</p>
            </div>
          </div>
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors active:scale-95"
            title="Cerrar y reanudar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Resume Big Button */}
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>REANUDAR CARRERA</span>
          </button>

          {/* Section: Tire Strategy & Degradation */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                <Disc className="w-3.5 h-3.5" style={{ color: currentCompound.colorCss }} />
                ESTRATEGIA Y COMPUESTOS DE NEUMÁTICOS
              </span>
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${currentCompound.colorCss}22`,
                  borderColor: `${currentCompound.colorCss}66`,
                  color: currentCompound.colorCss,
                }}
              >
                {currentCompound.name}
              </span>
            </div>

            {/* Tire Compound Selector Buttons */}
            {onChangeTireCompound && (
              <div className="grid grid-cols-3 gap-2">
                {(['soft', 'medium', 'hard'] as TireCompoundType[]).map((cmp) => {
                  const cfg = TIRE_COMPOUNDS[cmp];
                  const isSelected = telemetry.tireCompound === cmp;
                  return (
                    <button
                      key={cmp}
                      onClick={() => onChangeTireCompound(cmp)}
                      className={`p-2 rounded-lg text-left transition-all border flex flex-col gap-0.5 ${
                        isSelected
                          ? 'border-white/50 shadow-md'
                          : 'bg-neutral-800/60 border-white/5 hover:bg-neutral-800'
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${cfg.colorCss}25` : undefined,
                        borderColor: isSelected ? cfg.colorCss : undefined,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.colorCss }} />
                        <span className="text-xs font-bold text-white">{cfg.name.split(' ')[0]}</span>
                      </div>
                      <span className="text-[9px] text-neutral-400 leading-tight">
                        {cmp === 'soft' ? 'Más rápido · 3-4 vueltas' : cmp === 'medium' ? 'Equilibrado · 7-9 vueltas' : 'Duradero · 15+ vueltas'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current 4-Wheel Wear Status */}
            <div className="grid grid-cols-4 gap-1.5 text-[8px] font-mono text-center pt-1 border-t border-white/5">
              <div className={`p-1 rounded ${punctures[0] ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-800/80 text-neutral-300'}`}>
                <div>DEL-IZQ</div>
                <div className="font-black font-sans">{punctures[0] ? 'PINCHADO' : `${Math.round(wear[0])}%`}</div>
              </div>
              <div className={`p-1 rounded ${punctures[1] ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-800/80 text-neutral-300'}`}>
                <div>DEL-DER</div>
                <div className="font-black font-sans">{punctures[1] ? 'PINCHADO' : `${Math.round(wear[1])}%`}</div>
              </div>
              <div className={`p-1 rounded ${punctures[2] ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-800/80 text-neutral-300'}`}>
                <div>TRA-IZQ</div>
                <div className="font-black font-sans">{punctures[2] ? 'PINCHADO' : `${Math.round(wear[2])}%`}</div>
              </div>
              <div className={`p-1 rounded ${punctures[3] ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-800/80 text-neutral-300'}`}>
                <div>TRA-DER</div>
                <div className="font-black font-sans">{punctures[3] ? 'PINCHADO' : `${Math.round(wear[3])}%`}</div>
              </div>
            </div>
          </div>

          {/* Section: Camera Settings */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                DISTANCIA DE CÁMARA (VISTA PERSECUCIÓN)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {distanceModes.map((dm) => {
                const isActive = telemetry.cameraDistance === dm.id && telemetry.cameraMode === 'chase';
                return (
                  <button
                    key={dm.id}
                    onClick={() => onSelectCameraDistance(dm.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                        : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-white/5'
                    }`}
                  >
                    {dm.label}
                  </button>
                );
              })}
            </div>

            {/* Camera Perspective Modes */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400">TIPO DE CÁMARA</span>
              <div className="grid grid-cols-2 gap-2">
                {cameraModes.map((cm) => {
                  const isActive = telemetry.cameraMode === cm.id;
                  return (
                    <button
                      key={cm.id}
                      onClick={() => onSelectCameraMode(cm.id)}
                      className={`p-2.5 rounded-lg text-left transition-all border ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                          : 'bg-neutral-800/60 border-white/5 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{cm.label}</div>
                      <div className="text-[10px] text-neutral-400 leading-tight">{cm.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Custom 3D Model Importers (Car & Pit Crew) */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onResume();
                onOpenCarUpload();
              }}
              className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700/90 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs tracking-wide flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-white font-bold">CARGAR FÓRMULA 1 / COCHE 3D</div>
                  <div className="text-[10px] text-neutral-400">Importa archivos .zip, .glb, .gltf u .obj</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-md text-emerald-300">
                {telemetry.isCustomCar ? 'Personalizado' : 'F1 Stock'}
              </span>
            </button>

            <button
              onClick={() => {
                onResume();
                onOpenCrewUpload();
              }}
              className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700/90 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs tracking-wide flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-white font-bold">CARGAR MECÁNICOS / PIT CREW 3D</div>
                  <div className="text-[10px] text-neutral-400">Importa archivos .zip, .glb, .gltf u .obj</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black bg-cyan-500/20 border border-cyan-500/30 px-2 py-1 rounded-md text-cyan-300">
                {telemetry.isCustomCrew ? 'Personalizado' : 'Pit Crew Stock'}
              </span>
            </button>
          </div>

          {/* Section: Quick Tools Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onRepair();
                onResume();
              }}
              className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-white/5 text-neutral-200 flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95"
            >
              <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Reparar Coche (100%)</span>
            </button>

            <button
              onClick={() => {
                onReset();
                onResume();
              }}
              className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-white/5 text-neutral-200 flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Reiniciar en Pista</span>
            </button>

            <button
              onClick={onToggleAudio}
              className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-white/5 text-neutral-200 flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95"
            >
              {telemetry.isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Sonido: Silenciado</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Sonido: Activado</span>
                </>
              )}
            </button>

            <button
              onClick={handleFullscreen}
              className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 border border-white/5 text-neutral-200 flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95"
            >
              <Maximize className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Pantalla Completa</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-neutral-950/80 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500">
          <span>{telemetry.carName}</span>
          <span>Pulsa ESC o P para pausar / reanudar</span>
        </div>
      </div>
    </div>
  );
};
