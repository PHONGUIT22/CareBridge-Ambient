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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="alexa-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/15 text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <FontAwesomeIcon icon={faHeartPulse} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Record Vitals Reading</h3>
              <p className="text-xs text-slate-400 font-medium">Automatic AHA Classification & Logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs" />
                <span>Systolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="60"
                max="250"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faHeartPulse} className="text-xs" />
                <span>Diastolic (mmHg)</span>
              </label>
              <input
                type="number"
                min="40"
                max="160"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-2xl bg-[#00CAFF] hover:bg-[#00CAFF]/90 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,202,255,0.45)] active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} className="text-sm font-black" />
            <span>{isSubmitting ? 'Recording Vitals...' : 'Save Vitals to SQLite WAL'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
