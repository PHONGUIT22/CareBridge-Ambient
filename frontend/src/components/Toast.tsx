'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleCheck,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export interface ToastMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const icon =
          t.type === 'success'
            ? faCircleCheck
            : t.type === 'warning'
            ? faTriangleExclamation
            : t.type === 'error'
            ? faTriangleExclamation
            : faCircleInfo;

        const borderClass =
          t.type === 'success'
            ? 'border-emerald-500/50 bg-[#0C1E29]/95 text-emerald-300'
            : t.type === 'warning'
            ? 'border-amber-500/50 bg-[#151D14]/95 text-amber-300'
            : t.type === 'error'
            ? 'border-rose-500/50 bg-[#1D0C12]/95 text-rose-300'
            : 'border-[#00CAFF]/50 bg-[#0C1E29]/95 text-[#00CAFF]';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto alexa-card rounded-2xl p-3.5 border shadow-2xl backdrop-blur-xl flex items-start gap-3 transform transition-all animate-fadeIn ${borderClass}`}
          >
            <FontAwesomeIcon icon={icon} className="text-base mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {t.title && <h5 className="text-xs font-black text-white">{t.title}</h5>}
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
            >
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
