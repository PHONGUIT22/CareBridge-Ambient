'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faDroplet,
  faXmark,
  faCheck,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { VitalRecord } from '../types';

interface LogVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vitals: Partial<VitalRecord>) => Promise<void>;
  currentVitals?: VitalRecord | null;
}

export function LogVitalsModal({
  isOpen,
  onClose,
  onSave,
  currentVitals,
}: LogVitalsModalProps) {
  const [systolic, setSystolic] = useState(
    currentVitals?.systolic ? String(currentVitals.systolic) : '124'
  );
  const [diastolic, setDiastolic] = useState(
    currentVitals?.diastolic ? String(currentVitals.diastolic) : '83'
  );
  const [bloodSugar, setBloodSugar] = useState(
    currentVitals?.bloodSugar ? String(currentVitals.bloodSugar) : '104.2'
  );
  const [heartRate, setHeartRate] = useState(
    currentVitals?.heartRate ? String(currentVitals.heartRate) : '73'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSave({
        systolic: systolic ? parseInt(systolic, 10) : undefined,
        diastolic: diastolic ? parseInt(diastolic, 10) : undefined,
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        heartRate: heartRate ? parseInt(heartRate, 10) : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#22273B] w-full max-w-md rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF725E]/15 text-[#FF725E] border border-[#FF725E]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,114,94,0.25)]">
              <FontAwesomeIcon icon={faHeartPulse} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Record Vitals Reading</h3>
              <p className="text-xs text-[#8A92A6] font-medium">Automatic AHA Classification & Logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#8A92A6] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#FF725E] uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs" />
                <span>Systolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="60"
                max="250"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181B2A] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF725E]/60 focus:ring-1 focus:ring-[#FF725E]/40 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#FF725E] uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs" />
                <span>Diastolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="40"
                max="160"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181B2A] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF725E]/60 focus:ring-1 focus:ring-[#FF725E]/40 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#4D8BFF] uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faDroplet} className="text-xs" />
                <span>Blood Sugar (mg/dL)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="500"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181B2A] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#4D8BFF]/60 focus:ring-1 focus:ring-[#4D8BFF]/40 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faBolt} className="text-xs" />
                <span>Heart Rate (BPM)</span>
              </label>
              <input
                type="number"
                min="30"
                max="200"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181B2A] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(255,114,94,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} className="text-sm font-black" />
            <span>{isSubmitting ? 'Recording Vitals...' : 'Save Vitals to SQLite WAL'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
