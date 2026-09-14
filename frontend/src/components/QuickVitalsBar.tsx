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
      {/* 1. Chip Huyết áp (Blood Pressure) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-sm">
        <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
        <span>
          {systolic && diastolic ? `${systolic}/${diastolic}` : '--/--'} <span className="text-[10px] font-medium text-white/70">BP</span>
        </span>
      </div>

      {/* 2. Chip Đường huyết (Blood Sugar) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-sm">
        <Droplets className="w-3.5 h-3.5 text-sky-300 fill-sky-300" />
        <span>
          {bloodSugar ?? '--'} <span className="text-[10px] font-medium text-white/70">Sugar</span>
        </span>
      </div>

      {/* 3. Chip Nhịp tim (Heart Rate) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold whitespace-nowrap shadow-sm">
        <Activity className="w-3.5 h-3.5 text-emerald-300" />
        <span>
          {heartRate ?? '--'} <span className="text-[10px] font-medium text-white/70">BPM</span>
        </span>
      </div>

      {/* 4. Nút bấm ghi nhanh (+ Log) */}
      <button
        onClick={onOpenLogModal}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 active:scale-95 border border-white/30 text-white text-xs font-bold whitespace-nowrap shadow-sm transition-all ml-auto"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Log</span>
      </button>
    </div>
  );
}