'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCapsules,
  faXmark,
  faPlus,
  faClock,
  faBoxesStacked,
  faTriangleExclamation,
  faShieldHalved,
  faCircleNotch,
  faUserDoctor,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { mcpClient } from '../services/mcpClient';
import { DrugInteractionCheckResult, DrugInteractionWarning } from '../types';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (medicine: {
    name: string;
    dosage: string;
    reminderTimes: string[];
    daysOfWeek: string[];
    stockCount: number;
  }) => Promise<void>;
}

export function AddMedicineModal({ isOpen, onClose, onAdd }: AddMedicineModalProps) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [stock, setStock] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automated Drug Interaction Check states
  const [isCheckingInteraction, setIsCheckingInteraction] = useState(false);
  const [interactionResult, setInteractionResult] = useState<DrugInteractionCheckResult | null>(null);
  const [hasAcknowledgedDoctor, setHasAcknowledgedDoctor] = useState(false);

  // Reset states on modal close or open
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDosage('');
      setInteractionResult(null);
      setHasAcknowledgedDoctor(false);
      setIsCheckingInteraction(false);
    }
  }, [isOpen]);

  // Debounced Drug-Drug Interaction Safety Verification (300ms)
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setInteractionResult(null);
      setHasAcknowledgedDoctor(false);
      setIsCheckingInteraction(false);
      return;
    }

    setIsCheckingInteraction(true);
    const timer = setTimeout(async () => {
      try {
        const result = await mcpClient.checkDrugInteraction(trimmed);
        setInteractionResult(result);
        if (!result.hasInteraction) {
          setHasAcknowledgedDoctor(false);
        }
      } catch (err) {
        console.warn('[AddMedicineModal] Drug interaction check error:', err);
      } finally {
        setIsCheckingInteraction(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [name]);

  if (!isOpen) return null;

  const hasInteraction = Boolean(
    interactionResult?.hasInteraction && interactionResult?.warnings?.length > 0
  );
  const warnings = interactionResult?.warnings || [];
  const primaryWarning: DrugInteractionWarning | undefined = warnings[0];
  const isCritical = primaryWarning?.severity === 'CRITICAL';
  const isSafetyBlocked = hasInteraction && !hasAcknowledgedDoctor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || isSafetyBlocked) return;

    try {
      setIsSubmitting(true);
      await onAdd({
        name: name.trim(),
        dosage: dosage.trim(),
        reminderTimes: [time],
        daysOfWeek: ['ALL'],
        stockCount: parseInt(stock, 10) || 30,
      });
      setName('');
      setDosage('');
      setInteractionResult(null);
      setHasAcknowledgedDoctor(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151922]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#1E2330] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-white/[0.08] text-white transform transition-all animate-scaleUp">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151922] text-[#FF5733] border border-[#FF5733]/30 flex items-center justify-center">
              <FontAwesomeIcon icon={faCapsules} className="text-base" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Add medication regimen</h3>
              <p className="text-xs text-slate-400 font-normal">Real-time Clinical Safety & Beers Criteria check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#151922] hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-base" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
          {/* MEDICATION NAME INPUT WITH REAL-TIME CHECK INDICATOR */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-400">
                Medication name
              </label>
              {isCheckingInteraction && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-400 animate-pulse">
                  <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-[10px]" />
                  Checking drug interactions...
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Warfarin, Simvastatin, Ibuprofen..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border text-white placeholder-slate-400 text-sm focus:outline-none transition-colors ${
                  hasInteraction
                    ? isCritical
                      ? 'border-rose-500/70 focus:border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                      : 'border-amber-500/70 focus:border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'border-white/[0.08] focus:border-[#FF5733]'
                }`}
              />
            </div>
          </div>

          {/* CLINICAL DRUG-DRUG INTERACTION WARNING BANNER */}
          {hasInteraction && primaryWarning && (
            <div
              className={`rounded-2xl p-4 border transition-all animate-fadeIn ${
                isCritical
                  ? 'bg-gradient-to-br from-rose-950/60 via-red-950/30 to-[#1E2330] border-rose-500/50 text-rose-200'
                  : 'bg-gradient-to-br from-amber-950/60 via-orange-950/30 to-[#1E2330] border-amber-500/50 text-amber-200'
              }`}
            >
              {/* Badge & Severity */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={isCritical ? faShieldHalved : faTriangleExclamation}
                    className={`text-base ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}
                  />
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {isCritical ? 'Critical Contraindication' : 'Significant Drug Interaction'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  Beers Criteria
                </span>
              </div>

              {/* Title & Conflict Summary */}
              <h4 className="text-sm font-semibold text-white tracking-tight mb-1">
                {primaryWarning.title}
              </h4>
              <p className="text-xs text-rose-200/90 mb-2">
                <span className="font-semibold text-white">Conflict with active drug:</span>{' '}
                <span className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-[11px] text-amber-300 border border-amber-500/30">
                  {primaryWarning.conflictingMedName}
                </span>
              </p>

              {/* Clinical Risk & Mechanism */}
              <div className="text-[11px] space-y-1.5 p-2.5 rounded-xl bg-black/30 border border-white/[0.05] text-slate-300 mb-3">
                <p>
                  <strong className="text-white">Clinical Risk:</strong> {primaryWarning.clinicalRisk}
                </p>
                <p>
                  <strong className="text-slate-200">Pharmacology:</strong> {primaryWarning.mechanism}
                </p>
                <p className="text-amber-300/90 italic pt-1 border-t border-white/[0.08]">
                  <strong>Recommendation:</strong> {primaryWarning.recommendation}
                </p>
              </div>

              {/* DR. REYNOLDS CONSULTATION OVERRIDE CHECKBOX */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 hover:bg-black/50 border border-white/10 cursor-pointer transition-colors group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={hasAcknowledgedDoctor}
                    onChange={(e) => setHasAcknowledgedDoctor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-lg border border-slate-400 peer-checked:bg-[#FF5733] peer-checked:border-[#FF5733] flex items-center justify-center transition-all">
                    {hasAcknowledgedDoctor && (
                      <FontAwesomeIcon icon={faCheck} className="text-xs text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                    <FontAwesomeIcon icon={faUserDoctor} className="text-[#FF5733] text-xs" />
                    <span>I have consulted Dr. Reynolds - Proceed anyway</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Overriding this safety block requires clinical approval. The override will be audited in the caregiver log.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* DOSAGE INPUT */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Dosage & form
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20mg - 1 tablet at bedtime"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
            />
          </div>

          {/* SCHEDULED TIME & STOCK */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faClock} className="text-[#FF5733] text-xs" />
                <span>Scheduled time</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
                <FontAwesomeIcon icon={faBoxesStacked} className="text-slate-400 text-xs" />
                <span>Stock count</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151922] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#FF5733] transition-colors"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON WITH SAFETY GATING */}
          <button
            type="submit"
            disabled={isSubmitting || isSafetyBlocked}
            className={`w-full mt-2 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isSafetyBlocked
                ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300/60 cursor-not-allowed'
                : hasInteraction
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40 active:scale-[0.98]'
                : 'bg-[#FF5733] hover:bg-[#E64D2E] text-white shadow-lg shadow-orange-900/30 active:scale-[0.98]'
            }`}
          >
            {isSafetyBlocked ? (
              <>
                <FontAwesomeIcon icon={faShieldHalved} className="text-rose-400 text-xs" />
                <span>Safety Block: Consult Dr. Reynolds to Override</span>
              </>
            ) : hasInteraction ? (
              <>
                <FontAwesomeIcon icon={faUserDoctor} className="text-xs" />
                <span>{isSubmitting ? 'Saving with clinical override...' : 'Override & Add to Clinical Schedule'}</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span>{isSubmitting ? 'Adding regimen...' : 'Save to clinical schedule'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
