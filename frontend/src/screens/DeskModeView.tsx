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
  faHouseMedical,
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00CAFF]/10 border border-[#00CAFF]/30 text-[#00CAFF] text-xs font-display font-bold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-[#00CAFF] animate-pulse" />
          <span>Ambient Nightstand</span>
        </div>

        <button
          onClick={onSwitchToCaregiver}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#131F2C] hover:bg-[#1A2A3C] text-slate-300 text-xs font-bold transition-all border border-white/5"
        >
          <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-[#00CAFF]" />
          <span>Caregiver Hub</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
        </button>
      </div>

      {/* 2. SENIOR CLOCK KHỔNG LỒ PHÁT SÁNG CYAN NEON */}
      <div className="my-auto py-6">
        <SeniorClock />
      </div>

      {/* 3. THẺ LIỀU THUỐC SẮP TỚI & NÚT BẤM "I TOOK MY PILL" */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 pb-4">
        {/* Thanh tiến độ tuân thủ */}
        <div className="bg-[#131F2C] rounded-2xl p-3.5 border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-400 uppercase tracking-wider">Today's Adherence</span>
            <span className="text-[#00CAFF] font-mono">
              {completedDoses} / {totalDoses} Doses ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00CAFF] transition-all duration-500 rounded-full shadow-[0_0_12px_#00CAFF]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Thẻ liều thuốc tiếp theo hoặc thông báo đã xong */}
        {upcomingDose ? (
          <div className="bg-[#131F2C] rounded-3xl p-5 border-2 border-[#00CAFF]/60 shadow-[0_0_35px_rgba(0,202,255,0.25)]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#00CAFF]/20 border border-[#00CAFF]/30 flex items-center justify-center text-[#00CAFF] shrink-0">
                  <FontAwesomeIcon icon={faCapsules} className="text-xl" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wider">
                    Upcoming Dose at {upcomingDose.scheduledTime}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {upcomingDose.name}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">{upcomingDose.dosage}</p>
                </div>
              </div>

              {/* Nút loa phát âm thanh Alexa TTS */}
              <button
                onClick={handleSpeakMedicine}
                className="w-12 h-12 rounded-2xl bg-[#00CAFF]/20 hover:bg-[#00CAFF]/40 text-[#00CAFF] border border-[#00CAFF]/40 flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-[0_0_15px_rgba(0,202,255,0.2)]"
                title="Nghe Alexa đọc to tên thuốc"
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-lg" />
              </button>
            </div>

            {/* Nút bấm siêu lớn Neon Cyan */}
            <button
              onClick={handleTakePill}
              className="w-full py-4 sm:py-5 rounded-2xl bg-[#00CAFF] hover:bg-[#00CAFF]/90 text-slate-950 font-black text-lg tracking-wide flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,202,255,0.6)] active:scale-98 transition-all"
            >
              <FontAwesomeIcon icon={faCheck} className="text-xl" />
              <span>I TOOK MY PILL</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#131F2C] rounded-3xl p-6 text-center border border-white/5">
            <FontAwesomeIcon
              icon={faHouseMedical}
              className="text-3xl text-[#00CAFF] mx-auto mb-2"
            />
            <h3 className="text-base font-bold text-white">All Medications Completed!</h3>
            <p className="text-xs text-slate-400 mt-1">
              All {schedule.length} scheduled doses for today are logged. Rest well!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}