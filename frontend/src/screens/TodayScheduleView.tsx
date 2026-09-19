'use client';

import React, { useState, useEffect } from 'react';
import { MedicineCard, MedicineCardItem } from '../components/MedicineCard';
import { DoseNoteModal } from '../components/DoseNoteModal';
import { AddMedicineModal } from '../components/AddMedicineModal';
import { LogVitalsModal } from '../components/LogVitalsModal';
import { useMedicines } from '../hooks/useMedicines';
import { mcpClient } from '../services/mcpClient';
import { VitalsRecord } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCapsules,
  faShieldHalved,
  faMoon,
  faPlus,
  faBolt,
  faHeartPulse,
  faDroplet,
  faClock,
  faCrown,
} from '@fortawesome/free-solid-svg-icons';

interface TodayScheduleViewProps {
  onSwitchToDeskMode?: () => void;
  onOpenAddModal?: () => void;
  onOpenPaywall?: () => void;
  onDoseToggled?: () => void;
  refreshTrigger?: number;
}

export function TodayScheduleView({
  onSwitchToDeskMode,
  onOpenAddModal,
  onOpenPaywall,
  onDoseToggled,
  refreshTrigger = 0,
}: TodayScheduleViewProps) {
  const {
    schedule,
    vitals,
    caregiverName,
    adherenceRate,
    toggleDoseStatus,
    saveNote,
    recordVitals,
    refetch,
  } = useMedicines();

  const [activeNoteItem, setActiveNoteItem] = useState<MedicineCardItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  const handleSaveNote = async (noteText: string) => {
    if (!activeNoteItem) return;
    await saveNote(activeNoteItem.logId, noteText);
  };

  const handleAddMedicine = async (med: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => {
    try {
      await mcpClient.addMedicine(med);
      await refetch();
    } catch (e) {
      console.error('Failed to add medicine:', e);
    }
  };

  const handleSaveVitals = async (newVitals: Partial<VitalsRecord>) => {
    await recordVitals(newVitals);
  };

  const takenCount = schedule.filter((s) => s.status === 'taken').length;
  const totalCount = schedule.length || 1;
  const calculatedAdherence = Math.round((takenCount / totalCount) * 100);

  return (
    <div className="min-h-full text-white p-4 font-sans select-none pb-28">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        {/* 1. TOP HEADER: BRANDING & CAREGIVER BADGE */}
        <div className="flex items-center justify-between h-12 pt-1">
          <div className="flex items-center gap-3">
            {/* Tactile Hardware Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#FF5733] flex items-center justify-center text-white shadow-sm">
              <FontAwesomeIcon icon={faCapsules} className="text-sm" />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none">
                <span className="text-xs font-semibold tracking-wide text-white">
                  CareBridge Ambient
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 leading-none font-normal">
                <FontAwesomeIcon icon={faShieldHalved} className="text-slate-400 text-xs" />
                <span>Caregiver: {caregiverName}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToDeskMode}
              className="w-9 h-9 rounded-xl bg-[#1E2330] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white alexa-card-interactive flex items-center justify-center transition-colors shadow-sm"
              title="Switch to Bedside Desk Clock"
            >
              <FontAwesomeIcon icon={faMoon} className="text-xs" />
            </button>
            {onOpenPaywall && (
              <button
                onClick={onOpenPaywall}
                className="px-3 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-400/50 text-amber-300 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                title="CareBridge Pro Features"
              >
                <FontAwesomeIcon icon={faCrown} className="text-xs" />
                <span>Pro</span>
              </button>
            )}
            <button
              onClick={() => {
                if (onOpenAddModal) onOpenAddModal();
                else setIsAddModalOpen(true);
              }}
              className="px-3.5 h-9 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-medium text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              title="Add new medication regimen"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* 2. BIOMETRIC TELEMETRY CARDS */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <span>Biometric Telemetry</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVitalsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2330] hover:bg-[#252B3B] border border-white/[0.1] text-slate-200 text-xs font-medium transition-colors shadow-sm active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>Log Vitals</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Card 1: Blood Pressure */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group text-left cursor-pointer hover:border-white/15"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Blood Pressure
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-slate-300" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-white">
                  {vitals?.systolic && vitals?.diastolic
                    ? `${vitals.systolic}/${vitals.diastolic}`
                    : '122/82'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">mmHg</span>
              </div>
            </button>

            {/* Card 2: Blood Sugar */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group text-left cursor-pointer hover:border-white/15"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Blood Sugar
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <FontAwesomeIcon icon={faDroplet} className="text-xs text-slate-300" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-white">
                  {vitals?.bloodSugar ?? '106.8'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">mg/dL</span>
              </div>
            </button>

            {/* Card 3: Heart Rate */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group text-left cursor-pointer hover:border-white/15"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Heart Rate
                </span>
                <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-slate-300" />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline">
                <span className="text-2xl font-mono font-bold tabular-nums text-white">
                  {vitals?.heartRate ?? '71'}
                </span>
                <span className="text-xs font-mono text-slate-400 ml-1.5">BPM</span>
              </div>
            </button>
          </div>
        </div>

        {/* 3. TACTILE INDUSTRIAL PROGRESS BAR */}
        <div className="p-4 rounded-2xl bg-[#1E2330] border border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Today&apos;s progress
            </span>
            <span className="text-sm font-mono font-bold tabular-nums text-[#FF5733]">
              {adherenceRate !== undefined ? adherenceRate : calculatedAdherence}%
            </span>
          </div>

          <div className="h-2 w-full bg-white/[0.08] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#FF5733] rounded-full transition-all duration-500"
              style={{
                width: `${adherenceRate !== undefined ? adherenceRate : calculatedAdherence}%`,
              }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300 font-normal">
            <span>
              {takenCount} of {totalCount} doses completed
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {calculatedAdherence === 100 ? 'All doses completed' : `${totalCount - takenCount} remaining today`}
            </span>
          </div>
        </div>

        {/* 4. TODAY'S SCHEDULE (2-COLUMN RESPONSIVE GRID) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white tracking-[-0.01em] text-sm">
                Today&apos;s Schedule
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-[#151922] border border-white/[0.08] text-xs font-mono font-medium text-slate-300">
                {schedule.length} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium">
                {takenCount} taken
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#FF5733]/15 border border-[#FF5733]/30 text-[#FF5733] text-xs font-mono font-medium">
                {schedule.length - takenCount} pending
              </span>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="bg-[#1E2330] border border-white/[0.08] rounded-2xl p-6 text-center text-slate-400 text-xs">
              No medications scheduled for today.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[...schedule]
                .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                .map((item) => (
                  <MedicineCard
                    key={item.logId}
                    item={item}
                    onToggleStatus={async (logId, status) => {
                      await toggleDoseStatus(logId, status);
                      if (onDoseToggled) onDoseToggled();
                    }}
                    onOpenNoteModal={(selected) => setActiveNoteItem(selected)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL GHI CHÚ */}
      <DoseNoteModal
        isOpen={!!activeNoteItem}
        onClose={() => setActiveNoteItem(null)}
        onSave={handleSaveNote}
        medicineName={activeNoteItem?.name || ''}
        scheduledTime={activeNoteItem?.scheduledTime || ''}
        initialNote={activeNoteItem?.notes || ''}
      />

      {/* MODAL THÊM THUỐC MỚI */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMedicine}
      />

      {/* MODAL GHI CHỈ SỐ SINH TỒN (+ LOG) */}
      <LogVitalsModal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        onSave={handleSaveVitals}
        currentVitals={vitals}
      />
    </div>
  );
}