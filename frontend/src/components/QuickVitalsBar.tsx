'use client';

import React from 'react';
import { Heart, Droplets, Activity, Plus } from 'lucide-react';

interface QuickVitalsBarProps {
  systolic?: number | null;
  diastolic?: number | null;
  bloodSugar?: number | null;
  heartRate?: number | null;
  onOpenLogModal: () => void;
}

export function QuickVitalsBar({
  systolic = 123,
  diastolic = 82,
  bloodSugar = 94.1,
  heartRate = 75,
  onOpenLogModal,
}: QuickVitalsBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {/* 1. Blood Pressure Chip */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2330] border border-white/[0.08] text-white text-xs whitespace-nowrap">
        <Heart className="w-3.5 h-3.5 text-[#FF5733] fill-[#FF5733]/20" />
        <span className="font-mono tabular-nums font-bold">
          {systolic && diastolic ? `${systolic}/${diastolic}` : '--/--'} <span className="text-xs font-mono font-normal text-slate-400">BP</span>
        </span>
      </div>

      {/* 2. Blood Sugar Chip */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2330] border border-white/[0.08] text-white text-xs whitespace-nowrap">
        <Droplets className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-mono tabular-nums font-bold">
          {bloodSugar ?? '--'} <span className="text-xs font-mono font-normal text-slate-400">Sugar</span>
        </span>
      </div>

      {/* 3. Heart Rate Chip */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2330] border border-white/[0.08] text-white text-xs whitespace-nowrap">
        <Activity className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-mono tabular-nums font-bold">
          {heartRate ?? '--'} <span className="text-xs font-mono font-normal text-slate-400">BPM</span>
        </span>
      </div>

      {/* 4. Bee Wearable AI Synced Badge (Track Bee Alignment) */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] whitespace-nowrap cursor-pointer hover:bg-amber-500/20 transition-colors shadow-2xs group relative"
        title="Biometric telemetry synced via Wearable Sensor / Bee CLI Context & Apple Watch bridge"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-semibold tracking-wide">Bee Synced</span>
        <span className="text-[10px] text-amber-200/70 hidden sm:inline">• Wearable AI</span>

        {/* Hover Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
          <div className="bg-slate-900 text-amber-200 text-[10px] font-medium py-1 px-2.5 rounded-lg border border-amber-500/40 shadow-xl whitespace-nowrap">
            Vitals synced via Wearable Sensor / Bee CLI Context
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-amber-500/40 transform rotate-45 -mt-1" />
        </div>
      </div>

      {/* 5. Quick Log Action (+ Log) */}
      <button
        onClick={onOpenLogModal}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] active:scale-95 text-white text-xs font-semibold whitespace-nowrap transition-all ml-auto shadow-md"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Log</span>
      </button>
    </div>
  );
}