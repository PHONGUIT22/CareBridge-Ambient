'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleCheck,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
}

export function CustomAlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: CustomAlertModalProps) {
  if (!isOpen) return null;

  const icon =
    type === 'success'
      ? faCircleCheck
      : type === 'warning'
      ? faTriangleExclamation
      : faCircleInfo;

  const colorClass =
    type === 'success'
      ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
      : type === 'warning'
      ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
      : 'text-[#FF725E] bg-[#FF725E]/20 border border-[#FF725E]/30 shadow-[0_0_15px_rgba(255,114,94,0.25)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#22273B] w-full max-w-sm rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/[0.08] text-white transform transition-all animate-scaleUp text-center">
        <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${colorClass}`}>
          <FontAwesomeIcon icon={icon} className="text-xl" />
        </div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="text-xs text-[#8A92A6] mt-2 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white font-black text-sm tracking-wide shadow-[0_4px_15px_rgba(255,114,94,0.35)] active:scale-[0.98] transition-all"
        >
          OK
        </button>
      </div>
    </div>
  );
}
