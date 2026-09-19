'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faXmark,
  faCheck,
  faBolt,
  faFilePdf,
  faBrain,
  faRotateRight,
  faCalendarDays,
  faTableCells,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivatePro: () => void;
  onResetFreePlan?: () => void;
  isPro?: boolean;
}

export function PaywallModal({
  isOpen,
  onClose,
  onActivatePro,
  onResetFreePlan,
  isPro = false,
}: PaywallModalProps) {
  const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual' | 'lifetime'>('annual');

  if (!isOpen) return null;

  const handleInstantUnlock = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF725E', '#FFA08C', '#4D8BFF', '#10B981'],
      });
    } catch (e) {
      console.warn('Confetti animation:', e);
    }
    onActivatePro();
    onClose();
  };

  const handleResetFree = () => {
    onResetFreePlan?.();
    onClose();
  };

  const tiers = [
    { id: 'monthly', name: 'Monthly', price: '$9.99', period: '/month', badge: null },
    { id: 'annual', name: 'Annual', price: '$79.99', period: '/year', badge: 'Save 33%' },
    { id: 'lifetime', name: 'Lifetime', price: '$99.99', period: 'one-time', badge: 'Best Value' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121420]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#22273B] border border-white/[0.08] w-full max-w-lg sm:max-w-xl rounded-3xl p-6 sm:p-8 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative transform transition-all animate-scaleUp">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.06] hover:bg-white/15 text-[#8A92A6] hover:text-white transition-colors"
          title="Close"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* HEADER PRO */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF725E] to-[#FFA08C] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,114,94,0.4)]">
            <FontAwesomeIcon icon={faCrown} className="text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Unlock CareBridge Clinical Pro 🌟
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF725E]/20 border border-[#FF725E]/40 text-[#FF725E] text-[10px] font-black uppercase tracking-wider">
                Clinical Grade
              </span>
            </div>
            <p className="text-xs text-[#8A92A6] mt-0.5 font-medium">
              Enterprise Ambient Telehealth & Caregiver Automation
            </p>
          </div>
        </div>

        {/* FEATURE COMPARISON TABLE */}
        <div className="mb-5 rounded-2xl bg-[#181B2A] border border-white/[0.06] p-4">
          <div className="grid grid-cols-3 pb-2.5 border-b border-white/[0.06] text-[11px] font-bold">
            <span className="text-[#8A92A6] uppercase tracking-wider">Feature</span>
            <span className="text-center text-[#8A92A6]">Free Tier</span>
            <span className="text-center text-[#FF725E] font-black">Clinical Pro</span>
          </div>

          <div className="divide-y divide-white/[0.04] text-xs">
            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBolt} className="text-[#FF725E] text-[11px]" />
                <span>Prescriptions</span>
              </span>
              <span className="text-center text-[#8A92A6]">2 Prescriptions</span>
              <span className="text-center text-emerald-400 font-black">Unlimited</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTableCells} className="text-[#4D8BFF] text-[11px]" />
                <span>History Matrix</span>
              </span>
              <span className="text-center text-[#8A92A6]">7-Day Log</span>
              <span className="text-center text-emerald-400 font-black">Full 52-Week</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFilePdf} className="text-rose-400 text-[11px]" />
                <span>Doctor PDF Export</span>
              </span>
              <span className="text-center text-[#8A92A6]">Locked</span>
              <span className="text-center text-emerald-400 font-black">Certified Export</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBrain} className="text-amber-400 text-[11px]" />
                <span>Bedrock AI Triage</span>
              </span>
              <span className="text-center text-[#8A92A6]">Core Reminders</span>
              <span className="text-center text-emerald-400 font-black">Real-Time Claude 3.5</span>
            </div>
          </div>
        </div>

        {/* PRICING TIER PILLS */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTier(tier.id as any)}
              className={`p-3 rounded-2xl text-center border transition-all relative ${
                selectedTier === tier.id
                  ? 'bg-[#2A314A] border-[#FF725E] shadow-[0_0_15px_rgba(255,114,94,0.25)]'
                  : 'bg-[#181B2A] border-white/[0.06] hover:border-white/15'
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#FF725E] text-white text-[9px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap">
                  {tier.badge}
                </span>
              )}
              <h5 className="text-[11px] font-bold text-[#8A92A6]">{tier.name}</h5>
              <p className="text-base font-black text-white mt-0.5">{tier.price}</p>
              <span className="text-[9.5px] text-[#8A92A6] block">{tier.period}</span>
            </button>
          ))}
        </div>

        {/* 🧑‍⚖️ JUDGE SANDBOX BYPASS (CRUCIAL) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#FF725E]/15 to-transparent border border-amber-500/35 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🧑‍⚖️</span>
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
              Judge & Evaluator Sandbox Bypass
            </h4>
          </div>
          <p className="text-[11px] text-slate-200 leading-relaxed mb-3">
            Instant 1-click unlock or reset to test gated restrictions without credit card setup.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleInstantUnlock}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF725E] to-[#FFA08C] hover:opacity-95 active:scale-95 text-white font-black text-xs tracking-wide shadow-[0_4px_15px_rgba(255,114,94,0.35)] transition-all flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faCrown} className="text-xs" />
              <span>[Demo] Instant Unlock Pro</span>
            </button>
            <button
              type="button"
              onClick={handleResetFree}
              className="py-2.5 px-3 rounded-xl bg-[#181B2A] hover:bg-white/10 border border-white/10 active:scale-95 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
              <span>Reset to Free Plan</span>
            </button>
          </div>
        </div>

        {/* NÚT HÀNH ĐỘNG CHÍNH */}
        <div className="flex flex-col gap-2">
          {isPro ? (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FontAwesomeIcon icon={faCheck} />
              <span>CareBridge Pro is Active on this Device</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstantUnlock}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FFA08C] hover:opacity-95 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-[0_8px_25px_rgba(255,114,94,0.45)] transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faCrown} className="text-sm" />
              <span>Upgrade to Clinical Pro</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-[#8A92A6] hover:text-white transition-colors"
          >
            {isPro ? 'Close' : 'Continue with Free Tier'}
          </button>
        </div>
      </div>
    </div>
  );
}
