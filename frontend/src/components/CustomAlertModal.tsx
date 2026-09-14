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
      ? 'text-emerald-400 bg-emerald-500/20'
      : type === 'warning'
      ? 'text-amber-400 bg-amber-500/20'
      : 'text-[#00CAFF] bg-[#00CAFF]/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="alexa-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/15 text-white transform transition-all animate-scaleUp text-center">
        <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${colorClass}`}>
          <FontAwesomeIcon icon={icon} className="text-xl" />
        </div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-[#00CAFF] hover:bg-[#00CAFF]/90 text-slate-950 font-black text-sm tracking-wide shadow-md active:scale-98 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  );
}
