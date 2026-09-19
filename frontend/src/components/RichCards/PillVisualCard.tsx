'use client';

import React from 'react';
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCapsules, faXmark } from '@fortawesome/free-solid-svg-icons';

interface PillVisualCardProps {
  isOpen: boolean;
  onClose: () => void;
  medicineName?: string;
  dosage?: string;
  instructions?: string;
  pillColor?: string;
}

export function PillVisualCard({
  isOpen,
  onClose,
  medicineName = 'Amlodipine Besylate',
  dosage = '5 mg • Oral Tablet',
  instructions = 'Take 1 tablet daily with a full glass of water. Swallow whole.',
  pillColor = 'White, Round, Scored with "AML 5"',
}: PillVisualCardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#22273B] border-2 border-[#FF725E]/70 w-full max-w-sm sm:max-w-md rounded-3xl p-6 text-white shadow-[0_0_35px_rgba(255,114,94,0.25)] relative">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#8A92A6] hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* HUY HIỆU ECHO SHOW RICH CARD */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF725E]/15 border border-[#FF725E]/30 text-[#FF725E] text-[10px] font-extrabold uppercase tracking-widest mb-4 shadow-[0_0_12px_rgba(255,114,94,0.2)]">
          <FontAwesomeIcon icon={faCapsules} className="text-xs" />
          <span>Alexa Visual Pill Recognition</span>
        </div>

        {/* HÌNH ẢNH MÔ PHỎNG VIÊN THUỐC PHÓNG TO CHO NGƯỜI GIÀ */}
        <div className="w-full h-36 rounded-2xl bg-[#181B2A] border border-white/[0.08] flex flex-col items-center justify-center shadow-inner my-2">
          {/* Viên thuốc 3D cách điệu */}
          <div className="w-24 h-14 rounded-full bg-slate-100 shadow-[0_10px_25px_rgba(255,255,255,0.2)] border-2 border-slate-300 flex items-center justify-center rotate-[-12deg]">
            <span className="text-slate-800 font-mono font-black text-xs tracking-wider select-none border-b border-slate-300 pb-0.5">
              AML 5
            </span>
          </div>
          <p className="text-[11px] text-[#4D8BFF] font-semibold mt-3">{pillColor}</p>
        </div>

        {/* TÊN THUỐC VÀ HƯỚNG DẪN DÙNG */}
        <div className="mt-4">
          <h3 className="text-2xl font-black text-white tracking-tight">{medicineName}</h3>
          <p className="text-sm font-bold text-[#FF725E] mt-0.5">{dosage}</p>
        </div>

        <div className="bg-[#181B2A] rounded-2xl p-3.5 border border-white/[0.08] mt-3 text-xs text-[#8A92A6] leading-relaxed">
          <strong className="text-white block mb-1">Clinical Instruction:</strong>
          {instructions}
        </div>

        {/* NÚT XÁC NHẬN ĐÃ NHẬN DIỆN VIÊN THUỐC */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(255,114,94,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5 stroke-[2.5]" />
          <span>Confirmed Pill Match</span>
        </button>
      </div>
    </div>
  );
}