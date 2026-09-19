'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faTriangleExclamation,
  faCircleCheck,
  faXmark,
  faStethoscope,
} from '@fortawesome/free-solid-svg-icons';

interface ClinicalAdviceCardProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actionAdvice?: string;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  clinicalExplanation?: string;
}

export function ClinicalAdviceCard({
  isOpen,
  onClose,
  title = 'Clinical Triage Assessment',
  actionAdvice = 'Please sit down immediately and drink a glass of warm water. Rest for 15 minutes before checking blood pressure.',
  urgencyLevel = 'MEDIUM',
  clinicalExplanation = 'Transient orthostatic hypotension may occur shortly after taking anti-hypertensive medication such as Amlodipine.',
}: ClinicalAdviceCardProps) {
  if (!isOpen) return null;

  const urgencyColors = {
    LOW: {
      border: 'border-emerald-500/50',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: faCircleCheck,
    },
    MEDIUM: {
      border: 'border-[#FF725E]/60',
      badgeBg: 'bg-[#FF725E]/15 text-[#FF725E] border-[#FF725E]/30',
      icon: faTriangleExclamation,
    },
    HIGH: {
      border: 'border-amber-500/60',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: faTriangleExclamation,
    },
    EMERGENCY: {
      border: 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)]',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
      icon: faTriangleExclamation,
    },
  }[urgencyLevel] || {
    border: 'border-[#4D8BFF]/50',
    badgeBg: 'bg-[#4D8BFF]/15 text-[#4D8BFF] border-[#4D8BFF]/30',
    icon: faStethoscope,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-[#22273B] border-2 ${urgencyColors.border} w-full max-w-md rounded-3xl p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#8A92A6] hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* Urgency Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest mb-4 ${urgencyColors.badgeBg}`}>
          <FontAwesomeIcon icon={urgencyColors.icon} className="text-xs" />
          <span>CareBridge Bedrock Triage • {urgencyLevel} Urgency</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>

        {/* Advice box */}
        <div className="bg-[#181B2A] rounded-2xl p-4 border border-white/[0.08] mt-3 shadow-inner">
          <p className="text-sm text-slate-100 font-semibold leading-relaxed">
            {actionAdvice}
          </p>
        </div>

        {/* Clinical Rationale */}
        {clinicalExplanation && (
          <div className="mt-3 text-xs text-[#8A92A6] leading-relaxed bg-[#181B2A]/80 p-3 rounded-xl border border-white/[0.06]">
            <strong className="text-[#FF725E] block mb-1">Clinical Insight:</strong>
            {clinicalExplanation}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white font-black text-sm tracking-wide shadow-[0_4px_20px_rgba(255,114,94,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-sm" />
          <span>I Understand / Acknowledge</span>
        </button>
      </div>
    </div>
  );
}
