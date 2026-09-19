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
      className={`rounded-2xl p-4 transition-all duration-300 relative flex flex-col justify-between alexa-card-interactive ${
        isTaken
          ? 'bg-[#22273B] border-2 border-[#FF725E]/80 shadow-[0_0_20px_rgba(255,114,94,0.25),0_10px_25px_rgba(0,0,0,0.3)] ring-0'
          : 'bg-[#22273B] border border-white/[0.06] shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:border-white/[0.15]'
      }`}
    >
      {/* HÀNG TRÊN CÙNG: NHÃN TRẠNG THÁI TUÂN THỦ (TAKEN / PENDING) & NÚT GẠT PHONG CÁCH SMART HOME */}
      <div className="flex items-center justify-between gap-2">
        {/* Bên trái: Trạng thái lâm sàng rõ ràng, nhân văn */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-display font-extrabold tracking-wider uppercase transition-colors ${
              isTaken ? 'text-[#FF725E]' : 'text-[#8A92A6]'
            }`}
          >
            {isTaken ? 'Taken' : 'Pending'}
          </span>
          {isTaken && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF725E] shadow-[0_0_6px_#FF725E]" />
          )}
        </div>

        {/* Bên phải: Nút công tắc Switch Toggle theo chuẩn Smart Home trong style.png */}
        <button
          onClick={handleToggle}
          type="button"
          role="switch"
          aria-checked={isTaken}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-[#181B2A] border border-white/[0.08] transition-all duration-300 ease-in-out focus:outline-none shadow-inner"
          title={isTaken ? 'Click to mark as pending' : 'Click to mark as taken'}
        >
          <span
            className={`pointer-events-none inline-flex h-4 w-4 transform items-center justify-center rounded-full transition duration-300 ease-in-out ${
              isTaken
                ? 'translate-x-6 bg-gradient-to-tr from-[#FF725E] to-[#FF8A71] text-white shadow-[0_0_10px_rgba(255,114,94,0.8)]'
                : 'translate-x-1 bg-[#4D8BFF] shadow-[0_0_8px_rgba(77,139,255,0.7)] text-white'
            }`}
          >
            {isTaken && <FontAwesomeIcon icon={faCheck} className="text-[8px] font-black" />}
          </span>
        </button>
      </div>

      {/* PHẦN THÂN GIỮA (TRUNG TÂM CỦA THẺ - CĂN GIỮA TOÀN BỘ) */}
      <div className="flex flex-col items-center justify-center text-center my-3.5 w-full">
        {/* Khung squircle bo góc lớn (w-14 h-14 rounded-2xl) */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isTaken
              ? 'bg-[#FF725E]/15 border border-[#FF725E]/40 text-[#FF725E] shadow-[0_0_15px_rgba(255,114,94,0.2)]'
              : 'bg-[#181B2A] border border-white/[0.06] text-[#8A92A6] shadow-inner'
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
          className="text-sm sm:text-base font-black text-white mt-3 truncate w-full text-center px-1 tracking-tight"
          title={item.name}
        >
          {item.name}
        </h4>

        {/* Giờ uống và liều lượng */}
        <p className="text-xs text-[#8A92A6] mt-1 font-medium text-center truncate w-full px-1">
          {item.scheduledTime} • {item.dosage}
        </p>
      </div>

      {/* HÀNG ĐÁY THẺ (FOOTER): BADGE SỐ LƯỢNG THUỐC VÀ NÚT GHI CHÚ NHỎ */}
      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] text-[11px]">
        {/* Bên trái: Badge số lượng thuốc còn lại nhỏ gọn */}
        <span className="px-2.5 py-0.5 rounded-full bg-[#181B2A] border border-white/[0.06] text-[#4D8BFF] font-mono text-[10px] font-semibold">
          {item.stockCount ?? 30} pills left
        </span>

        {/* Bên phải: Nút icon ghi chú nhỏ mở modal */}
        <button
          onClick={() => onOpenNoteModal?.(item)}
          className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
            item.notes
              ? 'bg-[#FF725E]/20 text-[#FF725E] border border-[#FF725E]/40 shadow-[0_0_10px_rgba(255,114,94,0.25)]'
              : 'text-[#8A92A6] hover:text-white hover:bg-white/[0.06]'
          }`}
          title={item.notes ? `Clinical Note: ${item.notes}` : 'Add Clinical Note'}
        >
          <FontAwesomeIcon icon={faNotesMedical} className="text-xs" />
        </button>
      </div>
    </div>
  );
}