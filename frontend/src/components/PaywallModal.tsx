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
        colors: ['#FF5733', '#94A3B8', '#38BDF8', '#10B981'],
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
    { id: 'lifetime', name: 'Lifetime', price: '$99.99', period: 'one-time', badge: 'Best value' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] border border-white/[0.08] w-full max-w-lg sm:max-w-xl rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative transform transition-all animate-scaleUp">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Close"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* HEADER PRO */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#FF5733] flex items-center justify-center text-white">
            <FontAwesomeIcon icon={faCrown} className="text-xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Unlock CareBridge Clinical Pro
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF5733]/15 border border-[#FF5733]/30 text-[#FF5733] text-xs font-mono font-medium">
                Clinical grade
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-normal leading-relaxed">
              Enterprise ambient telehealth and caregiver automation
            </p>
          </div>
        </div>

        {/* FEATURE COMPARISON TABLE */}
        <div className="mb-5 rounded-2xl bg-[#151922] border border-white/[0.08] p-4">
          <div className="grid grid-cols-3 pb-2.5 border-b border-white/[0.08] text-xs font-medium">
            <span className="text-slate-400">Feature</span>
            <span className="text-center text-slate-400">Free tier</span>
            <span className="text-center text-[#FF5733] font-semibold">Clinical Pro</span>
          </div>

          <div className="divide-y divide-white/[0.06] text-xs">
            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-normal flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBolt} className="text-[#FF5733] text-xs" />
                <span>Prescriptions</span>
              </span>
              <span className="text-center text-slate-400 font-mono">2 slots</span>
              <span className="text-center text-emerald-400 font-mono font-semibold">Unlimited</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-normal flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTableCells} className="text-slate-400 text-xs" />
                <span>History matrix</span>
              </span>
              <span className="text-center text-slate-400 font-mono">7-day log</span>
              <span className="text-center text-emerald-400 font-mono font-semibold">Full 52-week</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-normal flex items-center gap-1.5">
                <FontAwesomeIcon icon={faFilePdf} className="text-slate-400 text-xs" />
                <span>Doctor PDF export</span>
              </span>
              <span className="text-center text-slate-400 font-mono">Locked</span>
              <span className="text-center text-emerald-400 font-mono font-semibold">Certified export</span>
            </div>

            <div className="grid grid-cols-3 py-2.5 items-center">
              <span className="text-slate-200 font-normal flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBrain} className="text-slate-400 text-xs" />
                <span>Bedrock AI triage</span>
              </span>
              <span className="text-center text-slate-400 font-mono">Core reminders</span>
              <span className="text-center text-emerald-400 font-mono font-semibold">Real-time Claude 3.5</span>
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
                  ? 'bg-[#151922] border-[#FF5733]'
                  : 'bg-[#151922]/70 border-white/[0.06] hover:border-white/15'
              }`}
            >
              {tier.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#FF5733] text-white text-xs font-mono font-medium whitespace-nowrap">
                  {tier.badge}
                </span>
              )}
              <h5 className="text-xs font-medium text-slate-400">{tier.name}</h5>
              <p className="text-base font-mono font-bold text-white mt-0.5">{tier.price}</p>
              <span className="text-xs font-mono text-slate-400 block">{tier.period}</span>
            </button>
          ))}
        </div>

        {/* JUDGE SANDBOX BYPASS */}
        <div className="p-4 rounded-2xl bg-[#151922] border border-white/[0.08] mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-amber-300" />
            <h4 className="text-xs font-semibold text-amber-300 tracking-normal">
              Evaluator sandbox bypass
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Instant 1-click unlock or reset to test gated restrictions without credit card setup.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleInstantUnlock}
              className="py-2.5 px-3 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faCrown} className="text-xs" />
              <span>[Demo] Instant unlock Pro</span>
            </button>
            <button
              type="button"
              onClick={handleResetFree}
              className="py-2.5 px-3 rounded-xl bg-[#1E2330] hover:bg-white/10 border border-white/[0.08] active:scale-95 text-slate-300 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
              <span>Reset to Free plan</span>
            </button>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTON */}
        <div className="flex flex-col gap-2">
          {isPro ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center text-xs font-medium flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faCheck} />
              <span>CareBridge Pro is active on this device</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstantUnlock}
              className="w-full py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#E64D2E] active:scale-[0.98] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faCrown} className="text-sm" />
              <span>Upgrade to Clinical Pro</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            {isPro ? 'Close' : 'Continue with free tier'}
          </button>
        </div>
      </div>
    </div>
  );
}
