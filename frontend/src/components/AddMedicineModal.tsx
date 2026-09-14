'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules, faXmark, faPlus, faClock, faBoxesStacked } from '@fortawesome/free-solid-svg-icons';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (medicine: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => Promise<void>;
}

export function AddMedicineModal({ isOpen, onClose, onAdd }: AddMedicineModalProps) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [stock, setStock] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    try {
      setIsSubmitting(true);
      await onAdd({
        name: name.trim(),
        dosage: dosage.trim(),
        reminderTimes: [time],
        daysOfWeek: ['ALL'],
        stockCount: parseInt(stock, 10) || 30,
      });
      setName('');
      setDosage('');
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
            <div className="w-10 h-10 rounded-2xl bg-[#00CAFF]/20 text-[#00CAFF] border border-[#00CAFF]/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,202,255,0.3)]">
              <FontAwesomeIcon icon={faCapsules} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Add Medication Regimen</h3>
              <p className="text-xs text-slate-400 font-medium">Synced with CareBridge SQLite WAL</p>
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
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Medication Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atorvastatin (Lipitor)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00CAFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Dosage & Form
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20mg • 1 Tablet at bedtime"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00CAFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faClock} className="text-[#00CAFF] text-xs" />
                <span>Scheduled Time</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00CAFF]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-indigo-400 text-xs" />
                <span>Stock Count</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#08151e] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00CAFF]"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-2xl bg-[#00CAFF] hover:bg-[#00CAFF]/90 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_20px_rgba(0,202,255,0.45)] active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>{isSubmitting ? 'Adding Regimen...' : 'Save to Clinical Schedule'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
