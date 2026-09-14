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
      className={`alexa-card rounded-2xl p-4 transition-all duration-300 relative flex flex-col justify-between alexa-card-interactive border border-white/5 ${
        isTaken
          ? 'border-cyan-500/40 shadow-[0_10px_30px_rgba(0,202,255,0.12)] ring-1 ring-[#00CAFF]/40'
          : 'hover:border-white/20'
      }`}
    >
      {/* HÀNG TRÊN CÙNG: NHÃN TRẠNG THÁI TUÂN THỦ (TAKEN / PENDING) & NÚT GẠT */}
      <div className="flex items-center justify-between gap-2">
        {/* Bên trái: Trạng thái lâm sàng rõ ràng, nhân văn */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-display font-extrabold tracking-wider uppercase transition-colors ${
              isTaken ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {isTaken ? 'Taken' : 'Pending'}
          </span>
          {isTaken && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
          )}
        </div>

        {/* Bên phải: Nút công tắc Switch Toggle bo tròn nằm cùng hàng */}
        <button
          onClick={handleToggle}
          type="button"
          role="switch"
          aria-checked={isTaken}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none ${
            isTaken
              ? 'bg-[#00CAFF] shadow-[0_0_12px_#00CAFF]'
              : 'bg-slate-800 border border-slate-700'
          }`}
          title={isTaken ? 'Click to mark as pending' : 'Click to mark as taken'}
        >
          <span
            className={`pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full transition duration-300 ease-in-out ${
              isTaken
                ? 'translate-x-6 bg-slate-950 text-[#00CAFF]'
                : 'translate-x-1 bg-slate-400'
            }`}
          >
            {isTaken && <FontAwesomeIcon icon={faCheck} className="text-[9px] font-black" />}
          </span>
        </button>
      </div>

      {/* PHẦN THÂN GIỮA (TRUNG TÂM CỦA THẺ - CĂN GIỮA TOÀN BỘ) */}
      <div className="flex flex-col items-center justify-center text-center my-3.5 w-full">
        {/* Khung squircle bo góc lớn (w-14 h-14 rounded-2xl) */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isTaken
              ? 'bg-[#00CAFF]/15 border border-[#00CAFF]/40 text-[#00CAFF] shadow-[0_0_20px_rgba(0,202,255,0.25)]'
              : 'bg-slate-800/80 border border-white/5 text-slate-400 shadow-inner'
          }`}
        >
          {item.imageUri ? (
            <img src={item.imageUri} alt={item.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <FontAwesomeIcon icon={faCapsules} className="text-xl" />
          )}
        </div>

        {/* Tên thuốc in đậm màu trắng sáng */}
        <h4
          className="text-sm sm:text-base font-bold text-white mt-3 truncate w-full text-center px-1 tracking-tight"
          title={item.name}
        >
          {item.name}
        </h4>

        {/* Giờ uống và liều lượng */}
        <p className="text-xs text-slate-400 mt-1 font-medium text-center truncate w-full px-1">
          {item.scheduledTime} • {item.dosage}
        </p>
      </div>

      {/* HÀNG ĐÁY THẺ (FOOTER): BADGE SỐ LƯỢNG THUỐC VÀ NÚT GHI CHÚ NHỎ */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[11px]">
        {/* Bên trái: Badge số lượng thuốc còn lại nhỏ gọn */}
        <span className="px-2.5 py-0.5 rounded-full bg-[#0A161E]/80 border border-white/10 text-cyan-300 font-mono text-[10px] font-semibold">
          {item.stockCount ?? 30} pills left
        </span>

        {/* Bên phải: Nút icon ghi chú nhỏ mở modal */}
        <button
          onClick={() => onOpenNoteModal?.(item)}
          className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
            item.notes
              ? 'bg-[#00CAFF]/20 text-[#00CAFF] border border-[#00CAFF]/40 shadow-[0_0_10px_rgba(0,202,255,0.25)]'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={item.notes ? `Clinical Note: ${item.notes}` : 'Add Clinical Note'}
        >
          <FontAwesomeIcon icon={faNotesMedical} className="text-xs" />
        </button>
      </div>
    </div>
  );
}