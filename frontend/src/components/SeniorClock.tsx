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

  // Định dạng ngày: "FRIDAY, SEPTEMBER 11, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
    .format(currentTime)
    .toUpperCase();

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* CỤM ĐỒNG HỒ SỐ KHỔNG LỒ PHÁT SÁNG DẠ QUANG */}
      <div className="flex items-baseline justify-center tracking-tight font-display font-black tabular-nums">
        {/* Giờ : Phút với dấu hai chấm phát sáng nhịp nhàng */}
        <span
          className="text-7xl sm:text-8xl md:text-9xl text-white font-display font-black drop-shadow-[0_4px_25px_rgba(0,0,0,0.6)]"
          style={{ letterSpacing: '-0.03em' }}
        >
          {hours}<span className="text-[#FF725E] animate-pulse inline-block mx-0.5">:</span>{minutes}
        </span>

        {/* Giây được làm dịu lại để tránh cảm giác gấp gáp cho người cao tuổi */}
        <span className="text-2xl sm:text-3xl md:text-4xl text-[#8A92A6] font-display font-medium ml-2 sm:ml-3 opacity-60 tabular-nums">
          :{seconds}
        </span>
      </div>

      {/* NGÀY THÁNG ĐẦY ĐỦ VỚI SOFT BLUE ACCENT */}
      <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-display font-bold tracking-[0.25em] text-[#4D8BFF] drop-shadow-[0_0_12px_rgba(77,139,255,0.35)]">
        {formattedDate}
      </p>
    </div>
  );
}