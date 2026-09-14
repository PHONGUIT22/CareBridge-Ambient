'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNotesMedical, faTag, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';

interface DoseNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  medicineName: string;
  scheduledTime?: string;
  initialNote?: string;
}

const QUICK_TAGS = [
  'Taken with breakfast',
  'Taken with food',
  'Taken with warm water',
  'Normal / No side effects',
  'Mild dizziness',
  'Slight fatigue',
  'Mild nausea',
  'Taken 15 mins late',
];

export function DoseNoteModal({
  isOpen,
  onClose,
  onSave,
  medicineName,
  scheduledTime = '08:00',
  initialNote = '',
}: DoseNoteModalProps) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (note.includes(tag)) {
      setNote(note.replace(tag, '').replace(/,\s*,/g, ',').trim());
    } else {
      setNote((prev) => (prev.trim() ? `${prev.trim()}, ${tag}` : tag));
    }
  };

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="alexa-card w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/15 text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00CAFF]/20 text-[#00CAFF] border border-[#00CAFF]/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faNotesMedical} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Clinical Intake Note</h3>
              <p className="text-xs text-slate-300 font-medium">
                {medicineName} • {scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* 1-TOUCH CLINICAL TAGS */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faTag} className="text-xs text-[#00CAFF]" />
            <span>Quick Clinical Tags (1-Touch)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const isSelected = note.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-[#00CAFF] text-slate-950 border-[#00CAFF] shadow-[0_0_10px_rgba(0,202,255,0.4)]'
                      : 'bg-[#0A161E]/80 hover:bg-[#0A161E] text-slate-300 border-white/10'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* TEXTAREA GHI CHÚ TỰ DO */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Detailed Observations / Symptoms
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Felt slight lightheadedness 15 mins after taking, drank water and resolved."
            className="w-full px-4 py-3 rounded-2xl bg-[#0A161E]/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00CAFF] text-sm text-white placeholder-slate-500 resize-none shadow-inner"
          />
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#00CAFF] hover:bg-[#00CAFF]/85 text-slate-950 shadow-[0_0_15px_rgba(0,202,255,0.4)] active:scale-95 transition-all flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs font-black" />
            <span>Save Observation</span>
          </button>
        </div>
      </div>
    </div>
  );
}