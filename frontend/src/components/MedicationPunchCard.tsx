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
    <div className="bg-[#1E2330] rounded-3xl p-5 text-white border border-white/[0.08] hover:border-[#FF5733]/40 transition-all">
      {/* HEADER: ICON, MEDICATION NAME & ACTIONS */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#151922] border border-white/[0.08] flex items-center justify-center text-[#FF5733] shrink-0">
            <FontAwesomeIcon icon={faCapsules} className="text-base" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base sm:text-lg text-white truncate tracking-tight">{medicineName}</h3>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {dosage} - Scheduled at {scheduledTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete prescription"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* PUNCH-CARD MATRIX: CORAL AND MUTED SLATE CELLS */}
      <div className="bg-[#151922] rounded-2xl p-3.5 border border-white/[0.08]">
        <div className="flex gap-2">
          {/* Day of week labels */}
          <div className="grid grid-rows-7 gap-1.5 text-xs font-mono font-medium text-slate-400 select-none pr-1">
            {dayLabels.map((d, i) => (
              <span key={i} className="h-4 sm:h-5 flex items-center justify-center">
                {d}
              </span>
            ))}
          </div>

          {/* Adherence square grid */}
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 flex-1">
            {cells.map((cell, idx) => {
              // 1. Taken dose: Coral Signal
              if (cell.status === 'taken') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-[#FF5733] transition-all"
                    title={`Taken: ${cell.dateStr}`}
                  />
                );
              }

              // 2. Today: Signal Coral border
              if (cell.status === 'today') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-[#FF5733]/20 border-2 border-[#FF5733]"
                    title="Scheduled for today"
                  />
                );
              }

              // 3. Missed dose: Muted slate with border
              if (cell.status === 'missed') {
                return (
                  <div
                    key={idx}
                    className="h-4 sm:h-5 rounded-[4px] bg-slate-800/80 border border-slate-700"
                    title={`Missed: ${cell.dateStr}`}
                  />
                );
              }

              // 4. Empty / past week: Muted dark
              return (
                <div
                  key={idx}
                  className="h-4 sm:h-5 rounded-[4px] bg-[#1E2330] border border-white/[0.04]"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER 3 METRICS: STREAK, COMPLETED, ADHERENCE */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.08] text-xs font-mono font-medium text-slate-300">
        <div className="flex items-center gap-1.5 text-amber-400 font-mono">
          <Flame className="w-4 h-4 fill-amber-400" />
          <span>{streakDays} day streak</span>
        </div>

        <span className="text-white/10">|</span>

        <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{completedDoses} completed</span>
        </div>

        <span className="text-white/10">|</span>

        <div className="flex items-center gap-1.5 text-white font-mono font-semibold">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <span>{adherenceRate}% adherence</span>
        </div>
      </div>
    </div>
  );
}