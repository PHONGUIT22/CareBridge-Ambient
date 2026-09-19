'use client';

import React from 'react';

interface AlexaAmbientGlowProps {
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  className?: string;
  showStatusBadge?: boolean;
}

/**
 * AlexaAmbientGlow - Signature Echo Show 10 Hardware Light Bar
 * Recreates the physical Alexa Cyan (#00CAFF) -> Deep Blue (#0070F3) glowing light bar
 * and upward diffused ambient aura along the bottom edge of the Echo Show smart display.
 */
export function AlexaAmbientGlow({
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  transcript = '',
  className = '',
  showStatusBadge = true,
}: AlexaAmbientGlowProps) {
  const isActive = isListening || isThinking || isSpeaking;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 pointer-events-none z-30 transition-all duration-500 ease-out overflow-hidden ${
        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      } ${className}`}
      aria-hidden={!isActive}
    >
      {/* 1. UPWARD DIFFUSED AMBIENT AURA (Light Plume reflecting off display glass) */}
      <div className="w-full h-14 alexa-aura-plume pointer-events-none opacity-80" />

      {/* 2. CONTEXTUAL STATUS PILL (Subtle hardware HUD indicator) */}
      {showStatusBadge && isActive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-[#151922]/90 border border-[#00CAFF]/40 backdrop-blur-md shadow-[0_0_16px_rgba(0,202,255,0.3)] transition-all animate-fadeIn">
          {/* Pulsing Alexa Cyan Dot */}
          <span
            className={`w-2 h-2 rounded-full ${
              isListening
                ? 'bg-[#00CAFF] animate-ping'
                : isThinking
                ? 'bg-[#4D8BFF] animate-spin'
                : 'bg-[#00F5FF] animate-pulse'
            }`}
          />
          <span className="text-[11px] font-mono font-medium text-cyan-200 tracking-tight whitespace-nowrap">
            {isListening
              ? transcript
                ? `"${transcript}"`
                : 'Alexa listening...'
              : isThinking
              ? 'Analyzing with Claude Bedrock...'
              : 'Alexa speaking (AWS Polly)...'}
          </span>
        </div>
      )}

      {/* 3. CENTER DYNAMIC FOCAL WAVE PIP (Intake wave effect when hearing voice) */}
      {isListening && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/95 rounded-full shadow-[0_0_14px_#00CAFF,0_0_24px_#00F5FF] z-10 animate-pulse" />
      )}

      {/* 4. TRAVELING LASER SHIMMER BEAM (Sweeps across the light bar when thinking) */}
      {isThinking && (
        <div className="absolute bottom-0 left-0 right-0 h-[4px] alexa-traveling-beam z-10" />
      )}

      {/* 5. RAZOR-SHARP CORE LIGHT BAR (Flush along bottom edge of Echo Show bezel) */}
      <div className="w-full h-[3.5px] alexa-lightbar" />
    </div>
  );
}
