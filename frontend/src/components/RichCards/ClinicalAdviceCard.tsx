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
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: faCircleCheck,
    },
    MEDIUM: {
      border: 'border-[#FF5733]/40',
      badgeBg: 'bg-[#FF5733]/15 text-[#FF5733] border-[#FF5733]/30',
      icon: faTriangleExclamation,
    },
    HIGH: {
      border: 'border-amber-500/40',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: faTriangleExclamation,
    },
    EMERGENCY: {
      border: 'border-rose-500/60',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: faTriangleExclamation,
    },
  }[urgencyLevel] || {
    border: 'border-white/[0.08]',
    badgeBg: 'bg-white/[0.06] text-slate-300 border-white/[0.08]',
    icon: faStethoscope,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-[#1E2330] border-2 ${urgencyColors.border} w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* Urgency Badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-medium mb-4 ${urgencyColors.badgeBg}`}>
          <FontAwesomeIcon icon={urgencyColors.icon} className="text-xs" />
          <span>Bedrock Triage - {urgencyLevel} Urgency</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>

        {/* Advice box */}
        <div className="bg-[#151922] rounded-2xl p-4 border border-white/[0.08] mt-3">
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {actionAdvice}
          </p>
        </div>

        {/* Clinical Rationale */}
        {clinicalExplanation && (
          <div className="mt-3 text-xs text-slate-300 leading-relaxed bg-[#151922] p-3 rounded-xl border border-white/[0.06]">
            <strong className="text-[#FF5733] font-semibold block mb-1">Clinical insight:</strong>
            {clinicalExplanation}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
          <span>I understand and acknowledge</span>
        </button>
      </div>
    </div>
  );
}
