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
      bg: 'from-emerald-950/90 to-slate-900',
      border: 'border-emerald-500/50',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: faCircleCheck,
    },
    MEDIUM: {
      bg: 'from-amber-950/90 to-slate-900',
      border: 'border-amber-500/60',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: faTriangleExclamation,
    },
    HIGH: {
      bg: 'from-rose-950/90 to-slate-900',
      border: 'border-rose-500/60',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: faTriangleExclamation,
    },
    EMERGENCY: {
      bg: 'from-red-950 to-slate-950',
      border: 'border-red-500',
      badgeBg: 'bg-red-500/30 text-red-200 border-red-500/50 animate-pulse',
      icon: faTriangleExclamation,
    },
  }[urgencyLevel] || {
    bg: 'from-blue-950/90 to-slate-900',
    border: 'border-cyan-500/50',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: faStethoscope,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-gradient-to-b ${urgencyColors.bg} border-2 ${urgencyColors.border} w-full max-w-md rounded-3xl p-6 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* Urgency Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-display font-extrabold uppercase tracking-widest mb-4">
          <FontAwesomeIcon icon={urgencyColors.icon} className="text-xs" />
          <span>CareBridge Bedrock Triage • {urgencyLevel} Urgency</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-display font-black text-white">{title}</h3>

        {/* Advice box */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/15 mt-3 shadow-inner">
          <p className="text-sm text-slate-100 font-semibold leading-relaxed">
            {actionAdvice}
          </p>
        </div>

        {/* Clinical Rationale */}
        {clinicalExplanation && (
          <div className="mt-3 text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
            <strong className="text-cyan-300 block mb-1">Clinical Insight:</strong>
            {clinicalExplanation}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3.5 rounded-2xl bg-[#00CAFF] hover:bg-[#00CAFF]/90 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(0,202,255,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-sm" />
          <span>I Understand / Acknowledge</span>
        </button>
      </div>
    </div>
  );
}
