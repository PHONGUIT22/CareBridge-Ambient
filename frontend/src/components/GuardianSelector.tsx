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
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              compact ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            Active Health Guardian
          </span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
            AI Persona
          </span>
        </div>
        <span className={`text-[10px] font-medium ${compact ? 'text-slate-400' : 'text-slate-500'}`}>
          Behavioral intervention engine
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        {GUARDIAN_PERSONAS_LIST.map((persona) => {
          const isSelected = selectedId === persona.id;
          const isRecommended = persona.id === 'grandson_leo';

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSelect(persona)}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all duration-150 select-none cursor-pointer ${
                compact
                  ? isSelected
                    ? 'bg-[#0B1528] ring-2 ring-blue-500 shadow-md text-white border-blue-500'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  : isSelected
                  ? 'bg-blue-50/90 border-[#1E3A8A] text-[#1E3A8A] ring-1 ring-[#1E3A8A] shadow-2xs font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs font-medium'
              }`}
            >
              <span className="text-base leading-none shrink-0">{persona.avatarIcon}</span>
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs font-bold truncate leading-tight ${
                      compact ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {persona.displayName}
                  </span>
                  {isRecommended && (
                    <span className="px-1 py-0.2 rounded text-[7.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono shrink-0">
                      Rec
                    </span>
                  )}
                </div>
                <p
                  className={`text-[9.5px] truncate leading-none mt-0.5 font-medium ${
                    compact ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {persona.roleTitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
