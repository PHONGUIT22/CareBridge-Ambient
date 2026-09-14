'use client';

import React from 'react';
import { Trash2, Check, Flame, TrendingUp } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules } from '@fortawesome/free-solid-svg-icons';

export interface PunchMatrixCell {
  dayIndex: number;
  weekIndex: number;
  dateStr: string;
  status: 'taken' | 'missed' | 'empty' | 'today';
}

interface MedicationPunchCardProps {
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  streakDays?: number;
  completedDoses?: number;
  adherenceRate?: number;
  matrixData?: PunchMatrixCell[];
  onDelete?: () => void;
}

export function MedicationPunchCard({
  medicineName,
  dosage,
  scheduledTime,
  streakDays = 0,
  completedDoses = 0,
  adherenceRate = 0,
  matrixData = [],
  onDelete,
}: MedicationPunchCardProps) {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weeksCount = 8;

  const cells: PunchMatrixCell[] =
    matrixData && matrixData.length > 0
      ? matrixData
      : Array.from({ length: 7 * weeksCount }, (_, idx) => ({
          dayIndex: idx % 7,
          weekIndex: Math.floor(idx / 7),
          dateStr: '',
          status: 'empty' as const,
        }));

  return (
    <div className="bg-[#131F2C] rounded-3xl p-5 text-white border border-white/5 shadow-xl hover:border-cyan-500/30 transition-all">
      {/* HEADER: ICON, TÊN THUỐC & ACTIONS */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#0B131B] border border-cyan-500/30 flex items-center justify-center text-[#00CAFF] shadow-[0_0_12px_rgba(0,202,255,0.25)] shrink-0">
            <FontAwesomeIcon icon={faCapsules} className="text-base" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base sm:text-lg text-white truncate">{medicineName}</h3>
            <p className="text-xs text-slate-400 font-medium">
              {dosage} • Scheduled at {scheduledTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Xoá đơn thuốc"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-[#00CAFF]/20 text-[#00CAFF] flex items-center justify-center border border-[#00CAFF]/40">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* MA TRẬN PUNCH-CARD: CÁC Ô NEON CYAN VÀ XÁM TRẦM */}
      <div className="bg-[#0B131B] rounded-2xl p-3.5 border border-white/5 shadow-inner">
        <div className="flex gap-2">
          {/* Nhãn thứ trong tuần */}
          <div className="grid grid-rows-7 gap-1.5 text-[10px] font-bold text-slate-500 select-none pr-1">
            {dayLabels.map((d, i) => (
              <span key={i} className="h-4 sm:h-5 flex items-center justify-center">
                {d}
              </span>
            ))}
          </div>

          {/* Lưới ô vuông tuân thủ */}
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 flex-1">
            {cells.map((cell, idx) => {
              // 1. Ô đã uống: Neon Cyan phát sáng rực rỡ
              if (cell.status === 'taken') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-[#00CAFF] shadow-[0_0_8px_rgba(0,202,255,0.7)] transition-all"
                    title={`Đã uống: ${cell.dateStr}`}
                  />
                );
              }

              // 2. Ô hôm nay: Viền vàng hổ phách nhấp nháy
              if (cell.status === 'today') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-[#F59E0B]/20 border-2 border-[#F59E0B] shadow-[0_0_12px_#F59E0B] animate-pulse"
                    title="Cữ thuốc hôm nay"
                  />
                );
              }

              // 3. Ô bị lỡ (missed): Xám trầm có viền
              if (cell.status === 'missed') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-slate-800/80 border border-slate-700"
                    title={`Chưa uống: ${cell.dateStr}`}
                  />
                );
              }

              // 4. Ô trống / tuần cũ: Mờ tối
              return (
                <div
                  key={idx}
                  className="h-4 sm:h-5 rounded-[4px] bg-slate-900/60 border border-white/5"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER 3 CHỈ SỐ: STREAK, COMPLETED, ADHERENCE */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-1.5 text-[#F59E0B]">
          <Flame className="w-4 h-4 fill-[#F59E0B]" />
          <span>{streakDays} Day Streak</span>
        </div>

        <span className="text-white/10">|</span>

        <div className="flex items-center gap-1.5 text-[#10B981]">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{completedDoses} Completed</span>
        </div>

        <span className="text-white/10">|</span>

        <div className="flex items-center gap-1.5 text-[#00CAFF]">
          <TrendingUp className="w-4 h-4" />
          <span>{adherenceRate}% Adherence</span>
        </div>
      </div>
    </div>
  );
}