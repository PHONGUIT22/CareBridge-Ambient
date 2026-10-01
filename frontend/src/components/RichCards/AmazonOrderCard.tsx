'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faTruckFast,
  faPills,
  faXmark,
  faArrowRight,
  faReceipt,
  faShieldHalved,
  faBoxOpen,
  faVideo,
  faForwardStep,
} from '@fortawesome/free-solid-svg-icons';
import { AmazonRefillOrder } from '../../types';

interface AmazonOrderCardProps {
  isOpen: boolean;
  onClose: () => void;
  order?: AmazonRefillOrder | null;
  onTrackOrder?: (orderId: string) => void;
  onViewPorchCamera?: () => void;
}

export function AmazonOrderCard({
  isOpen,
  onClose,
  order,
  onTrackOrder,
  onViewPorchCamera,
}: AmazonOrderCardProps) {
  const [trackingStep, setTrackingStep] = useState<number>(3);

  if (!isOpen) return null;

  const orderId = order?.orderId || '114-7294821-4928103';
  const medicineName = order?.medicineName || 'Atorvastatin (Lipitor)';
  const dosage = order?.dosage || '20mg - Evening';
  const quantity = order?.quantityAdded || 30;
  const newStock = order?.newStockCount ?? 33;
  const deliveryStr = order?.estimatedDelivery || 'Wednesday, Oct 28 (Prime Two-Day)';
  const price = order?.totalPrice || '$12.50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] border-2 border-[#00A8E1]/40 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Top subtle glow accent (Amazon Blue / Coral glow) */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#00A8E1]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#FF9900]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
          title="Close card"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* 1. Header: Amazon Pharmacy Brand & Prime Badge */}
        <div className="flex items-center justify-between pr-8 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#151922] border border-[#00A8E1]/40 flex items-center justify-center text-[#00A8E1] text-sm">
              <FontAwesomeIcon icon={faPills} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white tracking-tight">
                  Amazon Pharmacy
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E1]" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">1-Click Voice Refill</p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-[#00A8E1]/15 border border-[#00A8E1]/30 text-[#00A8E1] text-xs font-mono font-semibold flex items-center gap-1.5">
            <FontAwesomeIcon icon={faTruckFast} className="text-xs" />
            <span>Prime 2-Day</span>
          </div>
        </div>

        {/* 2. Confirmation Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-emerald-300">Prescription Refill Placed</h3>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              Order #{orderId}
            </p>
          </div>
        </div>

        {/* 4-STEP LIVE FULFILLMENT & TRACKING TIMELINE */}
        <div className="mb-4 p-3.5 rounded-2xl bg-[#151922] border border-white/[0.08]">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-mono text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Live Delivery Tracking
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#00A8E1]/20 text-[#00A8E1] border border-[#00A8E1]/40 font-semibold">
              {trackingStep === 1
                ? '1/4: Order Placed'
                : trackingStep === 2
                ? '2/4: Rx & Beers Audited'
                : trackingStep === 3
                ? '3/4: Prime In-Transit'
                : '4/4: Arrived at Porch'}
            </span>
          </div>

          {/* Progress Bar & Icons */}
          <div className="relative flex items-center justify-between mb-3 px-3">
            {/* Background connector line */}
            <div className="absolute left-7 right-7 top-3.5 h-1 bg-slate-800 z-0" />
            <div
              className="absolute left-7 top-3.5 h-1 bg-gradient-to-r from-emerald-500 to-[#00A8E1] z-0 transition-all duration-500"
              style={{
                width: `${((trackingStep - 1) / 3) * 78}%`,
              }}
            />

            {/* 4 Step Nodes */}
            {[
              { step: 1, label: 'Placed', icon: faReceipt },
              { step: 2, label: 'Rx Verified', icon: faShieldHalved },
              { step: 3, label: 'In-Transit', icon: faTruckFast },
              { step: 4, label: 'At Porch', icon: faBoxOpen },
            ].map((item) => {
              const isPast = trackingStep > item.step;
              const isCurrent = trackingStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setTrackingStep(item.step)}
                  className="relative z-10 flex flex-col items-center group cursor-pointer"
                  title={`Click to set status to ${item.label}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-[#00A8E1] text-white ring-4 ring-[#00A8E1]/30 shadow-md scale-110'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <FontAwesomeIcon icon={isPast ? faCircleCheck : item.icon} className="text-[10px]" />
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-mono transition-colors ${
                      isCurrent
                        ? 'text-[#00A8E1] font-bold'
                        : isPast
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step Detail Explanation */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-300">
            <span className="truncate max-w-[240px]">
              {trackingStep === 1 && 'Refill requested via Alexa+ and sent to pharmacy.'}
              {trackingStep === 2 && 'Pharmacist approved & Beers Criteria safety passed.'}
              {trackingStep === 3 && 'Dispatched via Amazon Prime Same-Day Delivery.'}
              {trackingStep === 4 && 'Parcel arrived on front porch mat!'}
            </span>
            <button
              type="button"
              onClick={() => setTrackingStep((prev) => (prev < 4 ? prev + 1 : 1))}
              className="text-[#00A8E1] hover:text-[#38bdf8] font-mono text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{trackingStep === 4 ? 'Reset' : 'Next'}</span>
              <FontAwesomeIcon icon={faForwardStep} className="text-[9px]" />
            </button>
          </div>
        </div>

        {/* 3. Prescription Details Container */}
        <div className="space-y-2.5 mb-5 text-xs">
          {/* Medicine & Quantity */}
          <div className="p-3 rounded-xl bg-[#151922] border border-white/[0.08] flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{medicineName}</p>
              <p className="text-slate-400 mt-0.5">{dosage}</p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-md bg-[#1E2330] border border-white/10 font-mono text-xs font-medium text-slate-200">
                +{quantity} Tablets
              </span>
              <p className="text-[11px] text-emerald-400 font-mono mt-1">
                Stock updated: {newStock} pills
              </p>
            </div>
          </div>

          {/* Delivery & Shipping */}
          <div className="p-3 rounded-xl bg-[#151922] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faTruckFast} className="text-[#00A8E1] text-sm" />
              <div>
                <p className="font-medium text-white">Estimated Delivery</p>
                <p className="text-slate-400 font-mono text-[11px]">{deliveryStr}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-400">FREE</span>
          </div>

          {/* Price & Payment */}
          <div className="p-3 rounded-xl bg-[#151922] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faReceipt} className="text-amber-400 text-sm" />
              <div>
                <p className="font-medium text-white">Copay / Order Total</p>
                <p className="text-slate-400 font-mono text-[11px]">Prime Visa •••• 4012</p>
              </div>
            </div>
            <span className="text-base font-semibold text-white font-mono tabular-nums">
              {price}
            </span>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {trackingStep === 4 ? (
            <button
              onClick={() => {
                if (onViewPorchCamera) onViewPorchCamera();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer animate-pulse"
            >
              <FontAwesomeIcon icon={faVideo} className="text-xs" />
              <span>View Porch Camera (Ring Doorbell)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (onTrackOrder) onTrackOrder(orderId);
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#00A8E1] hover:bg-[#0095C8] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00A8E1]/20 active:scale-95 cursor-pointer"
            >
              <span>Track on Amazon</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </button>
          )}

          <button
            onClick={() => {
              if (onViewPorchCamera) onViewPorchCamera();
              onClose();
            }}
            className="py-2.5 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-sky-300 font-semibold text-xs border border-blue-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Check front porch Ring camera feed"
          >
            <FontAwesomeIcon icon={faVideo} className="text-[11px]" />
            <span className="hidden xs:inline">Ring Cam</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-3.5 rounded-xl bg-[#151922] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
