'use client';

import React, { useState, useEffect } from 'react';

interface SeniorClockProps {
  className?: string;
}

export function SeniorClock({ className = '' }: SeniorClockProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Tránh lỗi Hydration mismatch giữa Server và Client trong Next.js 15
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!currentTime) {
    return (
      <div className={`flex flex-col items-center justify-center animate-pulse ${className}`}>
        <div className="h-28 w-72 bg-slate-800/40 rounded-3xl" />
        <div className="h-6 w-48 bg-slate-800/40 rounded-full mt-4" />
      </div>
    );
  }

  // Tách giờ, phút, giây
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  // Natural human date format: e.g. "Friday, September 11, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(currentTime);

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Authentic Hardware Clock Digits */}
      <div className="flex items-baseline justify-center font-mono font-bold tabular-nums">
        <span
          className="text-7xl sm:text-8xl md:text-9xl text-white tracking-tight"
          style={{ letterSpacing: '-0.03em' }}
        >
          {hours}<span className="text-[#FF5733] animate-pulse inline-block mx-0.5">:</span>{minutes}
        </span>

        {/* Softened seconds indicator */}
        <span className="text-2xl sm:text-3xl md:text-4xl text-slate-400 font-mono font-normal ml-2 sm:ml-3 opacity-60 tabular-nums">
          :{seconds}
        </span>
      </div>

      {/* Clean Human Date Display */}
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-normal text-slate-300">
        {formattedDate}
      </p>
    </div>
  );
}