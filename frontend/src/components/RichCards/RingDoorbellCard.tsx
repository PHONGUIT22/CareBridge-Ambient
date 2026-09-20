'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVideo,
  faXmark,
  faBoxOpen,
  faLockOpen,
  faLock,
  faMicrophone,
  faVolumeHigh,
  faShieldHalved,
  faTruckFast,
  faTriangleExclamation,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

export interface RingDoorbellCardProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'delivery' | 'emergency' | 'live';
  packageDetails?: {
    carrier?: string;
    description?: string;
    deliveryTime?: string;
    orderId?: string;
  };
  doorLockStatus?: string;
  emergencyReason?: string;
  onAcknowledge?: () => void;
  onUnlockDoor?: () => void;
}

export function RingDoorbellCard({
  isOpen,
  onClose,
  mode = 'delivery',
  packageDetails,
  doorLockStatus = 'LOCKED',
  emergencyReason,
  onAcknowledge,
  onUnlockDoor,
}: RingDoorbellCardProps) {
  const [currentTime, setCurrentTime] = useState('');
  const [isTalkActive, setIsTalkActive] = useState(false);
  const [isBroughtInside, setIsBroughtInside] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const isEmergency = mode === 'emergency' || doorLockStatus.includes('UNLOCKED');
  const carrier = packageDetails?.carrier || 'Amazon Prime Logistics';
  const desc = packageDetails?.description || 'CareBridge Prescription Medication Parcel';

  const handleBringInside = () => {
    setIsBroughtInside(true);
    setTimeout(() => {
      if (onAcknowledge) onAcknowledge();
      onClose();
      setIsBroughtInside(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e17]/85 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`bg-[#151922] border-2 ${
          isEmergency ? 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.35)]' : 'border-[#1399FF]/50 shadow-[0_0_30px_rgba(19,153,255,0.25)]'
        } w-full max-w-xl rounded-3xl overflow-hidden text-white relative flex flex-col`}
      >
        {/* TOP ACCENT GLOW */}
        <div
          className={`absolute -top-16 -right-16 w-48 h-48 ${
            isEmergency ? 'bg-rose-500/20' : 'bg-[#1399FF]/20'
          } rounded-full blur-3xl pointer-events-none`}
        />

        {/* 1. RING HEADER BAR */}
        <div className="px-5 py-3.5 bg-[#10141d] border-b border-white/[0.08] flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            {/* Ring Brand Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#1399FF] flex items-center justify-center text-white text-xs shadow-md shadow-[#1399FF]/30">
              <FontAwesomeIcon icon={faVideo} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider text-white">
                  RING DOORBELL PRO
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.08] text-slate-300 font-mono">
                  FRONT PORCH
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400 font-mono font-medium">
                  1080p HD LIVE • {currentTime || 'LIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEmergency ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse">
                <FontAwesomeIcon icon={faLockOpen} className="text-xs" />
                <span>UNLOCKED FOR PARAMEDICS</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-[#1399FF]/15 border border-[#1399FF]/30 text-[#1399FF] text-xs font-mono font-medium flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTruckFast} className="text-xs" />
                <span>Package Delivered</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors ml-1"
              title="Close Doorbell Camera"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>
          </div>
        </div>

        {/* 2. NIGHT-VISION CAMERA FEED CANVAS (INLINE SVG VECTOR SIMULATION) */}
        <div className="relative w-full aspect-video bg-[#050811] overflow-hidden flex items-center justify-center border-b border-white/[0.08]">
          {/* CRT Scanline Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 202, 255, 0.05) 0px, transparent 1px, transparent 3px)',
            }}
          />

          {/* High-Resolution SVG Porch & Delivery Illustration */}
          <svg
            viewBox="0 0 800 450"
            className="w-full h-full object-cover"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#04060d" />
                <stop offset="60%" stopColor="#0b1220" />
                <stop offset="100%" stopColor="#070c17" />
              </linearGradient>

              <linearGradient id="porchFloor" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#141c2b" />
                <stop offset="100%" stopColor="#0a0f19" />
              </linearGradient>

              <linearGradient id="doorFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>

              <linearGradient id="parcelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b4783c" />
                <stop offset="100%" stopColor="#875324" />
              </linearGradient>

              <filter id="nightVisionGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Night Background & Suburban Porch Architecture */}
            <rect width="800" height="450" fill="url(#nightSky)" />

            {/* Patio siding panels */}
            <line x1="0" y1="40" x2="800" y2="40" stroke="#162032" strokeWidth="1" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="#162032" strokeWidth="1" />
            <line x1="0" y1="120" x2="800" y2="120" stroke="#162032" strokeWidth="1" />
            <line x1="0" y1="160" x2="800" y2="160" stroke="#162032" strokeWidth="1" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#162032" strokeWidth="1" />

            {/* Front Door Assembly */}
            <rect x="250" y="30" width="300" height="340" fill="url(#doorFrameGrad)" rx="8" />
            <rect x="265" y="45" width="270" height="325" fill="#0f172a" rx="4" />

            {/* Door Panel Insets */}
            <rect x="285" y="65" width="105" height="120" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
            <rect x="410" y="65" width="105" height="120" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
            <rect x="285" y="205" width="105" height="140" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />
            <rect x="410" y="205" width="105" height="140" fill="#1e293b" rx="4" stroke="#334155" strokeWidth="1" />

            {/* Door Handle & Ring Smart Access Keypad */}
            <circle cx="280" cy="215" r="9" fill="#0284c7" filter="url(#nightVisionGlow)" opacity="0.8" />
            <rect x="274" y="190" width="12" height="35" rx="3" fill="#cbd5e1" />

            {/* Front Porch Deck Floor (Perspective Trapeze) */}
            <polygon points="0,450 800,450 680,320 120,320" fill="url(#porchFloor)" />
            {/* Wooden Floor Planks */}
            <line x1="200" y1="450" x2="260" y2="320" stroke="#1f2c42" strokeWidth="2" />
            <line x1="400" y1="450" x2="400" y2="320" stroke="#1f2c42" strokeWidth="2" />
            <line x1="600" y1="450" x2="540" y2="320" stroke="#1f2c42" strokeWidth="2" />

            {/* Welcome Doormat */}
            <polygon points="280,390 520,390 490,340 310,340" fill="#1c2433" stroke="#2e3d54" strokeWidth="2" rx="4" />
            <text x="400" y="370" fill="#64748b" fontSize="13" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              WELCOME
            </text>

            {/* Outdoor Lantern Sconce Glow */}
            <circle cx="170" cy="110" r="14" fill="#fbbf24" opacity={isEmergency ? '0.9' : '0.4'} filter="url(#nightVisionGlow)" />
            <rect x="162" y="98" width="16" height="24" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />

            {/* MODE A: Amazon Pharmacy Parcel */}
            {!isEmergency && (
              <g transform="translate(330, 310)">
                {/* Parcel Drop Shadow */}
                <ellipse cx="70" cy="65" rx="65" ry="12" fill="#000000" opacity="0.6" />

                {/* Cardboard Box 3D Isometric View */}
                <polygon points="20,25 120,25 150,5 50,5" fill="#d97706" opacity="0.8" />
                <polygon points="120,25 150,5 150,45 120,65" fill="#92400e" />
                <polygon points="20,25 120,25 120,65 20,65" fill="url(#parcelGrad)" />

                {/* Amazon Prime Blue Packing Tape */}
                <polygon points="65,5 75,5 75,65 65,65" fill="#0284c7" />

                {/* Amazon Smile Logo Vector */}
                <path d="M 45 48 Q 70 58 95 48" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <polygon points="95,45 100,50 94,52" fill="#ffffff" />

                {/* Prescription Label Pill Sticker */}
                <rect x="35" y="30" width="24" height="14" rx="2" fill="#ffffff" opacity="0.9" />
                <line x1="38" y1="35" x2="52" y2="35" stroke="#0284c7" strokeWidth="1.5" />
                <line x1="38" y1="39" x2="48" y2="39" stroke="#64748b" strokeWidth="1" />

                {/* AI Object Detection Bounding Box */}
                <rect
                  x="10"
                  y="-2"
                  width="150"
                  height="75"
                  fill="none"
                  stroke="#00CAFF"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  filter="url(#nightVisionGlow)"
                />
                <rect x="10" y="-20" width="165" height="18" rx="4" fill="#00CAFF" />
                <text x="16" y="-7" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  📦 Amazon Pharmacy (99.4%)
                </text>
              </g>
            )}

            {/* MODE B: EMERGENCY OVERRIDE FLOODLIGHT & UNLOCKED BADGE */}
            {isEmergency && (
              <g transform="translate(260, 110)">
                {/* Red/Yellow Emergency Flashing Floodlight */}
                <ellipse cx="140" cy="180" rx="220" ry="100" fill="#f43f5e" opacity="0.18" filter="url(#nightVisionGlow)" />
                <polygon points="140,-40 380,320 -100,320" fill="#fef08a" opacity="0.12" />

                {/* Big Floating Smart Lock Badge */}
                <rect
                  x="10"
                  y="40"
                  width="260"
                  height="60"
                  rx="12"
                  fill="#0f172a"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  filter="url(#nightVisionGlow)"
                />
                <circle cx="45" cy="70" r="18" fill="#10b981" />
                {/* Open Padlock Vector */}
                <path
                  d="M 40 68 L 50 68 L 50 78 L 40 78 Z M 42 68 L 42 63 C 42 59 48 59 48 63"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <text x="75" y="65" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                  RING SMART ACCESS
                </text>
                <text x="75" y="82" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  UNLOCKED FOR PARAMEDICS
                </text>
              </g>
            )}

            {/* On-Screen Camera Telemetry HUD */}
            <text x="25" y="35" fill="#00CAFF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              REC ● [1080P HD HDR]
            </text>
            <text x="775" y="35" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="end">
              BATTERY 94% • WI-FI RSSI -52dBm
            </text>
            <text x="25" y="430" fill="#64748b" fontSize="10" fontFamily="monospace">
              RING PIR MOTION SENSOR ACTIVE • ZONE 1 (PORCH)
            </text>
          </svg>
        </div>

        {/* 3. CONTROL & INFORMATION FOOTER */}
        <div className="p-5 bg-[#151922] flex flex-col gap-4">
          {isEmergency ? (
            /* Emergency Paramedic Access Mode */
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-base" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-rose-300">
                    Emergency Door Access Granted
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    {emergencyReason || 'Acute symptoms triggered triage alert. Ring Smart Lock disengaged the deadbolt to ensure immediate entry for first responders.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (onUnlockDoor) onUnlockDoor();
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <FontAwesomeIcon icon={faLockOpen} className="text-xs" />
                  <span>Door Unlocked • Paramedics En Route</span>
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-[#1E2330] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/[0.08]"
                >
                  Dismiss View
                </button>
              </div>
            </div>
          ) : (
            /* Package Delivery Mode */
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1E2330] border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1399FF]/15 text-[#1399FF] flex items-center justify-center text-sm border border-[#1399FF]/30">
                    <FontAwesomeIcon icon={faBoxOpen} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{desc}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Carrier: {carrier} • Front Porch Mat
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                  Delivered
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* 1. Acknowledge / Bring Inside Button */}
                <button
                  onClick={handleBringInside}
                  disabled={isBroughtInside}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1399FF] hover:bg-[#0088EE] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1399FF]/25 active:scale-95 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={isBroughtInside ? faCircleCheck : faBoxOpen} className="text-sm" />
                  <span>{isBroughtInside ? 'Package Brought Inside!' : 'Acknowledge / Bring Inside'}</span>
                </button>

                {/* 2. Echo Show Two-Way Audio Toggle */}
                <button
                  onClick={() => setIsTalkActive(!isTalkActive)}
                  className={`py-3 px-4 rounded-xl font-medium text-xs border transition-all flex items-center gap-2 ${
                    isTalkActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#1E2330] text-slate-300 hover:text-white border-white/[0.08]'
                  }`}
                  title="Two-Way Talk via Ring Doorbell"
                >
                  <FontAwesomeIcon icon={isTalkActive ? faVolumeHigh : faMicrophone} className="text-xs" />
                  <span>{isTalkActive ? 'Live Audio ON' : 'Two-Way Talk'}</span>
                </button>

                {/* 3. Dismiss Button */}
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-[#1E2330] hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium border border-white/[0.08]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
