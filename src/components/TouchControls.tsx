/**
 * TouchControls.tsx - Ultra-Responsive Invisible Full-Zone Mobile Touch Controller
 * Features:
 * - 100% Invisible in resting state: preserves full-screen 3D immersion with zero visual clutter.
 * - Massive detection zones across the entire lower screen:
 *   * Left Half (0% to 50% width):
 *     - Outer Left (0% to 25% screen): Turns Left.
 *     - Inner Left (25% to 50% screen): Turns Right.
 *     - Smooth continuous sliding support via PointerMove.
 *   * Right Half (50% to 100% width):
 *     - Top Zone: Instant Drift / Handbrake.
 *     - Lower Right Zone: Full Throttle Gas Pedal.
 *     - Lower Left Zone: Heavy Brake / Reverse.
 * - Reactive Minimalist HUD:
 *   * When a zone is touched, a subtle, semi-transparent glowing symbol (35-45% opacity)
 *     appears instantaneously to confirm activation, and fades out cleanly upon release.
 * - Zero Input Latency: Uses pointer capture and multi-touch isolation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Zap, ShieldAlert, Gauge } from 'lucide-react';
import { CarInputs } from '../game/physics/VehiclePhysics';

interface TouchControlsProps {
  onInputChange: (inputs: Partial<CarInputs>) => void;
}

export const TouchControls = React.memo<TouchControlsProps>(({ onInputChange }) => {
  // Active states for visual feedback
  const [steerState, setSteerState] = useState<'left' | 'right' | 'none'>('none');
  const [isGasActive, setIsGasActive] = useState(false);
  const [isBrakeActive, setIsBrakeActive] = useState(false);
  const [isDriftActive, setIsDriftActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Active touch positions for local reactive feedback
  const [leftTouchPos, setLeftTouchPos] = useState<{ x: number; y: number } | null>(null);

  const leftZoneRef = useRef<HTMLDivElement>(null);
  const leftPointerIdRef = useRef<number | null>(null);
  const rightPointerMap = useRef<Map<number, 'gas' | 'brake' | 'drift'>>(new Map());

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Update steering input
  useEffect(() => {
    let steer = 0;
    if (steerState === 'left') steer = 1.0;   // Girar a la izquierda
    if (steerState === 'right') steer = -1.0; // Girar a la derecha
    onInputChange({ steering: steer });
  }, [steerState, onInputChange]);

  // Update throttle input
  useEffect(() => {
    onInputChange({ throttle: isGasActive ? 1.0 : 0.0 });
  }, [isGasActive, onInputChange]);

  // Update brake input
  useEffect(() => {
    onInputChange({ brake: isBrakeActive ? 1.0 : 0.0 });
  }, [isBrakeActive, onInputChange]);

  // Update handbrake input
  useEffect(() => {
    onInputChange({ handbrake: isDriftActive });
  }, [isDriftActive, onInputChange]);

  // --- LEFT STEERING ZONE HANDLERS (Sliding Multi-zone Detection) ---
  const handleLeftPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!leftZoneRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    leftPointerIdRef.current = e.pointerId;

    const rect = leftZoneRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const isLeft = relX < 0.5;

    setSteerState(isLeft ? 'left' : 'right');
    setLeftTouchPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleLeftPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current !== e.pointerId || !leftZoneRef.current) return;

    const rect = leftZoneRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const isLeft = relX < 0.5;

    setSteerState(isLeft ? 'left' : 'right');
    setLeftTouchPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleLeftPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      leftPointerIdRef.current = null;
      setSteerState('none');
      setLeftTouchPos(null);
    }
  }, []);

  // --- RIGHT ZONE SUB-PEDAL HANDLERS ---
  const bindRightPointer = (action: 'gas' | 'brake' | 'drift') => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      rightPointerMap.current.set(e.pointerId, action);
      if (action === 'gas') setIsGasActive(true);
      if (action === 'brake') setIsBrakeActive(true);
      if (action === 'drift') setIsDriftActive(true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      rightPointerMap.current.delete(e.pointerId);
      if (action === 'gas') setIsGasActive(false);
      if (action === 'brake') setIsBrakeActive(false);
      if (action === 'drift') setIsDriftActive(false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      rightPointerMap.current.delete(e.pointerId);
      if (action === 'gas') setIsGasActive(false);
      if (action === 'brake') setIsBrakeActive(false);
      if (action === 'drift') setIsDriftActive(false);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="absolute inset-x-0 bottom-0 h-[65vh] flex justify-between pointer-events-none select-none z-30 touch-none">
      {/* =========================================================================
          LEFT HALF: LARGE STEERING DETECTION ZONE (0% to 50% screen width)
          - Left Subzone: Gira a la izquierda
          - Right Subzone: Gira a la derecha
          - Fully invisible when idle; reveals subtle semi-transparent glowing symbol
         ========================================================================= */}
      <div
        ref={leftZoneRef}
        onPointerDown={handleLeftPointerDown}
        onPointerMove={handleLeftPointerMove}
        onPointerUp={handleLeftPointerUp}
        onPointerCancel={handleLeftPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="w-1/2 h-full pointer-events-auto relative touch-none select-none cursor-pointer flex items-center justify-center"
      >
        {/* Subtle Semi-Transparent Reactive Symbol for Left Turn */}
        <div
          className={`absolute left-4 sm:left-12 bottom-8 sm:bottom-12 flex flex-col items-center gap-1.5 transition-all duration-100 pointer-events-none ${
            steerState === 'left' ? 'opacity-50 scale-105' : 'opacity-0 scale-90'
          }`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.2)]">
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Izq</span>
        </div>

        {/* Subtle Semi-Transparent Reactive Symbol for Right Turn */}
        <div
          className={`absolute right-4 sm:right-12 bottom-8 sm:bottom-12 flex flex-col items-center gap-1.5 transition-all duration-100 pointer-events-none ${
            steerState === 'right' ? 'opacity-50 scale-105' : 'opacity-0 scale-90'
          }`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.2)]">
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Der</span>
        </div>

        {/* Dynamic touch ripple / marker following thumb */}
        {leftTouchPos && (
          <div
            className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/10 border border-white/25 pointer-events-none animate-ping opacity-35"
            style={{ left: leftTouchPos.x, top: leftTouchPos.y }}
          />
        )}
      </div>

      {/* Desktop Helper Notice */}
      {!isTouchDevice && (
        <div className="hidden lg:flex absolute bottom-2 left-1/2 -translate-x-1/2 items-center gap-3 text-[10px] text-neutral-400 bg-neutral-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 pointer-events-none z-10">
          <span>Teclado: <b>W/↑</b> Gas · <b>S/↓</b> Freno · <b>A/D</b> Dirección · <b>ESPACIO</b> Drift · <b>C</b> Cámara · <b>R</b> Reparar</span>
        </div>
      )}

      {/* =========================================================================
          RIGHT HALF: LARGE THROTTLE, BRAKE & DRIFT ZONES (50% to 100% screen width)
          - Top: Drift / Handbrake
          - Bottom-Right: Acelerador (Gas)
          - Bottom-Left: Freno / Marcha Atrás
          - Fully invisible when idle; reveals subtle semi-transparent glowing symbol
         ========================================================================= */}
      <div className="w-1/2 h-full pointer-events-auto relative flex flex-col justify-end touch-none select-none">
        {/* UPPER RIGHT ZONE: DRIFT / FRENO DE MANO */}
        <div
          {...bindRightPointer('drift')}
          className="w-full h-[38%] relative cursor-pointer flex items-center justify-center"
        >
          {/* Subtle Reactive Symbol for Drift */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 transition-all duration-100 pointer-events-none shadow-[0_0_24px_rgba(245,158,11,0.3)] ${
              isDriftActive ? 'opacity-60 scale-105' : 'opacity-0 scale-90'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-300" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">Drift</span>
          </div>
        </div>

        {/* LOWER RIGHT PEDALS: FRENO & ACELERADOR */}
        <div className="w-full h-[62%] flex">
          {/* FRENO / MARCHA ATRÁS ZONE */}
          <div
            {...bindRightPointer('brake')}
            className="w-1/2 h-full relative cursor-pointer flex items-end justify-center pb-8 sm:pb-12"
          >
            {/* Subtle Reactive Symbol for Brake */}
            <div
              className={`flex flex-col items-center gap-1.5 transition-all duration-100 pointer-events-none ${
                isBrakeActive ? 'opacity-55 scale-105' : 'opacity-0 scale-90'
              }`}
            >
              <div className="w-14 h-18 sm:w-18 sm:h-22 rounded-2xl bg-rose-500/20 backdrop-blur-md border border-rose-400/30 flex flex-col items-center justify-center gap-1 shadow-[0_0_24px_rgba(244,63,94,0.3)]">
                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-rose-300" />
                <span className="text-[9px] font-black uppercase tracking-wider text-rose-200">Freno</span>
              </div>
            </div>
          </div>

          {/* ACELERADOR / GAS ZONE */}
          <div
            {...bindRightPointer('gas')}
            className="w-1/2 h-full relative cursor-pointer flex items-end justify-center pb-8 sm:pb-12"
          >
            {/* Subtle Reactive Symbol for Gas */}
            <div
              className={`flex flex-col items-center gap-1.5 transition-all duration-100 pointer-events-none ${
                isGasActive ? 'opacity-55 scale-105' : 'opacity-0 scale-90'
              }`}
            >
              <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_28px_rgba(16,185,129,0.35)]">
                <Gauge className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Gas</span>
                <div className="w-6 h-1 bg-emerald-300/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
