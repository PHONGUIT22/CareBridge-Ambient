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
  faTv,
  faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';
import { AuthSession } from '../types';

export interface TopNavBarProps {
  isDeskClock: boolean;
  authSession: AuthSession;
  isDualMode: boolean;
  viewportMode?: 'dual' | 'single' | 'echoShow10';
  onOpenPaywall: () => void;
  onSignOut: () => void;
  onSetDualMode: (isDual: boolean) => void;
  onSetViewportMode?: (mode: 'dual' | 'single' | 'echoShow10') => void;
  onPreviewRingPorch: () => void;
  onSimulatePorchDrop?: () => void;
}

/**
 * TopNavBar - CareBridge Ambient OS Top Simulator & Device Control Bar
 */
export function TopNavBar({
  isDeskClock,
  authSession,
  isDualMode,
  viewportMode = 'dual',
  onOpenPaywall,
  onSignOut,
  onSetDualMode,
  onSetViewportMode,
  onPreviewRingPorch,
  onSimulatePorchDrop,
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

        {/* Simulate Porch Delivery Trigger (Proactive Ring Motion Test) */}
        {onSimulatePorchDrop && (
          <button
            onClick={onSimulatePorchDrop}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Simulate Amazon Prime delivery arrival at front porch (Tests proactive Ring chime & banner)"
          >
            <FontAwesomeIcon icon={faBoxOpen} className="text-xs text-emerald-600" />
            <span className="hidden sm:inline">Simulate Delivery</span>
          </button>
        )}

        {/* Viewport Modes: Dual Frame, Echo Show 10, Single Mobile */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium">
          {/* 1. Dual Dev Mode */}
          <button
            onClick={() => {
              if (onSetViewportMode) onSetViewportMode('dual');
              onSetDualMode(true);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewportMode === 'dual' || (isDualMode && !viewportMode)
                ? 'bg-[#1E3A8A] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Dual Dev Frame (Echo Device + Alexa Agent Console)"
          >
            <FontAwesomeIcon icon={faDesktop} className="text-xs" />
            <span className="hidden xl:inline">Dual frame</span>
          </button>

          {/* 2. Echo Show 10 Hardware Frame */}
          <button
            onClick={() => {
              if (onSetViewportMode) onSetViewportMode('echoShow10');
              onSetDualMode(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewportMode === 'echoShow10'
                ? 'bg-[#1E3A8A] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Amazon Echo Show 10 Hardware Frame Simulator (10.1-inch 16:10 with Swivel Base)"
          >
            <FontAwesomeIcon icon={faTv} className="text-xs" />
            <span className="hidden xl:inline">Echo Show 10</span>
          </button>

          {/* 3. Mobile Device Mode */}
          <button
            onClick={() => {
              if (onSetViewportMode) onSetViewportMode('single');
              onSetDualMode(false);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewportMode === 'single'
                ? 'bg-[#1E3A8A] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Single Device Mobile View"
          >
            <FontAwesomeIcon icon={faMobileScreen} className="text-xs" />
            <span className="hidden xl:inline">Mobile</span>
          </button>
        </div>

        {/* Ring Doorbell Pro Camera Quick Trigger */}
        <button
          onClick={onPreviewRingPorch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition-all active:scale-95 shadow-2xs cursor-pointer"
          title="Preview Ring Doorbell Pro Camera"
        >
          <FontAwesomeIcon icon={faVideo} className="text-xs" />
          <span className="hidden sm:inline">Ring Porch</span>
        </button>
      </div>
    </header>
  );
}
