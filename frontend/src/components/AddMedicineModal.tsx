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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151922] text-[#FF5733] border border-[#FF5733]/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faCapsules} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Add medication regimen</h3>
              <p className="text-xs text-slate-400 font-normal">Synced with CareBridge SQLite WAL</p>
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
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Medication name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Atorvastatin (Lipitor)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Dosage & form
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20mg - 1 tablet at bedtime"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faClock} className="text-[#FF5733] text-xs" />
                <span>Scheduled time</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-slate-400 text-xs" />
                <span>Stock count</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            <span>{isSubmitting ? 'Adding regimen...' : 'Save to clinical schedule'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
