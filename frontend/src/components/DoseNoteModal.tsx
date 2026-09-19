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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151922] text-[#FF5733] border border-[#FF5733]/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faNotesMedical} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Clinical intake note</h3>
              <p className="text-xs text-slate-400 font-normal">
                {medicineName} - {scheduledTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* 1-TOUCH CLINICAL TAGS */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
            <FontAwesomeIcon icon={faTag} className="text-xs text-[#FF5733]" />
            <span>Quick clinical tags</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const isSelected = note.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-[#FF5733] text-white border-[#FF5733]'
                      : 'bg-[#151922] hover:bg-[#1E2330] text-slate-300 hover:text-white border-white/[0.08]'
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
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Detailed observations and symptoms
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Felt slight lightheadedness 15 mins after taking, drank water and resolved."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] focus:outline-none focus:border-[#FF5733] text-xs text-white placeholder-slate-400 resize-none shadow-inner transition-colors leading-relaxed"
          />
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#FF5733] hover:bg-[#E64D2E] text-white active:scale-[0.98] transition-all flex items-center gap-2 shadow-md"
          >
            <FontAwesomeIcon icon={faCheck} className="text-xs" />
            <span>Save observation</span>
          </button>
        </div>
      </div>
    </div>
  );
}