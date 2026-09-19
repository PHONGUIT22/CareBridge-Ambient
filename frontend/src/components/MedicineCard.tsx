'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules, faNotesMedical, faCheck } from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

export interface MedicineCardItem {
  logId: string;
  medicineId: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  status: 'pending' | 'taken' | 'skipped';
  isTaken: boolean;
  takenAt?: string;
  notes?: string;
  stockCount?: number;
  imageUri?: string;
  type?: 'medication' | 'routine';
}

interface MedicineCardProps {
  item: MedicineCardItem;
  onToggleStatus: (logId: string, currentStatus: 'pending' | 'taken' | 'skipped') => void;
  onOpenNoteModal?: (item: MedicineCardItem) => void;
  onRefillStock?: (medicineId: string) => void;
}

export function MedicineCard({
  item,
  onToggleStatus,
  onOpenNoteModal,
}: MedicineCardProps) {
  const isTaken = item.status === 'taken';

  const handleToggle = () => {
    if (!isTaken) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#00CAFF', '#10B981', '#38BDF8'],
      });
    }
    onToggleStatus(item.logId, item.status);
  };

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-200 relative flex flex-col justify-between alexa-card-interactive ${
        isTaken
          ? 'bg-[#1E2330] border border-[#FF5733]'
          : 'bg-[#1E2330] border border-white/[0.08] hover:border-white/15'
      }`}
    >
      {/* Top row: Status label and physical tactile toggle switch */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium transition-colors ${
            isTaken ? 'text-[#FF5733]' : 'text-slate-400'
          }`}
        >
          {isTaken ? 'Taken' : 'Pending'}
        </span>

        {/* Physical Toggle Switch */}
        <button
          onClick={handleToggle}
          type="button"
          role="switch"
          aria-checked={isTaken}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-[#151922] border border-white/[0.12] transition-colors duration-200 focus:outline-none"
          title={isTaken ? 'Click to mark as pending' : 'Click to mark as taken'}
        >
          <span
            className={`pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full transition duration-200 ease-in-out ${
              isTaken
                ? 'translate-x-6 bg-[#FF5733] text-white'
                : 'translate-x-1 bg-slate-500 text-transparent'
            }`}
          >
            {isTaken && <FontAwesomeIcon icon={faCheck} className="text-[9px]" />}
          </span>
        </button>
      </div>

      {/* Card Center: Icon squircle, Name, Time & Dosage */}
      <div className="flex flex-col items-center justify-center text-center my-3 w-full">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-[#151922] border border-white/[0.08] ${
            isTaken ? 'text-[#FF5733]' : 'text-slate-300'
          }`}
        >
          {item.imageUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUri} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <FontAwesomeIcon icon={faCapsules} className="text-lg" />
          )}
        </div>

        <h4
          className="font-semibold text-white tracking-[-0.01em] text-sm mt-2.5 truncate w-full text-center px-1"
          title={item.name}
        >
          {item.name}
        </h4>

        <p className="text-xs text-slate-300 font-normal leading-relaxed mt-0.5 text-center truncate w-full px-1">
          {item.scheduledTime} - {item.dosage}
        </p>
      </div>

      {/* Footer: Stock pill and clinical note icon */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-xs">
        <span className="px-2.5 py-0.5 rounded-md bg-[#151922] border border-white/[0.08] text-slate-200 font-mono tabular-nums text-xs font-medium">
          {item.stockCount ?? 30} pills left
        </span>

        <button
          onClick={() => onOpenNoteModal?.(item)}
          className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
            item.notes
              ? 'bg-[#FF5733]/15 text-[#FF5733] border border-[#FF5733]/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          title={item.notes ? `Clinical note: ${item.notes}` : 'Add clinical note'}
        >
          <FontAwesomeIcon icon={faNotesMedical} className="text-xs" />
        </button>
      </div>
    </div>
  );
}