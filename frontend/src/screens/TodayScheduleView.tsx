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
  faShieldHalved,
  faUser,
  faMoon,
  faCrown,
  faPlus,
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faClock,
  faHeartPulse,
  faDroplet,
  faBolt,
  faPencil,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import { GuardianSelector } from '../components/GuardianSelector';

interface TodayScheduleViewProps {
  onSwitchToDeskMode?: () => void;
  onOpenAddModal?: () => void;
  onOpenPaywall?: () => void;
  onDoseToggled?: () => void;
  onTriggerGuardianRefusal?: (medicineName: string) => void;
  refreshTrigger?: number;
  isPro?: boolean;
}

export function TodayScheduleView({
  onSwitchToDeskMode,
  onOpenAddModal,
  onOpenPaywall,
  onDoseToggled,
  onTriggerGuardianRefusal,
  refreshTrigger = 0,
  isPro = false,
}: TodayScheduleViewProps) {
  const {
    schedule,
    vitals,
    caregiverName,
    toggleDoseStatus,
    saveNote,
    recordVitals,
    refetch,
  } = useMedicines();

  const [activeNoteItem, setActiveNoteItem] = useState<MedicineCardItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(3); // Default to Friday 11

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

  // 5-day calendar selector strip items (matches image/3.png & image/6.png)
  const calendarDays = [
    { dayNumber: 8, weekday: 'TUE' },
    { dayNumber: 9, weekday: 'WED' },
    { dayNumber: 10, weekday: 'THU' },
    { dayNumber: 11, weekday: 'FRI' },
    { dayNumber: 12, weekday: 'SAT' },
    { dayNumber: 13, weekday: 'SUN' },
  ];

  // SVG Gauge calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calculatedAdherence / 100) * circumference;

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-900 p-4 sm:p-5 font-sans select-none pb-28">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        {/* 1. TOP HEADER BAR (MATCHES image/3.png & image/6.png) */}
        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          {/* Left: CAREGIVER VIEW & Sarah Jenkins Pills */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-2xs">
              <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" />
              <span>CAREGIVER VIEW</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-2xs">
              <FontAwesomeIcon icon={faUser} className="text-[10px]" />
              <span>Sarah Jenkins</span>
            </span>
          </div>

          {/* Right: Desk, Pro Status, and Add Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToDeskMode}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title="Switch to Senior Bedside Nightstand Mode"
            >
              <FontAwesomeIcon icon={faMoon} className="text-xs text-sky-600" />
              <span>Desk</span>
            </button>

            {isPro ? (
              <button
                onClick={onOpenPaywall}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="CareBridge Pro Active"
              >
                <FontAwesomeIcon icon={faCrown} className="text-xs text-emerald-600" />
                <span>PRO ACTIVE</span>
              </button>
            ) : (
              <button
                onClick={onOpenPaywall}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Upgrade to CareBridge Pro"
              >
                <FontAwesomeIcon icon={faCrown} className="text-xs text-amber-600" />
                <span>UPGRADE PRO</span>
              </button>
            )}

            <button
              onClick={() => {
                if (!isPro && schedule.length >= 2) {
                  onOpenPaywall?.();
                  return;
                }
                if (onOpenAddModal) onOpenAddModal();
                else setIsAddModalOpen(true);
              }}
              className="w-8 h-8 rounded-xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 transition-all"
              title="Add new medication"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
            </button>
          </div>
        </div>

        {/* Dynamic Big Date Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Friday, Sep 11
        </h1>

        {/* 2. HERO COMPLIANCE GRADIENT CARD (MATCHES image/3.png & image/6.png) */}
        <div className="bg-gradient-to-br from-[#1E40AF] via-[#1E3A8A] to-[#2563EB] text-white rounded-[28px] p-5 sm:p-6 shadow-[0_10px_25px_rgba(30,58,138,0.22)] relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200 font-mono">
                  DAILY COMPLIANCE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Good Morning, Sarah
              </h2>
              <p className="text-xs sm:text-sm text-sky-100 mt-0.5 font-medium">
                {takenCount} of {totalCount} doses completed
              </p>
            </div>

            {/* Circular Progress Ring Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 72 72">
                {/* Background track circle */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Progress bar circle */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="#38BDF8"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base sm:text-lg font-extrabold text-white leading-none">
                  {calculatedAdherence}%
                </span>
                <span className="text-[8px] font-bold text-sky-200 tracking-wider mt-0.5">
                  ADHERENCE
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Vitals Row inside Hero Card */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-white/15 flex-wrap">
            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faHeartPulse} className="text-rose-300 text-xs" />
              <span>{vitals?.systolic ? `${vitals.systolic}/${vitals.diastolic}` : '123/82'} BP</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faDroplet} className="text-sky-300 text-xs" />
              <span>{vitals?.bloodSugar ?? '94.1'} Sugar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faBolt} className="text-emerald-300 text-xs" />
              <span>{vitals?.heartRate ?? '75'} BPM</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ml-auto cursor-pointer"
            >
              <FontAwesomeIcon icon={faPencil} className="text-[10px]" />
              <span>+ Log</span>
            </button>
          </div>
        </div>

        {/* 3. 5-DAY CALENDAR SELECTOR STRIP (MATCHES image/3.png & image/6.png) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              September 2026
            </h3>
            <button
              type="button"
              className="bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
              <span>View Calendar</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </button>

            <div className="flex-1 flex items-center justify-around gap-1.5">
              {calendarDays.map((item, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`rounded-2xl p-2 sm:p-2.5 w-12 sm:w-14 flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#1E3A8A] text-white shadow-md scale-105'
                        : 'bg-white border border-slate-200/80 text-slate-700 hover:border-blue-300 shadow-2xs'
                    }`}
                  >
                    <span className="text-base sm:text-lg font-bold leading-tight">
                      {item.dayNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wider mt-0.5 ${
                        isSelected ? 'text-sky-200' : 'text-slate-500'
                      }`}
                    >
                      {item.weekday}
                    </span>
                    <span
                      className={`text-[10px] font-black leading-none mt-1 ${
                        isSelected ? 'text-sky-300' : 'text-blue-900'
                      }`}
                    >
                      ••
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDayIndex((prev) => Math.min(calendarDays.length - 1, prev + 1))
              }
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </button>
          </div>
        </div>

        {/* FREE TIER NOTICE BANNER */}
        {!isPro && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCrown} className="text-amber-600 text-sm" />
              <span>
                <strong>Free Tier Active:</strong> Limited to 2 prescriptions ({schedule.length}/2 slots used).
              </span>
            </div>
            <button
              onClick={onOpenPaywall}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs shrink-0 transition-colors shadow-2xs"
            >
              Unlock Pro
            </button>
          </div>
        )}

        {/* ACTIVE HEALTH GUARDIAN BEHAVIORAL INTERVENTION SELECTOR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <GuardianSelector />
        </div>

        {/* 4. MEDICATION SCHEDULE LIST (MATCHES image/3.png & image/6.png) */}
        <div>
          <div className="flex items-center justify-between mt-2 mb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FontAwesomeIcon icon={faClock} className="text-[#1E3A8A] text-sm" />
              <span>08:00</span>
            </div>

            <button
              type="button"
              onClick={() => onTriggerGuardianRefusal?.('Amlodipine (Norvasc) 5mg')}
              className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Test Refusal: Engage active AI Guardian persuasion flow"
            >
              <span>🛡️ Test Refusal</span>
            </button>
          </div>

          {schedule.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 text-center text-slate-400 text-xs">
              No medications scheduled for today.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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

      {/* MODALS */}
      <DoseNoteModal
        isOpen={!!activeNoteItem}
        onClose={() => setActiveNoteItem(null)}
        onSave={handleSaveNote}
        medicineName={activeNoteItem?.name || ''}
        scheduledTime={activeNoteItem?.scheduledTime || ''}
        initialNote={activeNoteItem?.notes || ''}
      />

      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMedicine}
      />

      <LogVitalsModal
        isOpen={isVitalsModalOpen}
        onClose={() => setIsVitalsModalOpen(false)}
        onSave={handleSaveVitals}
        currentVitals={vitals}
      />
    </div>
  );
}