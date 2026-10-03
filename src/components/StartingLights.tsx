/**
 * StartingLights.tsx
 * Authentic FIA 5-Red-Light Starting Gantry for Grand Prix & 1v1 Race Starts
 */

import React, { useEffect, useState, useRef } from 'react';

interface StartingLightsProps {
  isActive: boolean;
  onLightsOut: () => void;
  playAudioBeep?: (isHighPitch: boolean) => void;
}

export const StartingLights: React.FC<StartingLightsProps> = ({
  isActive,
  onLightsOut,
  playAudioBeep,
}) => {
  const [litCount, setLitCount] = useState<number>(0);
  const [isLightsOut, setIsLightsOut] = useState<boolean>(false);
  const hasTriggeredLightsOut = useRef(false);

  // Store callbacks in refs to avoid re-triggering effect on parent re-renders (15Hz telemetry)
  const onLightsOutRef = useRef(onLightsOut);
  onLightsOutRef.current = onLightsOut;
  const playAudioBeepRef = useRef(playAudioBeep);
  playAudioBeepRef.current = playAudioBeep;

  useEffect(() => {
    if (!isActive) {
      setLitCount(0);
      setIsLightsOut(false);
      hasTriggeredLightsOut.current = false;
      return;
    }

    setLitCount(0);
    setIsLightsOut(false);
    hasTriggeredLightsOut.current = false;

    // Progression of 5 red lights: 1 per second
    const t1 = setTimeout(() => {
      setLitCount(1);
      if (playAudioBeepRef.current) playAudioBeepRef.current(false);
    }, 1000);

    const t2 = setTimeout(() => {
      setLitCount(2);
      if (playAudioBeepRef.current) playAudioBeepRef.current(false);
    }, 2000);

    const t3 = setTimeout(() => {
      setLitCount(3);
      if (playAudioBeepRef.current) playAudioBeepRef.current(false);
    }, 3000);

    const t4 = setTimeout(() => {
      setLitCount(4);
      if (playAudioBeepRef.current) playAudioBeepRef.current(false);
    }, 4000);

    const t5 = setTimeout(() => {
      setLitCount(5);
      if (playAudioBeepRef.current) playAudioBeepRef.current(false);
    }, 5000);

    // Random lights-out delay between 1.0s and 2.2s after 5th light
    const randomDelay = 5000 + 1000 + Math.random() * 1200;
    const tOut = setTimeout(() => {
      setLitCount(0);
      setIsLightsOut(true);
      if (playAudioBeepRef.current) playAudioBeepRef.current(true);
      if (!hasTriggeredLightsOut.current) {
        hasTriggeredLightsOut.current = true;
        onLightsOutRef.current();
      }
    }, randomDelay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(tOut);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none select-none animate-fade-in">
      {/* Gantry Housing */}
      <div className="bg-neutral-950/95 border-2 border-neutral-700/80 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3">
        <div className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
          PROCEDIMIENTO DE SALIDA FIA · GP
        </div>

        {/* 5 Light Columns */}
        <div className="flex items-center gap-3.5 bg-neutral-900/90 border border-white/10 rounded-xl px-4 py-3 shadow-inner">
          {[0, 1, 2, 3, 4].map((index) => {
            const isLit = litCount > index;
            return (
              <div
                key={index}
                className="flex flex-col items-center gap-2 bg-neutral-950 p-2 rounded-lg border border-white/5"
              >
                {/* Upper Red Light */}
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-75 ${
                    isLit
                      ? 'bg-red-600 border-red-400 shadow-[0_0_22px_#ef4444] animate-pulse'
                      : 'bg-neutral-900/80 border-neutral-800'
                  }`}
                />
                {/* Lower Red Light */}
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-75 ${
                    isLit
                      ? 'bg-red-600 border-red-400 shadow-[0_0_22px_#ef4444] animate-pulse'
                      : 'bg-neutral-900/80 border-neutral-800'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="text-center">
          {isLightsOut ? (
            <span className="text-emerald-400 font-black text-lg sm:text-xl font-mono tracking-wider animate-bounce">
              ¡¡LUCES FUERA! ¡¡ACELERA!!
            </span>
          ) : litCount === 5 ? (
            <span className="text-amber-400 font-black text-xs font-mono tracking-wider animate-pulse">
              PREPÁRATE PARA LA SALIDA...
            </span>
          ) : (
            <span className="text-neutral-300 font-bold text-xs font-mono tracking-wider">
              FORMANDO PARRILLA ({litCount}/5)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
