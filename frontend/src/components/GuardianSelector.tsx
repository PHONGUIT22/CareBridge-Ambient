'use client';

import React, { useState, useEffect } from 'react';
import { GuardianPersonaId, GuardianPersona } from '../types';

export const GUARDIAN_PERSONAS_LIST: GuardianPersona[] = [
  {
    id: 'nurse_betty',
    displayName: 'Nurse Betty',
    roleTitle: 'Geriatric Care',
    avatarIcon: '🩺',
    voiceTone: 'Gentle & Comforting',
    accentColor: '#10B981',
    themeColor: 'emerald',
    description: 'Offers warm water & promises a TV show after the pill.',
  },
  {
    id: 'dr_reynolds',
    displayName: 'Dr. Reynolds',
    roleTitle: 'Attending Physician',
    avatarIcon: '👨‍⚕️',
    voiceTone: 'Clinical & Exact',
    accentColor: '#2563EB',
    themeColor: 'blue',
    description: 'Strict, authoritative hemodynamic risk data.',
  },
  {
    id: 'grandson_leo',
    displayName: 'Grandson Leo',
    roleTitle: '7-Year-Old Grandson',
    avatarIcon: '👦',
    voiceTone: 'Loving & Innocent',
    accentColor: '#F59E0B',
    themeColor: 'amber',
    description: 'Zoo trip promise and heart-melting family bond.',
  },
  {
    id: 'sergeant_miller',
    displayName: 'Sgt. Miller',
    roleTitle: 'Drill Sergeant',
    avatarIcon: '🎖️',
    voiceTone: 'Crisp & Disciplined',
    accentColor: '#E11D48',
    themeColor: 'rose',
    description: 'Down the hatch in 3... 2... 1! No excuses.',
  },
];

interface GuardianSelectorProps {
  activePersonaId?: GuardianPersonaId;
  onSelectPersona?: (persona: GuardianPersona) => void;
  compact?: boolean;
}

export function GuardianSelector({
  activePersonaId: propActiveId,
  onSelectPersona,
  compact = false,
}: GuardianSelectorProps) {
  const [selectedId, setSelectedId] = useState<GuardianPersonaId>('grandson_leo');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carebridge_active_guardian') as GuardianPersonaId;
      if (saved && GUARDIAN_PERSONAS_LIST.some((p) => p.id === saved)) {
        setSelectedId(saved);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (propActiveId) {
      setSelectedId(propActiveId);
    }
  }, [propActiveId]);

  const handleSelect = (persona: GuardianPersona) => {
    setSelectedId(persona.id);
    try {
      localStorage.setItem('carebridge_active_guardian', persona.id);
    } catch (_) {}
    if (onSelectPersona) {
      onSelectPersona(persona);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Active Health Guardian
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FF5733]/15 text-[#FF5733] border border-[#FF5733]/30">
            AI Persona
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Behavioral intervention engine
        </span>
      </div>

      <div
        className={`grid ${
          compact
            ? 'grid-cols-2 sm:grid-cols-4 gap-2'
            : 'grid-cols-2 sm:grid-cols-4 gap-2.5'
        }`}
      >
        {GUARDIAN_PERSONAS_LIST.map((persona) => {
          const isSelected = selectedId === persona.id;
          const isRecommended = persona.id === 'grandson_leo';

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona)}
              className={`relative text-left p-2.5 sm:p-3 rounded-2xl transition-all duration-200 border select-none ${
                isSelected
                  ? 'bg-[#1E2330] ring-1 ring-white/20 shadow-md translate-y-[-1px]'
                  : 'bg-[#151922]/80 hover:bg-[#1E2330] border-white/[0.08] hover:border-white/15'
              }`}
              style={{
                borderColor: isSelected ? persona.accentColor : undefined,
              }}
            >
              {isRecommended && (
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono shadow-sm">
                  Recommended
                </span>
              )}

              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 bg-white/[0.06] border border-white/[0.08]"
                  style={{
                    backgroundColor: isSelected ? `${persona.accentColor}20` : undefined,
                    borderColor: isSelected ? `${persona.accentColor}40` : undefined,
                  }}
                >
                  {persona.avatarIcon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {persona.displayName}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                    {persona.roleTitle}
                  </p>
                </div>
              </div>

              {!compact && (
                <p className="text-[10px] text-slate-300 mt-2 leading-relaxed line-clamp-2">
                  {persona.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
