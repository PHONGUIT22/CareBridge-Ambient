'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeartPulse,
  faDesktop,
  faMobileScreen,
  faCrown,
  faRightFromBracket,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { AuthSession } from '../types';

export interface TopNavBarProps {
  isDeskClock: boolean;
  authSession: AuthSession;
  isDualMode: boolean;
  onOpenPaywall: () => void;
  onSignOut: () => void;
  onSetDualMode: (isDual: boolean) => void;
  onPreviewRingPorch: () => void;
}

/**
 * TopNavBar - CareBridge Ambient OS Top Simulator & Device Control Bar
 */
export function TopNavBar({
  isDeskClock,
  authSession,
  isDualMode,
  onOpenPaywall,
  onSignOut,
  onSetDualMode,
  onPreviewRingPorch,
}: TopNavBarProps) {
  return (
    <header
      className={`px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 gap-3 backdrop-blur-md transition-colors duration-300 ${
        isDeskClock
          ? 'bg-[#0B1120]/95 border-b border-white/[0.08] text-white'
          : 'bg-white/95 border-b border-slate-200/80 text-slate-800 shadow-2xs'
      }`}
    >
      <div className="flex items-center gap-2.5 shrink-0">
        {/* CareBridge Royal Blue Logo Squircle */}
        <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-sm">
          <FontAwesomeIcon icon={faHeartPulse} className="text-white text-sm" />
        </div>
        <div>
          <span
            className={`font-extrabold text-sm tracking-tight flex items-center gap-1.5 ${
              isDeskClock ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span>CareBridge</span>
            <span className="text-[#2563EB] font-mono font-bold text-xs">Ambient OS</span>
          </span>
        </div>
      </div>

      {/* Persona Indicator & Pro Badge & Sign Out Button */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Active Profile Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            isDeskClock
              ? 'bg-slate-900 border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-200/80 text-slate-700'
          }`}
        >
          <div className="leading-tight flex items-center gap-2">
            <span className="whitespace-nowrap">
              {authSession.role === 'senior'
                ? `${authSession.patientName || 'Patient'} (Senior Mode)`
                : `${authSession.caregiverName || 'Caregiver'} (Caregiver)`}
            </span>
            {authSession.isPro && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Pro
              </span>
            )}
          </div>
        </div>

        {/* Pro Badge / Upgrade Button */}
        <button
          onClick={onOpenPaywall}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
            authSession.isPro
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
          title="CareBridge Ambient Subscription Status"
        >
          <FontAwesomeIcon icon={faCrown} className="text-xs" />
          <span className="hidden xs:inline">{authSession.isPro ? 'Pro active' : 'Upgrade Pro'}</span>
        </button>

        {/* Switch Profile / Sign Out */}
        <button
          onClick={onSignOut}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
            isDeskClock
              ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-700 hover:text-slate-900 shadow-2xs'
          }`}
          title="Switch profile or sign out"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
          <span className="hidden md:inline">Switch profile</span>
        </button>

        {/* Echo Show 10 Dual View / Single Frame Toggle */}
        <button
          onClick={() => onSetDualMode(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            isDualMode
              ? 'bg-[#1E3A8A] text-white shadow-xs'
              : isDeskClock
              ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
          }`}
          title="Echo Show 10 Dual View"
        >
          <FontAwesomeIcon icon={faDesktop} className="text-xs" />
          <span className="hidden lg:inline">Dual frame</span>
        </button>

        {/* Ring Doorbell Pro Camera Quick Trigger */}
        <button
          onClick={onPreviewRingPorch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition-all active:scale-95 shadow-2xs"
          title="Preview Ring Doorbell Pro Camera"
        >
          <FontAwesomeIcon icon={faVideo} className="text-xs" />
          <span className="hidden sm:inline">Ring Porch</span>
        </button>

        <button
          onClick={() => onSetDualMode(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            !isDualMode
              ? 'bg-[#1E3A8A] text-white shadow-xs'
              : isDeskClock
              ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
          }`}
          title="Single Device Mobile View"
        >
          <FontAwesomeIcon icon={faMobileScreen} className="text-xs" />
          <span className="hidden lg:inline">Single device</span>
        </button>
      </div>
    </header>
  );
}
