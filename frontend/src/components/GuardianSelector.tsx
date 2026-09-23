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
    accentColor: '#1E3A8A',
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
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase tracking-wider font-mono ${
              compact ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            Active Health Guardian
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            AI Persona
          </span>
        </div>
        <span className={`text-[11px] font-medium ${compact ? 'text-slate-400' : 'text-slate-500'}`}>
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
                compact
                  ? isSelected
                    ? 'bg-[#0B1528] ring-2 ring-blue-500 shadow-md translate-y-[-1px]'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                  : isSelected
                  ? 'bg-blue-50/70 border-2 border-[#1E3A8A] shadow-sm translate-y-[-1px]'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80'
              }`}
              style={{
                borderColor: !compact && isSelected ? '#1E3A8A' : undefined,
              }}
            >
              {isRecommended && (
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                  Recommended
                </span>
              )}

              <div className="flex items-center gap-2.5">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                    compact ? 'bg-white/10' : 'bg-slate-100'
                  }`}
                >
                  {persona.avatarIcon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4
                      className={`text-xs font-bold truncate ${
                        compact ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {persona.displayName}
                    </h4>
                  </div>
                  <p
                    className={`text-[11px] truncate mt-0.5 font-medium ${
                      compact ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {persona.roleTitle}
                  </p>
                </div>
              </div>

              {!compact && (
                <p className="text-[10px] text-slate-600 mt-2 leading-relaxed line-clamp-2">
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
