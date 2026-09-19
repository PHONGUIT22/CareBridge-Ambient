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
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22273B] border border-white/[0.08] text-white text-xs font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
        <Heart className="w-3.5 h-3.5 text-[#FF725E] fill-[#FF725E]/30" />
        <span>
          {systolic && diastolic ? `${systolic}/${diastolic}` : '--/--'} <span className="text-[10px] font-medium text-[#8A92A6]">BP</span>
        </span>
      </div>

      {/* 2. Chip Đường huyết (Blood Sugar) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22273B] border border-white/[0.08] text-white text-xs font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
        <Droplets className="w-3.5 h-3.5 text-[#4D8BFF] fill-[#4D8BFF]/30" />
        <span>
          {bloodSugar ?? '--'} <span className="text-[10px] font-medium text-[#8A92A6]">Sugar</span>
        </span>
      </div>

      {/* 3. Chip Nhịp tim (Heart Rate) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22273B] border border-white/[0.08] text-white text-xs font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
        <Activity className="w-3.5 h-3.5 text-emerald-400" />
        <span>
          {heartRate ?? '--'} <span className="text-[10px] font-medium text-[#8A92A6]">BPM</span>
        </span>
      </div>

      {/* 4. Nút bấm ghi nhanh (+ Log) */}
      <button
        onClick={onOpenLogModal}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 active:scale-95 text-white text-xs font-bold whitespace-nowrap shadow-[0_2px_10px_rgba(255,114,94,0.3)] transition-all ml-auto"
      >
        <Plus className="w-3.5 h-3.5 stroke-[3]" />
        <span>Log</span>
      </button>
    </div>
  );
}