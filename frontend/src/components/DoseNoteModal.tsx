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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#22273B] w-full max-w-md rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF725E]/15 text-[#FF725E] border border-[#FF725E]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,114,94,0.25)]">
              <FontAwesomeIcon icon={faNotesMedical} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Clinical Intake Note</h3>
              <p className="text-xs text-[#8A92A6] font-medium">
                {medicineName} • {scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#8A92A6] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* 1-TOUCH CLINICAL TAGS */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#8A92A6] uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faTag} className="text-xs text-[#FF725E]" />
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
                      ? 'bg-[#FF725E] text-white border-[#FF725E] shadow-[0_0_12px_rgba(255,114,94,0.35)]'
                      : 'bg-[#181B2A] hover:bg-[#1F2438] text-[#8A92A6] hover:text-white border-white/[0.08]'
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
          <label className="block text-xs font-bold text-[#8A92A6] uppercase tracking-wider mb-2">
            Detailed Observations / Symptoms
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Felt slight lightheadedness 15 mins after taking, drank water and resolved."
            className="w-full px-4 py-3 rounded-2xl bg-[#181B2A] border border-white/[0.08] focus:outline-none focus:border-[#FF725E]/60 focus:ring-1 focus:ring-[#FF725E]/40 text-sm text-white placeholder-[#8A92A6] resize-none shadow-inner transition-colors"
          />
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#8A92A6] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white shadow-[0_4px_15px_rgba(255,114,94,0.35)] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs font-black" />
            <span>Save Observation</span>
          </button>
        </div>
      </div>
    </div>
  );
}