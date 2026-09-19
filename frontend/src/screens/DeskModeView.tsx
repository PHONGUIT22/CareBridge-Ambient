'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SeniorClock } from '../components/SeniorClock';
import { mcpClient } from '../services/mcpClient';
import { speechService } from '../services/speechService';
import { DailyLogItem } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faCheck,
  faCapsules,
  faShieldHalved,
  faChevronRight,
  faHeartPulse,
} from '@fortawesome/free-solid-svg-icons';
import confetti from 'canvas-confetti';

interface DeskModeViewProps {
  onSwitchToCaregiver?: () => void;
  onTakeDose?: (logId: string) => void;
  refreshTrigger?: number;
}

export function DeskModeView({
  onSwitchToCaregiver,
  onTakeDose,
  refreshTrigger = 0,
}: DeskModeViewProps) {
  const [schedule, setSchedule] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mcpClient.getTodayData();
      if (data?.schedule) {
        setSchedule(data.schedule);
      }
    } catch (e) {
      console.warn('DeskModeView: failed to fetch today schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [refreshTrigger, fetchSchedule]);

  // Tự động tìm cữ thuốc kế tiếp cần uống dựa theo thời gian thực (Next pending dose based on current time)
  const upcomingDose = useMemo(() => {
    const pendingList = schedule.filter((s) => s.status === 'pending');
    if (pendingList.length === 0) return null;

    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Tìm cữ thuốc pending sắp đến gần nhất (ưu tiên cữ chưa quá giờ hoặc cữ trễ gần nhất)
    const sorted = [...pendingList].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    const nextAfterNow = sorted.find((s) => s.scheduledTime >= currentHourMin);

    return nextAfterNow || sorted[0];
  }, [schedule]);

  const totalDoses = schedule.length || 1;
  const completedDoses = schedule.filter((s) => s.status === 'taken').length;
  const progressPercent = Math.round((completedDoses / totalDoses) * 100);

  const handleSpeakMedicine = () => {
    if (!upcomingDose) return;
    const textToSpeak = `Alexa reminder. Time for your scheduled medication: ${upcomingDose.name}, ${upcomingDose.dosage}.`;
    speechService.speak(textToSpeak);
  };

  const handleTakePill = async () => {
    if (!upcomingDose) return;

    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.75 },
      colors: ['#00CAFF', '#10B981', '#38BDF8', '#F59E0B'],
    });

    const takingLogId = upcomingDose.logId;
    const medName = upcomingDose.name;

    // Cập nhật trạng thái lạc quan ngay lập tức
    setSchedule((prev) =>
      prev.map((item) =>
        item.logId === takingLogId
          ? { ...item, status: 'taken', isTaken: true, takenAt: new Date().toLocaleTimeString() }
          : item
      )
    );

    speechService.speak(`Great job! I've marked your ${medName} as taken.`);

    try {
      await mcpClient.toggleDose(takingLogId, 'pending');
      await fetchSchedule();
    } catch (err) {
      console.warn('Persisted toggle locally');
    }

    if (onTakeDose) {
      onTakeDose(takingLogId);
    }
  };

  return (
    <div className="min-h-full text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden font-sans">
      {/* 1. TOP STATUS BAR */}
      <div className="flex items-center justify-between w-full max-w-lg mx-auto pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#22273B] border border-white/[0.06] text-[#4D8BFF] text-xs font-display font-bold tracking-wider uppercase shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#4D8BFF] animate-pulse" />
          <span>Ambient Nightstand</span>
        </div>

        <button
          onClick={onSwitchToCaregiver}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#22273B] hover:bg-[#2A3048] text-[#8A92A6] hover:text-white text-xs font-bold transition-all border border-white/[0.06] shadow-sm"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-[#FF725E]" />
          <span>Caregiver Hub</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
      </div>

      {/* 2. SENIOR CLOCK KHỔNG LỒ PHÁT SÁNG */}
      <div className="my-auto py-6">
        <SeniorClock />
      </div>

      {/* 3. THẺ LIỀU THUỐC SẮP TỚI & NÚT BẤM "I TOOK MY PILL" */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-4">
        {/* Thanh tiến độ tuân thủ */}
        <div className="bg-[#22273B] rounded-2xl p-3.5 border border-white/[0.06] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-[#8A92A6] uppercase tracking-wider">Today&apos;s Adherence</span>
            <span className="text-[#4D8BFF] font-mono">
              {completedDoses} / {totalDoses} Doses ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-[#181B2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4D8BFF] to-[#FF725E] transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(255,114,94,0.3)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Thẻ liều thuốc tiếp theo hoặc thông báo đã xong */}
        {upcomingDose ? (
          <div className="bg-[#22273B] rounded-3xl p-5 border-2 border-[#FF725E]/80 shadow-[0_0_25px_rgba(255,114,94,0.25)]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FF725E]/15 border border-[#FF725E]/30 flex items-center justify-center text-[#FF725E] shrink-0 shadow-[0_0_15px_rgba(255,114,94,0.2)]">
                  <FontAwesomeIcon icon={faCapsules} className="text-xl" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-[#FF725E] uppercase tracking-wider">
                    Upcoming Dose at {upcomingDose.scheduledTime}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                    {upcomingDose.name}
                  </h2>
                  <p className="text-xs text-[#8A92A6] font-medium">{upcomingDose.dosage}</p>
                </div>
              </div>

              {/* Nút loa phát âm thanh Alexa TTS */}
              <button
                onClick={handleSpeakMedicine}
                className="w-12 h-12 rounded-2xl bg-[#181B2A] hover:bg-[#2A3048] text-[#4D8BFF] border border-white/[0.08] flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-sm"
                title="Nghe Alexa đọc to tên thuốc"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-lg" />
              </button>
            </div>

            {/* Nút bấm siêu lớn Warm Coral Gradient */}
            <button
              onClick={handleTakePill}
              className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-[#FF725E] to-[#FF8A71] hover:opacity-95 text-white font-black text-lg tracking-wide flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,114,94,0.4)] active:scale-98 transition-all"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xl" />
              <span>I TOOK MY PILL</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#22273B] rounded-3xl p-6 text-center border border-white/[0.06] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="text-3xl text-[#FF725E] mx-auto mb-2"
            />
            <h3 className="text-base font-black text-white tracking-tight">All Medications Completed!</h3>
            <p className="text-xs text-[#8A92A6] mt-1 font-medium">
              All {schedule.length} scheduled doses for today are logged. Rest well!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}