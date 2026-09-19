'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  // Nhóm phác đồ cữ thuốc theo từng khung giờ (Grouped by hour)
  const groupedSchedule = useMemo(() => {
    const groups: Record<string, MedicineCardItem[]> = {};
    const sorted = [...schedule].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    sorted.forEach((item) => {
      const timeKey = item.scheduledTime;
      if (!groups[timeKey]) {
        groups[timeKey] = [];
      }
      groups[timeKey].push(item);
    });

    return groups;
  }, [schedule]);

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
        {/* 1. TOP HEADER: ALEXA BRANDING & CAREGIVER BADGE */}
        <div className="flex items-center justify-between h-12 pt-1">
          <div className="flex items-center gap-3">
            {/* Smart Home Logo Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF725E] to-[#FF8A71] flex items-center justify-center shadow-[0_0_15px_rgba(255,114,94,0.35)]">
                <FontAwesomeIcon icon={faCapsules} className="text-white text-sm" />
              </div>
              <div className="absolute -bottom-1 w-6 h-1 rounded-full bg-[#FF725E] shadow-[0_0_8px_#FF725E]" />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-black tracking-wider text-white uppercase">
                  CareBridge Ambient
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[#8A92A6] flex items-center gap-1.5 mt-1 leading-none font-medium">
                <FontAwesomeIcon icon={faShieldHalved} className="text-[#4D8BFF] text-xs" />
                <span>Caregiver: {caregiverName}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToDeskMode}
              className="w-9 h-9 rounded-xl bg-[#22273B] border border-white/[0.06] hover:border-[#FF725E]/40 text-[#8A92A6] hover:text-white alexa-card-interactive flex items-center justify-center shadow-sm"
              title="Chuyển sang Chế độ Đồng hồ Đầu giường"
            >
              <FontAwesomeIcon icon={faMoon} className="text-xs" />
            </button>
            {onOpenPaywall && (
              <button
                onClick={onOpenPaywall}
                className="px-2.5 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
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
              className="px-3 h-9 rounded-xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-90 text-white font-bold shadow-[0_4px_15px_rgba(255,114,94,0.35)] active:scale-95 transition-all flex items-center gap-1.5 text-xs"
              title="Thêm thuốc mới vào phác đồ"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs font-black" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* 2. CONNECTED BIOMETRICS: 3 SQUIRCLE BADGES BINDED TO REAL VITALS + LOG BUTTON */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold tracking-widest text-[#8A92A6] uppercase flex items-center gap-1.5">
              <FontAwesomeIcon icon={faBolt} className="text-xs text-[#FF725E]" />
              <span>Connected Biometrics</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVitalsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22273B] hover:bg-[#2A3048] border border-[#4D8BFF]/40 text-[#4D8BFF] text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                <span>Log Vitals</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Card 1: Blood Pressure */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#22273B] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group relative overflow-hidden text-left cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:border-white/[0.15]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A92A6]">
                  Blood Pressure
                </span>
                <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.35)] group-hover:scale-105 transition-transform">
                  <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-rose-400" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-white tracking-tight">
                  {vitals?.systolic && vitals?.diastolic
                    ? `${vitals.systolic}/${vitals.diastolic}`
                    : '122/82'}
                </span>
                <span className="text-[10px] text-[#8A92A6] ml-1 font-medium">mmHg</span>
              </div>
            </button>

            {/* Card 2: Blood Sugar */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#22273B] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group relative overflow-hidden text-left cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:border-white/[0.15]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A92A6]">
                  Blood Sugar
                </span>
                <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform">
                  <FontAwesomeIcon icon={faDroplet} className="text-xs text-sky-400" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-white tracking-tight">
                  {vitals?.bloodSugar ?? '106.8'}
                </span>
                <span className="text-[10px] text-[#8A92A6] ml-1 font-medium">mg/dL</span>
              </div>
            </button>

            {/* Card 3: Heart Rate */}
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-[#22273B] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col justify-between alexa-card-interactive group relative overflow-hidden text-left cursor-pointer shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:border-white/[0.15]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A92A6]">
                  Heart Rate
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform">
                  <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-amber-400" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl font-black text-white tracking-tight">
                  {vitals?.heartRate ?? '71'}
                </span>
                <span className="text-[10px] text-[#8A92A6] ml-1 font-medium">BPM</span>
              </div>
            </button>
          </div>
        </div>

        {/* 3. HERO COMPLIANCE BAR */}
        <div className="p-4 rounded-2xl bg-[#22273B] border border-white/[0.08] shadow-[0_10px_25px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-extrabold text-[#8A92A6] tracking-wider uppercase">
              Today's Regimen Progress
            </span>
            <span className="font-display text-sm font-black text-[#FF725E]">
              {adherenceRate !== undefined ? adherenceRate : calculatedAdherence}%
            </span>
          </div>

          <div className="h-2 w-full bg-[#181B2A] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-[#4D8BFF] to-[#FF725E] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,114,94,0.3)]"
              style={{
                width: `${adherenceRate !== undefined ? adherenceRate : calculatedAdherence}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-[#8A92A6] font-medium">
            <span>
              {takenCount} of {totalCount} Doses Completed
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {calculatedAdherence === 100 ? 'All doses completed' : `${totalCount - takenCount} remaining today`}
            </span>
          </div>
        </div>

        {/* 4. SCHEDULED REGIMENS GROUPED BY HOUR */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold text-white tracking-wide">
              Scheduled Regimens
            </h3>
            <span className="text-xs text-[#8A92A6] font-medium">Grouped by Hour</span>
          </div>

          {Object.keys(groupedSchedule).length === 0 ? (
            <div className="bg-[#22273B] border border-white/[0.06] rounded-2xl p-6 text-center text-[#8A92A6] text-xs shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
              No medications scheduled for today.
            </div>
          ) : (
            Object.entries(groupedSchedule).map(([hour, items]) => (
              <div key={hour} className="flex flex-col gap-2">
                {/* Hour Header */}
                <div className="flex items-center gap-2 text-xs font-bold text-[#8A92A6] uppercase tracking-wider pl-1">
                  <FontAwesomeIcon icon={faClock} className="text-[#FF725E] text-[10px]" />
                  <span>Scheduled for {hour}</span>
                </div>

                {/* Grid of cards for this hour */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {items.map((item) => (
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
              </div>
            ))
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