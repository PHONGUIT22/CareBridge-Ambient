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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151922] text-[#FF5733] border border-[#FF5733]/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faHeartPulse} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Record vitals reading</h3>
              <p className="text-xs text-slate-400 font-normal">Automatic AHA classification and telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-[#FF5733]" />
                <span>Systolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="60"
                max="250"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs text-slate-400" />
                <span>Diastolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="40"
                max="160"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faDroplet} className="text-xs text-slate-400" />
                <span>Blood sugar (mg/dL)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="500"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faBolt} className="text-xs text-slate-400" />
                <span>Heart rate (BPM)</span>
              </label>
              <input
                type="number"
                min="30"
                max="200"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
          >
            <FontAwesomeIcon icon={faCheck} className="text-sm" />
            <span>{isSubmitting ? 'Recording vitals...' : 'Save vitals to SQLite WAL'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
